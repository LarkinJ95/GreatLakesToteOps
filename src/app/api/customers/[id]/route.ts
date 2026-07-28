import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { nowIso, one, q, run } from "@/lib/db";
import { NotFoundError, ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString } from "@/lib/http";

export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(async (request, context) => {
  const ctx = await requireUser(request); requirePermission(ctx, "customers.view"); const env = await getEnv(), customerId = (await context.params).id;
  const customer = await one(env.DB, "SELECT * FROM customers WHERE id=? AND deleted_at IS NULL", customerId); if (!customer) throw new NotFoundError("Customer");
  const [orders, invoices, agreements, history, bins] = await Promise.all([
    q(env.DB, `SELECT o.*,p.name AS package_name FROM orders o LEFT JOIN rental_packages p ON p.id=o.package_id WHERE o.customer_id=? AND o.deleted_at IS NULL ORDER BY o.created_at DESC`, customerId),
    q(env.DB, "SELECT id,invoice_number,status,due_date,total_cents,balance_due_cents,order_id,created_at FROM invoices WHERE customer_id=? ORDER BY created_at DESC", customerId),
    q(env.DB, "SELECT id,agreement_number,status,order_id,accepted_at,expires_at,verification_code,created_at FROM agreements WHERE customer_id=? ORDER BY created_at DESC", customerId),
    q(env.DB, `SELECT action,entity_type,entity_id,detail_json,created_at FROM audit_logs WHERE (entity_type='customer' AND entity_id=?) OR entity_id IN (SELECT id FROM orders WHERE customer_id=?) ORDER BY created_at DESC LIMIT 100`, customerId, customerId),
    q(env.DB, `SELECT b.id,b.code,l.code location_code,ba.purpose,ba.order_id,o.order_number FROM bin_assignments ba JOIN warehouse_bins b ON b.id=ba.bin_id JOIN storage_locations l ON l.id=b.storage_location_id LEFT JOIN orders o ON o.id=ba.order_id WHERE ba.customer_id=? AND ba.status='active' ORDER BY ba.assigned_at DESC`, customerId),
  ]);
  return Response.json({ customer, orders, invoices, agreements, history, bins });
});

export const PATCH = withErrorHandling<{ params: Promise<{ id: string }> }>(async (request, context) => {
  const ctx = await requireUser(request); requirePermission(ctx, "customers.edit"); const env = await getEnv(), customerId = (await context.params).id;
  const body = await jsonBody<Record<string, unknown>>(request); const existing = await one(env.DB, "SELECT id FROM customers WHERE id=? AND deleted_at IS NULL", customerId); if (!existing) throw new NotFoundError("Customer");
  const values = { phone: optionalString(body.phone, "Phone", 40), email: optionalString(body.email, "Email", 254), notes: optionalString(body.notes, "Notes", 4000) };
  await run(env.DB, "UPDATE customers SET primary_phone=?,email=?,notes=?,updated_at=? WHERE id=?", values.phone, values.email, values.notes, nowIso(), customerId);
  await audit(env.DB, { actorUserId: ctx.user.id, action: "customer.updated", entityType: "customer", entityId: customerId, detail: { fields: Object.keys(values) }, ip: ctx.ip }); return Response.json({ ok: true });
});
