import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { id, nowIso, one, q, run } from "@/lib/db";
import { NotFoundError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString, requiredString } from "@/lib/http";
export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "customers.view");
    const env = await getEnv(),
      customerId = (await context.params).id;
    return Response.json({
      addresses: await q(
        env.DB,
        "SELECT * FROM customer_addresses WHERE customer_id=? ORDER BY label,created_at",
        customerId,
      ),
    });
  },
);
export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "customers.edit");
    const env = await getEnv(),
      customerId = (await context.params).id,
      body = await jsonBody<Record<string, unknown>>(request);
    if (
      !(await one(
        env.DB,
        "SELECT id FROM customers WHERE id=? AND deleted_at IS NULL",
        customerId,
      ))
    )
      throw new NotFoundError("Customer");
    const addressId = id("addr"),
      now = nowIso();
    await run(
      env.DB,
      "INSERT INTO customer_addresses (id,customer_id,label,street,unit,city,state,zip,parking_instructions,stair_info,elevator_info,delivery_notes,contactless_allowed,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      addressId,
      customerId,
      optionalString(body.label, "label", 80) ?? "Address",
      requiredString(body.street, "street", 200),
      optionalString(body.unit, "unit", 50),
      requiredString(body.city, "city", 100),
      optionalString(body.state, "state", 10) ?? "MI",
      requiredString(body.zip, "ZIP", 20),
      optionalString(body.parking, "parking", 500),
      optionalString(body.stairs, "stairs", 100),
      optionalString(body.elevator, "elevator", 100),
      optionalString(body.accessNotes, "access notes", 2000),
      body.contactless ? 1 : 0,
      now,
      now,
    );
    await audit(env.DB, {
      actorUserId: ctx.user.id,
      action: "customer.address_added",
      entityType: "customer",
      entityId: customerId,
      detail: { addressId },
      ip: ctx.ip,
    });
    return Response.json({ id: addressId }, { status: 201 });
  },
);
