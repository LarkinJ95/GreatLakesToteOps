import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { id, nowIso, one, q, stmt } from "@/lib/db";
import { NotFoundError, ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody } from "@/lib/http";
import { reserveAssets } from "@/lib/services/assetService";

/** Assign package-required or specifically selected equipment to an order in one operation. */
export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "orders.edit");
    const env = await getEnv(), orderId = (await context.params).id;
    const order = await one<{ id: string; order_number: string; package_id: string | null }>(
      env.DB, "SELECT id,order_number,package_id FROM orders WHERE id=? AND deleted_at IS NULL", orderId);
    if (!order) throw new NotFoundError("Order");
    const body = await jsonBody<{ mode?: unknown; assetIds?: unknown }>(request);
    const mode = body.mode === "auto" ? "auto" : "selected";
    if (mode === "auto") {
      const pkg = order.package_id ? await one<{ tote_quantity: number; dolly_quantity: number }>(
        env.DB, "SELECT tote_quantity,dolly_quantity FROM rental_packages WHERE id=?", order.package_id) : null;
      const assigned = await q<{ asset_type: string; n: number }>(env.DB,
        "SELECT a.asset_type,COUNT(*) n FROM order_assets oa JOIN assets a ON a.id=oa.asset_id WHERE oa.order_id=? AND oa.warehouse_return_at IS NULL AND oa.missing=0 GROUP BY a.asset_type", orderId);
      const count = Object.fromEntries(assigned.map((row) => [row.asset_type, row.n]));
      const result = await reserveAssets(env.DB, orderId, {
        tote: Math.max(0, (pkg?.tote_quantity ?? 0) - (count.tote ?? 0)),
        dolly: Math.max(0, (pkg?.dolly_quantity ?? 0) - (count.dolly ?? 0)),
      });
      if (Object.keys(result.shortages).length)
        throw new ValidationError(`Insufficient clean inventory: ${JSON.stringify(result.shortages)}`);
      await audit(env.DB, { actorUserId: ctx.user.id, action: "order.package_equipment_assigned", entityType: "order", entityId: orderId, detail: result, ip: ctx.ip });
      return Response.json({ assigned: result.reserved, shortages: result.shortages });
    }

    const assetIds = Array.isArray(body.assetIds)
      ? [...new Set(body.assetIds.filter((value): value is string => typeof value === "string" && value.length <= 100))]
      : [];
    if (!assetIds.length) throw new ValidationError("Select at least one piece of equipment");
    const placeholders = assetIds.map(() => "?").join(",");
    const assets = await q<{ id: string; asset_number: string; current_status: string; current_order_id: string | null }>(env.DB,
      `SELECT id,asset_number,current_status,current_order_id FROM assets WHERE id IN (${placeholders}) AND deleted_at IS NULL`, ...assetIds);
    const unavailable = assets.filter((asset) => asset.current_status !== "clean_inventory" || asset.current_order_id);
    if (assets.length !== assetIds.length || unavailable.length)
      throw new ValidationError(`Only clean, unallocated equipment can be assigned. ${unavailable.map((asset) => asset.asset_number).join(", ")}`);
    const now = nowIso();
    const writes: D1PreparedStatement[] = [];
    for (const asset of assets) writes.push(
      stmt(env.DB, "UPDATE assets SET current_status='reserved',current_order_id=?,version=version+1,updated_at=? WHERE id=? AND current_status='clean_inventory' AND current_order_id IS NULL", orderId, now, asset.id),
      stmt(env.DB, "INSERT INTO order_assets (id,order_id,asset_id,assigned_at) VALUES (?,?,?,?)", id("oa"), orderId, asset.id, now),
      stmt(env.DB, "INSERT INTO asset_status_history (id,asset_id,from_status,to_status,changed_by,changed_at,notes) VALUES (?,?,'clean_inventory','reserved',?,?,?)", id("ash"), asset.id, ctx.user.id, now, `Manually assigned to order ${order.order_number}`),
    );
    await env.DB.batch(writes);
    await audit(env.DB, { actorUserId: ctx.user.id, action: "order.selected_equipment_assigned", entityType: "order", entityId: orderId, detail: { assetIds, assetNumbers: assets.map((asset) => asset.asset_number) }, ip: ctx.ip });
    return Response.json({ assigned: assets.map((asset) => asset.asset_number) });
  },
);
