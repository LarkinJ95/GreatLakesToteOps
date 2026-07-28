import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { q } from "@/lib/db";
import { NotFoundError, withErrorHandling } from "@/lib/errors";
import { processScan } from "@/lib/services/assetService";

/** Load every staged, allocated asset using the same audited scan state machine. */
export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "orders.edit");
    const env = await getEnv(), orderId = (await context.params).id;
    const order = await q<{ id: string; order_number: string }>(
      env.DB,
      "SELECT id,order_number FROM orders WHERE id=? AND deleted_at IS NULL",
      orderId,
    );
    if (!order[0]) throw new NotFoundError("Order");
    const staged = await q<{ id: string; asset_number: string; qr_code_value: string }>(
      env.DB,
      "SELECT a.id,a.asset_number,a.qr_code_value FROM order_assets oa JOIN assets a ON a.id=oa.asset_id WHERE oa.order_id=? AND oa.picked_up_at IS NULL AND a.deleted_at IS NULL AND a.current_status='staged' ORDER BY a.asset_number",
      orderId,
    );
    const timestamp = new Date().toISOString();
    const loaded: string[] = [], failed: { assetNumber: string; message: string }[] = [];
    for (const asset of staged) {
      const result = await processScan(env.DB, {
        idempotencyKey: `bulk-load:${orderId}:${asset.id}:${timestamp}`,
        assetIdentifier: asset.qr_code_value,
        mode: "load",
        orderId,
        userId: ctx.user.id,
        deviceId: "order-workspace-bulk-load",
        deviceTimestamp: timestamp,
        notes: `Bulk loaded from order ${order[0].order_number}`,
      });
      if (result.ok) loaded.push(asset.asset_number);
      else failed.push({ assetNumber: asset.asset_number, message: result.message ?? "Load was not accepted" });
    }
    await audit(env.DB, {
      actorUserId: ctx.user.id,
      action: "order.assets_bulk_loaded",
      entityType: "order",
      entityId: orderId,
      detail: { loaded, failed, stagedCount: staged.length },
      ip: ctx.ip,
    });
    return Response.json({ loaded, failed, stagedCount: staged.length });
  },
);
