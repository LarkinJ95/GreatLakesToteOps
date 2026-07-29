import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { q } from "@/lib/db";
import { ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString } from "@/lib/http";
import { createAsset } from "@/lib/services/assetService";
import type { AssetType } from "@/lib/types";
const assetTypes = new Set<AssetType>(["tote", "dolly", "hand_truck", "blanket_pack", "trailer", "vehicle", "other"]);
const assetStatuses = new Set([
  "new", "clean_inventory", "reserved", "staged", "loaded", "out_for_delivery",
  "delivered", "rented", "pickup_scheduled", "picked_up", "dirty_return",
  "cleaning", "inspection_required", "quarantine", "repair_required", "missing",
  "damaged", "retired",
]);

export const GET = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "assets.view");
  const env = await getEnv();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const type = url.searchParams.get("type") ?? "";
  const search = (url.searchParams.get("q") ?? "").trim();
  if (status && status !== "in_field" && !assetStatuses.has(status)) throw new ValidationError("Unsupported inventory status");
  if (type && !assetTypes.has(type as AssetType)) throw new ValidationError("Unsupported equipment type");
  const filters: string[] = ["a.deleted_at IS NULL"];
  const values: unknown[] = [];
  if (status === "in_field") filters.push("a.current_status IN ('delivered','rented','pickup_scheduled')");
  else if (status) { filters.push("a.current_status = ?"); values.push(status); }
  if (type) { filters.push("a.asset_type = ?"); values.push(type); }
  if (search) {
    const term = `%${search.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    filters.push("(a.asset_number LIKE ? ESCAPE '\\' OR a.qr_code_value LIKE ? ESCAPE '\\' OR b.code LIKE ? ESCAPE '\\' OR o.order_number LIKE ? ESCAPE '\\' OR c.business_name LIKE ? ESCAPE '\\' OR c.first_name LIKE ? ESCAPE '\\' OR c.last_name LIKE ? ESCAPE '\\')");
    values.push(term, term, term, term, term, term, term);
  }
  const [assets, statusCounts] = await Promise.all([
    q(env.DB, `SELECT a.*, b.code AS bin_code, sl.code AS location_code, o.order_number,
      COALESCE(c.business_name, trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS customer_name
      FROM assets a
      LEFT JOIN asset_bin_assignments aba ON aba.asset_id = a.id AND aba.status = 'active'
      LEFT JOIN warehouse_bins b ON b.id = aba.bin_id
      LEFT JOIN storage_locations sl ON sl.id = b.storage_location_id
      LEFT JOIN orders o ON o.id = a.current_order_id
      LEFT JOIN customers c ON c.id = COALESCE(a.current_customer_id, o.customer_id)
      WHERE ${filters.join(" AND ")}
      ORDER BY CASE a.current_status WHEN 'new' THEN 0 WHEN 'dirty_return' THEN 1 WHEN 'cleaning' THEN 2 WHEN 'inspection_required' THEN 3 ELSE 4 END, a.last_scan_at DESC, a.asset_number
      LIMIT 200`, ...values),
    q<{ current_status: string; count: number }>(env.DB, "SELECT current_status, COUNT(*) AS count FROM assets WHERE deleted_at IS NULL GROUP BY current_status"),
  ]);
  return Response.json({ assets, statusCounts });
});
export const POST = withErrorHandling(async (request) => { const ctx = await requireUser(request); requirePermission(ctx, "assets.manage"); const body = await jsonBody<{ assetType?: unknown; replacementCostCents?: unknown; quantity?: unknown; manufacturer?: unknown; model?: unknown; color?: unknown; branchId?: unknown; storageLocationId?: unknown; notes?: unknown }>(request); if (typeof body.assetType !== "string" || !assetTypes.has(body.assetType as AssetType)) throw new ValidationError("A valid assetType is required"); if (typeof body.replacementCostCents !== "number" || !Number.isInteger(body.replacementCostCents) || body.replacementCostCents < 0) throw new ValidationError("replacementCostCents must be a non-negative integer"); const quantity = body.quantity == null ? 1 : Number(body.quantity); if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new ValidationError("quantity must be a whole number between 1 and 100"); const env = await getEnv(); const input = { assetType: body.assetType, replacementCostCents: body.replacementCostCents, manufacturer: optionalString(body.manufacturer, "Manufacturer", 100) ?? undefined, model: optionalString(body.model, "Model", 100) ?? undefined, color: optionalString(body.color, "Color", 50) ?? undefined, branchId: optionalString(body.branchId, "Branch", 100) ?? undefined, storageLocationId: optionalString(body.storageLocationId, "Storage location", 100) ?? undefined, notes: optionalString(body.notes, "Notes", 4000) ?? undefined }; const assets = []; for (let index = 0; index < quantity; index += 1) assets.push(await createAsset(env.DB, input)); await audit(env.DB, { actorUserId: ctx.user.id, action: "assets.created", entityType: "asset", entityId: assets[0].id, detail: { assetNumbers: assets.map(asset => asset.asset_number), quantity }, ip: ctx.ip }); return Response.json({ assets, quantity }, { status: 201 }); });
