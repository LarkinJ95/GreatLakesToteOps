import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { q } from "@/lib/db";
import { NotFoundError, withErrorHandling } from "@/lib/errors";
import { processScan } from "@/lib/services/assetService";

/** Stage every reserved asset for an order using the normal scan state machine. */
export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "orders.edit");
    const env = await getEnv(), orderId = (await context.params).id;
    const order = await q<{ id: string; order_number: string }>(
      env.DB, "SELECT id,order_number FROM orders WHERE id=? AND deleted_at IS NULL", orderId);
    if (!order[0]) throw new NotFoundError("Order");
    const reserved = await q<{ id: string; asset_number: string; qr_code_value: string }>(
      env.DB,
      "SELECT a.id,a.asset_number,a.qr_code_value FROM order_assets oa JOIN assets a ON a.id=oa.asset_id WHERE oa.order_id=? AND oa.picked_up_at IS NULL AND a.deleted_at IS NULL AND a.current_status='reserved' ORDER BY a.asset_number",
      orderId,
    );
    const timestamp = new Date().toISOString(), staged: string[] = [], failed: { assetNumber: string; message: string }[] = [];
    for (const asset of reserved) {
      const result = await processScan(env.DB, {
        idempotencyKey: `bulk-stage:${orderId}:${asset.id}:${timestamp}`,
        assetIdentifier: asset.qr_code_value,
        mode: "stage", orderId, userId: ctx.user.id,
        deviceId: "order-workspace-bulk-stage", deviceTimestamp: timestamp,
        notes: `Bulk staged from order ${order[0].order_number}`,
      });
      if (result.ok) staged.push(asset.asset_number);
      else failed.push({ assetNumber: asset.asset_number, message: result.message ?? "Stage was not accepted" });
    }
    await audit(env.DB, { actorUserId: ctx.user.id, action: "order.assets_bulk_staged", entityType: "order", entityId: orderId,
      detail: { staged, failed, reservedCount: reserved.length }, ip: ctx.ip });
    return Response.json({ staged, failed, reservedCount: reserved.length });
  },
);
