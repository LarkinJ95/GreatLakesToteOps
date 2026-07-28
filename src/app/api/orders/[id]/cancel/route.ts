import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { id, nowIso, one, run } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString, requiredString } from "@/lib/http";
import { releaseOrderAssets, transitionOrder } from "@/lib/services/orderService";

export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(async (request, context) => {
  const ctx = await requireUser(request); requirePermission(ctx,"orders.cancel"); const env=await getEnv(),orderId=(await context.params).id,body=await jsonBody<Record<string,unknown>>(request); const reason=requiredString(body.reason,"Cancellation reason",1000),fee=Number(body.feeCents??0),refund=Number(body.refundCents??0); if (![fee,refund].every(Number.isInteger)||Math.min(fee,refund)<0) throw new ValidationError("Cancellation amounts must be non-negative cents"); const order=await one<{id:string;order_status:string}>(env.DB,"SELECT id,order_status FROM orders WHERE id=? AND deleted_at IS NULL",orderId); if(!order) throw new NotFoundError("Order"); if(order.order_status==="cancelled") throw new ConflictError("Order is already cancelled"); await transitionOrder(env.DB,ctx,orderId,"cancelled",{reason}); await releaseOrderAssets(env.DB,orderId); const now=nowIso(); await run(env.DB,"INSERT INTO cancellation_records (id,order_id,requested_at,reason,fee_cents,refund_cents,approved_by,approved_at,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",id("can"),orderId,now,reason,fee,refund,ctx.user.id,now,optionalString(body.notes,"Notes",1000),now,now); await audit(env.DB,{actorUserId:ctx.user.id,action:"order.cancelled",entityType:"order",entityId:orderId,detail:{reason,feeCents:fee,refundCents:refund},ip:ctx.ip}); return Response.json({ok:true});
});
