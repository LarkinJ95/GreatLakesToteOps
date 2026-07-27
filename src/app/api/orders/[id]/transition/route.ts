import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString, requiredString } from "@/lib/http";
import { ORDER_TRANSITIONS, transitionOrder } from "@/lib/services/orderService";
import type { OrderStatus } from "@/lib/types";

export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(async (request, context) => {
  const ctx = await requireUser(request); requirePermission(ctx, "orders.edit");
  const body = await jsonBody<{ toStatus?: unknown; reason?: unknown; overrideAgreement?: unknown }>(request);
  const toStatus = requiredString(body.toStatus, "toStatus", 80) as OrderStatus;
  if (!Object.prototype.hasOwnProperty.call(ORDER_TRANSITIONS, toStatus)) throw new ValidationError("Unknown order status");
  const orderId = (await context.params).id;
  const env = await getEnv(); const order = await transitionOrder(env.DB, ctx, orderId, toStatus, { reason: optionalString(body.reason, "reason", 1000) ?? undefined, overrideAgreement: body.overrideAgreement === true });
  return Response.json({ order });
});
