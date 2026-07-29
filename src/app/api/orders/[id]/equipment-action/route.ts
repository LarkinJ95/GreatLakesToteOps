import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { q } from "@/lib/db";
import { NotFoundError, withErrorHandling } from "@/lib/errors";
import { processScan } from "@/lib/services/assetService";

type Action = "stage" | "load" | "deliver" | "pickup" | "return";
const actionMeta: Record<Action, { label: string; scanMode: "stage" | "load" | "deliver" | "pickup" | "warehouse_return"; statuses: string[] }> = {
  stage: { label: "Stage all equipment", scanMode: "stage", statuses: ["reserved"] },
  load: { label: "Load all equipment", scanMode: "load", statuses: ["staged"] },
  deliver: { label: "Deliver all equipment", scanMode: "deliver", statuses: ["loaded"] },
  pickup: { label: "Pick up all equipment", scanMode: "pickup", statuses: ["delivered", "rented", "pickup_scheduled"] },
  return: { label: "Return all equipment to warehouse", scanMode: "warehouse_return", statuses: ["picked_up"] },
};

/** Applies the next equipment movement for every eligible asset on the order. */
export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "orders.edit");
    const env = await getEnv(), orderId = (await context.params).id;
    const order = await q<{ id: string; order_number: string }>(env.DB,
      "SELECT id,order_number FROM orders WHERE id=? AND deleted_at IS NULL", orderId);
    if (!order[0]) throw new NotFoundError("Order");
    const assets = await q<{ id: string; asset_number: string; qr_code_value: string; current_status: string }>(env.DB,
      "SELECT a.id,a.asset_number,a.qr_code_value,a.current_status FROM order_assets oa JOIN assets a ON a.id=oa.asset_id WHERE oa.order_id=? AND oa.warehouse_return_at IS NULL AND oa.missing=0 AND a.deleted_at IS NULL ORDER BY a.asset_number", orderId);
    const action = (["stage", "load", "deliver", "pickup", "return"] as Action[]).find((candidate) =>
      assets.some((asset) => actionMeta[candidate].statuses.includes(asset.current_status)));
    if (!action) return Response.json({ action: null, label: "Equipment is already picked up or has no pending movement.", completed: [], failed: [] });
    const targets = assets.filter((asset) => actionMeta[action].statuses.includes(asset.current_status));
    const timestamp = new Date().toISOString(), completed: string[] = [], failed: { assetNumber: string; message: string }[] = [];
    for (const asset of targets) {
      const result = await processScan(env.DB, {
        idempotencyKey: `guided-${action}:${orderId}:${asset.id}:${timestamp}`,
        assetIdentifier: asset.qr_code_value, mode: actionMeta[action].scanMode, orderId,
        userId: ctx.user.id, deviceId: "order-workspace-guided-equipment", deviceTimestamp: timestamp,
        notes: `${actionMeta[action].label} from order ${order[0].order_number}`,
      });
      if (result.ok) completed.push(asset.asset_number);
      else failed.push({ assetNumber: asset.asset_number, message: result.message ?? "Action was not accepted" });
    }
    await audit(env.DB, { actorUserId: ctx.user.id, action: `order.equipment_bulk_${action}`, entityType: "order", entityId: orderId, detail: { completed, failed }, ip: ctx.ip });
    return Response.json({ action, label: actionMeta[action].label, completed, failed });
  },
);
