import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { q } from "@/lib/db";
import { ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString, requiredString } from "@/lib/http";
import { createOrder } from "@/lib/services/orderService";

export const GET = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "orders.view");
  const env = await getEnv();
  const url = new URL(request.url);
  const status = url.searchParams.get("status"),
    upcoming = url.searchParams.get("upcoming") === "true";
  const orders = await q(
    env.DB,
    `SELECT o.*, COALESCE(c.business_name, trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS customer_name FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.deleted_at IS NULL ${status ? "AND o.order_status = ?" : ""} ${upcoming ? "AND o.scheduled_delivery_date >= date('now')" : ""} ORDER BY o.scheduled_delivery_date DESC, o.created_at DESC LIMIT 100`,
    ...(status ? [status] : []),
  );
  return Response.json({ orders });
});

export const POST = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "orders.create");
  const body = await jsonBody<Record<string, unknown>>(request);
  const input = {
    customerId: requiredString(body.customerId, "customerId", 100),
    packageId: requiredString(body.packageId, "packageId", 100),
    rentalStartDate: requiredString(
      body.rentalStartDate,
      "rentalStartDate",
      10,
    ),
    scheduledDeliveryDate: requiredString(
      body.scheduledDeliveryDate,
      "scheduledDeliveryDate",
      10,
    ),
    scheduledPickupDate: requiredString(
      body.scheduledPickupDate,
      "scheduledPickupDate",
      10,
    ),
    deliveryAddressId:
      optionalString(body.deliveryAddressId, "deliveryAddressId", 100) ??
      undefined,
    pickupAddressId:
      optionalString(body.pickupAddressId, "pickupAddressId", 100) ?? undefined,
    businessAccountId:
      optionalString(body.businessAccountId, "businessAccountId", 100) ??
      undefined,
    internalNotes:
      optionalString(body.internalNotes, "internalNotes", 4000) ?? undefined,
    customerNotes:
      optionalString(body.customerNotes, "customerNotes", 4000) ?? undefined,
    preferredDeliveryWindow:
      optionalString(
        body.preferredDeliveryWindow,
        "preferredDeliveryWindow",
        100,
      ) ?? undefined,
    preferredPickupWindow:
      optionalString(
        body.preferredPickupWindow,
        "preferredPickupWindow",
        100,
      ) ?? undefined,
    accessFeeCents:
      body.accessFeeCents == null ? undefined : Number(body.accessFeeCents),
    addOnCents: body.addOnCents == null ? undefined : Number(body.addOnCents),
    discountCents:
      body.discountCents == null ? undefined : Number(body.discountCents),
  };
  for (const [key, value] of Object.entries({
    accessFeeCents: input.accessFeeCents,
    addOnCents: input.addOnCents,
    discountCents: input.discountCents,
  }))
    if (
      value != null &&
      (typeof value !== "number" || !Number.isInteger(value) || value < 0)
    )
      throw new ValidationError(`${key} must be a non-negative integer`);
  const env = await getEnv();
  const order = await createOrder(env.DB, ctx, input);
  return Response.json({ order }, { status: 201 });
});
