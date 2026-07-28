import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { nowIso, one, run } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString } from "@/lib/http";
import { calculateOrderPrice } from "@/lib/services/orderService";

export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(async (request, context) => {
  const ctx = await requireUser(request); requirePermission(ctx, "orders.edit"); const env = await getEnv(), orderId = (await context.params).id, body = await jsonBody<Record<string, unknown>>(request);
  const order = await one<{ id:string;package_id:string|null;scheduled_delivery_date:string|null;scheduled_pickup_date:string|null;customer_id:string;order_status:string }>(env.DB, "SELECT * FROM orders WHERE id=? AND deleted_at IS NULL", orderId); if (!order) throw new NotFoundError("Order"); if (["cancelled","completed","closed"].includes(order.order_status)) throw new ConflictError("Closed or cancelled orders cannot be repriced"); if (!order.package_id) throw new ValidationError("Order has no package");
  const discount = Number(body.discountCents ?? 0), access = Number(body.accessFeeCents ?? 0), addOn = Number(body.addOnCents ?? 0); if (![discount,access,addOn].every(Number.isInteger) || Math.min(discount,access,addOn) < 0) throw new ValidationError("Pricing values must be non-negative cents"); const reason = optionalString(body.reason, "Discount reason", 1000); if (discount > 0 && !reason) throw new ValidationError("A discount reason is required");
  const customer = await one<{tax_exempt:number}>(env.DB,"SELECT tax_exempt FROM customers WHERE id=?",order.customer_id); const price = await calculateOrderPrice(env.DB,{packageId:order.package_id,accessFeeCents:access,addOnCents:addOn,discountCents:discount,taxExempt:customer?.tax_exempt===1});
  await run(env.DB,"UPDATE orders SET access_fee_cents=?,add_on_cents=?,discount_cents=?,tax_cents=?,total_cents=?,balance_due_cents=MAX(0,?-amount_paid_cents),pricing_snapshot_json=?,updated_at=?,version=version+1 WHERE id=?",price.accessFeeCents,price.addOnCents,price.discountCents,price.taxCents,price.totalCents,price.totalCents,JSON.stringify({...price.snapshot,priceChangeReason:reason}),nowIso(),orderId);
  await audit(env.DB,{actorUserId:ctx.user.id,action:"order.pricing_updated",entityType:"order",entityId:orderId,detail:{discountCents:discount,accessFeeCents:access,addOnCents:addOn,reason},ip:ctx.ip}); return Response.json({price});
});
