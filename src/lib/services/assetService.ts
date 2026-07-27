// Asset state machine + scan event processing. Clients never write asset status directly.
import { id, nowIso, one, q, run, type Db } from "../db";
import { NotFoundError, ValidationError } from "../errors";
import type { AssetRow, AssetStatus, ScanMode } from "../types";

export const ASSET_NUMBER_PREFIX: Record<string, string> = {
  tote: "GLMT-T", dolly: "GLMT-D", hand_truck: "GLMT-H", blanket_pack: "GLMT-B",
  trailer: "GLMT-R", vehicle: "GLMT-V", other: "GLMT-X",
};

/** mode → allowed current statuses → resulting status. See docs/10. */
const MODE_TRANSITIONS: Record<ScanMode, { from: AssetStatus[]; to: AssetStatus }> = {
  receive: { from: ["new"], to: "clean_inventory" },
  stage: { from: ["reserved", "clean_inventory"], to: "staged" },
  unstage: { from: ["staged"], to: "clean_inventory" },
  load: { from: ["staged"], to: "loaded" },
  unload: { from: ["loaded"], to: "staged" },
  deliver: { from: ["loaded", "out_for_delivery"], to: "delivered" },
  pickup: { from: ["rented", "pickup_scheduled", "delivered"], to: "picked_up" },
  warehouse_return: { from: ["picked_up"], to: "dirty_return" },
  clean_start: { from: ["dirty_return"], to: "cleaning" },
  clean_complete: { from: ["cleaning"], to: "inspection_required" },
  inspect: { from: ["inspection_required", "repair_required"], to: "clean_inventory" }, // outcome may override
  audit: { from: [], to: "clean_inventory" }, // event-only; no status change (handled specially)
  quarantine: { from: ["dirty_return", "cleaning", "inspection_required", "picked_up", "clean_inventory"], to: "quarantine" },
  repair: { from: ["damaged", "inspection_required", "quarantine"], to: "repair_required" },
  retire: { from: ["repair_required", "quarantine", "damaged", "missing", "inspection_required", "clean_inventory", "new"], to: "retired" },
  mark_missing: { from: ["rented", "pickup_scheduled", "delivered", "picked_up"], to: "missing" },
  recover: { from: ["missing"], to: "dirty_return" },
};

/** inspect outcome → final status */
const INSPECT_OUTCOMES: Record<string, AssetStatus> = {
  pass: "clean_inventory", repair: "repair_required", quarantine: "quarantine", retire: "retired",
};

export function assertValidTransition(from: AssetStatus, to: AssetStatus): void {
  const allowed = Object.values(MODE_TRANSITIONS).some((t) => t.from.includes(from) && t.to === to);
  const inspectOk = from === "inspection_required" || from === "repair_required";
  if (!allowed && !(inspectOk && Object.values(INSPECT_OUTCOMES).includes(to))) {
    throw new ValidationError(`Invalid asset status transition: ${from} → ${to}`);
  }
}

export interface ScanInput {
  idempotencyKey: string;
  assetIdentifier: string;          // QR value, barcode, or asset number
  mode: ScanMode;
  orderId?: string | null;
  assignmentId?: string | null;
  vehicleId?: string | null;
  userId?: string | null;
  deviceId?: string | null;
  deviceTimestamp?: string | null;
  latitude?: number | null; longitude?: number | null; accuracy?: number | null;
  source?: "online" | "offline";
  syncBatchId?: string | null;
  notes?: string | null;
  outcome?: string | null;          // inspect: pass/repair/quarantine/retire
  condition?: string | null;        // return condition for pickup
}

export interface ScanResult {
  ok: boolean;
  warningCode?: "duplicate_scan" | "invalid_asset" | "wrong_order" | "status_conflict" | "capacity_warning";
  message?: string;
  assetId?: string;
  assetNumber?: string;
  previousStatus?: AssetStatus;
  newStatus?: AssetStatus;
}

async function findAsset(db: Db, identifier: string): Promise<AssetRow | null> {
  const value = identifier.trim();
  return one<AssetRow>(
    db,
    `SELECT * FROM assets WHERE (qr_code_value = ? OR barcode_value = ? OR asset_number = ?) AND deleted_at IS NULL`,
    value, value, value.toUpperCase(),
  );
}

