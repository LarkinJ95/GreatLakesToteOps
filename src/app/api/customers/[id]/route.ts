import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { nowIso, one, q, run } from "@/lib/db";
import { NotFoundError, ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString } from "@/lib/http";

export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(async (request, context) => {
  const ctx = await requireUser(request); requirePermission(ctx, "customers.view"); const env = await getEnv(), customerId = (await context.params).id;
  const customer = await one(env.DB, "SELECT * FROM customers WHERE id=? AND deleted_at IS NULL", customerId); if (!customer) throw new NotFoundError("Customer");
  const [orders, invoices, agreements, history, equipment] = await Promise.all([
    q(env.DB, `SELECT o.*,p.name AS package_name FROM orders o LEFT JOIN rental_packages p ON p.id=o.package_id WHERE o.customer_id=? AND o.deleted_at IS NULL ORDER BY o.created_at DESC`, customerId),
    q(env.DB, "SELECT id,invoice_number,status,due_date,total_cents,balance_due_cents,order_id,created_at FROM invoices WHERE customer_id=? ORDER BY created_at DESC", customerId),
    q(env.DB, "SELECT id,agreement_number,status,order_id,accepted_at,expires_at,verification_code,created_at FROM agreements WHERE customer_id=? ORDER BY created_at DESC", customerId),
    q(env.DB, `SELECT action,entity_type,entity_id,detail_json,created_at FROM audit_logs WHERE (entity_type='customer' AND entity_id=?) OR entity_id IN (SELECT id FROM orders WHERE customer_id=?) ORDER BY created_at DESC LIMIT 100`, customerId, customerId),
    q(env.DB, `SELECT oa.id allocation_id,oa.order_id,o.order_number,o.order_status,a.id asset_id,a.asset_number,a.asset_type,a.current_status,a.current_condition,oa.assigned_at,oa.delivered_at,oa.picked_up_at,oa.warehouse_return_at,oa.missing,oa.damaged FROM order_assets oa JOIN orders o ON o.id=oa.order_id JOIN assets a ON a.id=oa.asset_id WHERE o.customer_id=? ORDER BY CASE WHEN oa.warehouse_return_at IS NULL AND oa.missing=0 THEN 0 ELSE 1 END,oa.assigned_at DESC`, customerId),
  ]);
  return Response.json({ customer, orders, invoices, agreements, history, equipment });
});

export const PATCH = withErrorHandling<{ params: Promise<{ id: string }> }>(async (request, context) => {
  const ctx = await requireUser(request); requirePermission(ctx, "customers.edit"); const env = await getEnv(), customerId = (await context.params).id;
  const body = await jsonBody<Record<string, unknown>>(request); const existing = await one(env.DB, "SELECT id FROM customers WHERE id=? AND deleted_at IS NULL", customerId); if (!existing) throw new NotFoundError("Customer");
  const values = { phone: optionalString(body.phone, "Phone", 40), email: optionalString(body.email, "Email", 254), notes: optionalString(body.notes, "Notes", 4000) };
  await run(env.DB, "UPDATE customers SET primary_phone=?,email=?,notes=?,updated_at=? WHERE id=?", values.phone, values.email, values.notes, nowIso(), customerId);
  await audit(env.DB, { actorUserId: ctx.user.id, action: "customer.updated", entityType: "customer", entityId: customerId, detail: { fields: Object.keys(values) }, ip: ctx.ip }); return Response.json({ ok: true });
});

/** Preserve accounting and rental history: only empty customer records can be removed. */
export const DELETE = withErrorHandling<{ params: Promise<{ id: string }> }>(async (request, context) => {
  const ctx = await requireUser(request); requirePermission(ctx, "customers.delete");
  const env = await getEnv(), customerId = (await context.params).id;
  const customer = await one<{ id: string; customer_number: string }>(env.DB, "SELECT id,customer_number FROM customers WHERE id=? AND deleted_at IS NULL", customerId);
  if (!customer) throw new NotFoundError("Customer");
  const usage = await one<{ n: number }>(env.DB, "SELECT (SELECT COUNT(*) FROM orders WHERE customer_id=? AND deleted_at IS NULL) + (SELECT COUNT(*) FROM invoices WHERE customer_id=?) + (SELECT COUNT(*) FROM agreements WHERE customer_id=?) AS n", customerId, customerId, customerId);
  if ((usage?.n ?? 0) > 0) throw new ValidationError("Customers with orders, invoices, or agreements cannot be deleted. Keep the record for its audit history.");
  await run(env.DB, "UPDATE customers SET deleted_at=?,updated_at=? WHERE id=?", nowIso(), nowIso(), customerId);
  await audit(env.DB, { actorUserId: ctx.user.id, action: "customer.deleted", entityType: "customer", entityId: customerId, detail: { customerNumber: customer.customer_number }, ip: ctx.ip });
  return Response.json({ ok: true });
});