/** Process a single scan. Idempotent by idempotencyKey. Never throws for field issues — returns warnings. */
export async function processScan(db: Db, input: ScanInput): Promise<ScanResult> {
  if (!input.idempotencyKey) throw new ValidationError("idempotencyKey is required");

  const existing = await one<{ id: string }>(db, `SELECT id FROM asset_scan_events WHERE idempotency_key = ?`, input.idempotencyKey);
  if (existing) {
    return { ok: true, warningCode: "duplicate_scan", message: "Scan already recorded" };
  }

  const asset = await findAsset(db, input.assetIdentifier);
  if (!asset) {
    return { ok: false, warningCode: "invalid_asset", message: `Unknown asset: ${input.assetIdentifier}` };
  }

  // Wrong-order check (warn but still record when modes tie to an order)
  if (input.orderId && asset.current_order_id && asset.current_order_id !== input.orderId
      && ["stage", "load", "deliver", "pickup"].includes(input.mode)) {
    return {
      ok: false, warningCode: "wrong_order",
      message: `${asset.asset_number} belongs to a different order`,
      assetId: asset.id, assetNumber: asset.asset_number,
    };
  }

  const rule = MODE_TRANSITIONS[input.mode];
  let targetStatus: AssetStatus;
  if (input.mode === "audit") {
    targetStatus = asset.current_status; // event-only
  } else if (input.mode === "inspect" && input.outcome) {
    targetStatus = INSPECT_OUTCOMES[input.outcome] ?? rule.to;
  } else {
    targetStatus = rule.to;
  }

  if (input.mode !== "audit" && !rule.from.includes(asset.current_status)) {
    // Store the rejected event for traceability, but do not change status.
    await insertScanEvent(db, input, asset, targetStatus, "status_conflict");
    return {
      ok: false, warningCode: "status_conflict",
      message: `${asset.asset_number} is '${asset.current_status}'; cannot run '${input.mode}'`,
      assetId: asset.id, assetNumber: asset.asset_number, previousStatus: asset.current_status,
    };
  }

  const scanId = await insertScanEvent(db, input, asset, targetStatus, null);
  const now = nowIso();
  const deviceTs = input.deviceTimestamp ?? now;

  // Apply status + contextual pointers
  if (input.mode !== "audit" && targetStatus !== asset.current_status) {
    const sets: Record<string, unknown> = {
      current_status: targetStatus,
      last_scan_at: deviceTs,
    };
    if (input.mode === "deliver") {
      sets.current_order_id = input.orderId ?? asset.current_order_id;
      sets.current_customer_id = null;
    }
    if (input.mode === "load" && input.vehicleId) sets.current_vehicle_id = input.vehicleId;
    if (input.mode === "unload") sets.current_vehicle_id = null;
    if (input.mode === "warehouse_return") {
      sets.current_vehicle_id = null; sets.current_assignment_id = null;
    }
    if (input.mode === "retire") sets.retired_at = now;
    if (input.mode === "clean_complete") sets.last_cleaned_at = now;
    if (input.mode === "inspect") sets.last_inspected_at = now;
    if (input.condition) sets.current_condition = input.condition;

    const keys = Object.keys(sets);
    await run(
      db,
      `UPDATE assets SET ${keys.map((k) => `${k} = ?`).join(", ")}, version = version + 1, updated_at = ?
       WHERE id = ?`,
      ...keys.map((k) => sets[k]), now, asset.id,
    );
    await run(
      db,
      `INSERT INTO asset_status_history (id, asset_id, from_status, to_status, scan_event_id, changed_by, changed_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id("ash"), asset.id, asset.current_status, targetStatus, scanId, input.userId ?? null, deviceTs, input.notes ?? null,
    );
  }

  // order_assets bookkeeping
  if (input.orderId) {
    if (input.mode === "deliver") {
      await run(db, `UPDATE order_assets SET delivered_at = ?, delivery_condition = COALESCE(?, delivery_condition) WHERE order_id = ? AND asset_id = ?`,
        deviceTs, input.condition ?? "good", input.orderId, asset.id);
    } else if (input.mode === "pickup") {
      await run(db, `UPDATE order_assets SET picked_up_at = ?, return_condition = COALESCE(?, return_condition) WHERE order_id = ? AND asset_id = ?`,
        deviceTs, input.condition ?? null, input.orderId, asset.id);
    } else if (input.mode === "warehouse_return") {
      await run(db, `UPDATE order_assets SET warehouse_return_at = ? WHERE order_id = ? AND asset_id = ?`,
        deviceTs, input.orderId, asset.id);
    }
  }

  return {
    ok: true, assetId: asset.id, assetNumber: asset.asset_number,
    previousStatus: asset.current_status, newStatus: targetStatus,
  };
}

async function insertScanEvent(
  db: Db, input: ScanInput, asset: AssetRow, newStatus: AssetStatus, exceptionCode: string | null,
): Promise<string> {
  const scanId = id("scan");
  await run(
    db,
    `INSERT INTO asset_scan_events (id, idempotency_key, asset_id, user_id, device_id, order_id, assignment_id,
       scan_mode, previous_status, new_status, device_timestamp, server_timestamp,
       latitude, longitude, accuracy, source, sync_batch_id, exception_code, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    scanId, input.idempotencyKey, asset.id, input.userId ?? null, input.deviceId ?? null,
    input.orderId ?? null, input.assignmentId ?? null, input.mode,
    asset.current_status, newStatus, input.deviceTimestamp ?? nowIso(), nowIso(),
    input.latitude ?? null, input.longitude ?? null, input.accuracy ?? null,
    input.source ?? "online", input.syncBatchId ?? null, exceptionCode, input.notes ?? null,
  );
  return scanId;
}

/** Reserve clean assets for an order. Throws when inventory is short. */
export async function reserveAssets(
  db: Db, orderId: string, requirements: { tote: number; dolly: number }, branchId?: string | null,
): Promise<{ reserved: Record<string, number>; shortages: Record<string, number> }> {
  const shortages: Record<string, number> = {};
  const reserved: Record<string, number> = {};
  const now = nowIso();

  for (const [type, needed] of Object.entries(requirements)) {
    if (needed <= 0) continue;
    const available = await q<AssetRow>(
      db,
      `SELECT * FROM assets WHERE asset_type = ? AND current_status = 'clean_inventory' AND deleted_at IS NULL
       ${branchId ? "AND branch_id = ?" : ""} ORDER BY asset_number LIMIT ?`,
      ...(branchId ? [type, branchId, needed] : [type, needed]),
    );
    reserved[type] = available.length;
    if (available.length < needed) shortages[type] = needed - available.length;
    for (const asset of available) {
      await run(db, `UPDATE assets SET current_status = 'reserved', current_order_id = ?, version = version + 1, updated_at = ? WHERE id = ?`,
        orderId, now, asset.id);
      await run(db, `INSERT INTO asset_status_history (id, asset_id, from_status, to_status, changed_at, notes)
                     VALUES (?, ?, 'clean_inventory', 'reserved', ?, ?)`,
        id("ash"), asset.id, now, `Reserved for order ${orderId}`);
      await run(db, `INSERT INTO order_assets (id, order_id, asset_id, assigned_at) VALUES (?, ?, ?, ?)`,
        id("oa"), orderId, asset.id, now);
    }
  }
  return { reserved, shortages };
}

/** Counts of clean inventory by type (for shortage warnings). */
export async function cleanInventoryCounts(db: Db): Promise<Record<string, number>> {
  const rows = await q<{ asset_type: string; n: number }>(
    db, `SELECT asset_type, COUNT(*) AS n FROM assets WHERE current_status = 'clean_inventory' AND deleted_at IS NULL GROUP BY asset_type`);
  return Object.fromEntries(rows.map((r) => [r.asset_type, r.n]));
}

export async function nextAssetNumber(db: Db, assetType: string): Promise<string> {
  const prefix = ASSET_NUMBER_PREFIX[assetType] ?? "GLMT-X";
  const row = await one<{ maxn: number | null }>(
    db, `SELECT MAX(CAST(substr(asset_number, ?) AS INTEGER)) AS maxn FROM assets WHERE asset_number LIKE ?`,
    prefix.length + 2, `${prefix}-%`,
  );
  return `${prefix}-${String((row?.maxn ?? 0) + 1).padStart(4, "0")}`;
}

export async function createAsset(
  db: Db, input: {
    assetType: string; manufacturer?: string; model?: string; color?: string;
    purchaseDate?: string; purchaseCostCents?: number; replacementCostCents: number;
    branchId?: string; storageLocationId?: string; notes?: string;
  },
): Promise<AssetRow> {
  const assetNumber = await nextAssetNumber(db, input.assetType);
  const assetId = id("ast");
  const qrValue = `GLMT://${assetNumber}`;
  await run(
    db,
    `INSERT INTO assets (id, asset_number, qr_code_value, barcode_value, asset_type, manufacturer, model, color,
       purchase_date, purchase_cost_cents, replacement_cost_cents, branch_id, storage_location_id,
       current_status, current_condition, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'good', ?, ?, ?)`,
    assetId, assetNumber, qrValue, assetNumber, input.assetType,
    input.manufacturer ?? null, input.model ?? null, input.color ?? null,
    input.purchaseDate ?? null, input.purchaseCostCents ?? 0, input.replacementCostCents,
    input.branchId ?? null, input.storageLocationId ?? null, input.notes ?? null, nowIso(), nowIso(),
  );
  return (await one<AssetRow>(db, `SELECT * FROM assets WHERE id = ?`, assetId))!;
}
