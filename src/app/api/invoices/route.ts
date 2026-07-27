import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { id, nowIso, one, q, run } from "@/lib/db";
import { NotFoundError, ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString, requiredString } from "@/lib/http";
import { nextDocumentNumber } from "@/lib/numbering";

type OrderForInvoice = { id: string; order_number: string; customer_id: string; business_account_id: string | null; total_cents: number; tax_cents: number; balance_due_cents: number; scheduled_delivery_date: string | null; customer_name: string; email: string | null; primary_phone: string | null };

export const GET = withErrorHandling(async request => {
  const ctx = await requireUser(request); requirePermission(ctx, "invoices.view"); const env = await getEnv();
  const invoices = await q(env.DB, `SELECT i.*, o.order_number, COALESCE(c.business_name, trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS customer_name FROM invoices i JOIN customers c ON c.id=i.customer_id LEFT JOIN orders o ON o.id=i.order_id ORDER BY i.created_at DESC LIMIT 100`);
  const orders = await q<OrderForInvoice>(env.DB, `SELECT o.id,o.order_number,o.customer_id,o.business_account_id,o.total_cents,o.tax_cents,o.balance_due_cents,o.scheduled_delivery_date,COALESCE(c.business_name,trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS customer_name,c.email,c.primary_phone FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.deleted_at IS NULL AND o.order_status NOT IN ('cancelled','closed') ORDER BY o.created_at DESC LIMIT 100`);
  return Response.json({ invoices, orders });
});

export const POST = withErrorHandling(async request => {
  const ctx = await requireUser(request); requirePermission(ctx, "invoices.create"); const body = await jsonBody<Record<string, unknown>>(request); const orderId = requiredString(body.orderId, "orderId", 100); const env = await getEnv();
  const order = await one<OrderForInvoice>(env.DB, `SELECT o.id,o.order_number,o.customer_id,o.business_account_id,o.total_cents,o.tax_cents,o.balance_due_cents,o.scheduled_delivery_date,COALESCE(c.business_name,trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS customer_name,c.email,c.primary_phone FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.id=? AND o.deleted_at IS NULL`, orderId);
  if (!order) throw new NotFoundError("Order not found"); const type = optionalString(body.type, "type", 50) ?? "standard";
  if (!new Set(["standard","deposit","final_rental","business_account","damage","extension","failed_pickup","redelivery"]).has(type)) throw new ValidationError("Unsupported invoice type");
  const invoiceId = id("inv"), invoiceNumber = await nextDocumentNumber(env.DB, "invoice"), now = nowIso(), total = Math.max(0, order.balance_due_cents || order.total_cents), notes = optionalString(body.notes, "notes", 4000);
  const snapshot = JSON.stringify({ name: order.customer_name, email: order.email, phone: order.primary_phone });
  await run(env.DB, `INSERT INTO invoices (id,invoice_number,invoice_type,customer_id,business_account_id,order_id,status,issue_date,due_date,service_date,subtotal_cents,tax_total_cents,total_cents,balance_due_cents,customer_billing_snapshot_json,company_snapshot_json,notes,verification_code,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?, 'draft', date('now'), date('now','+30 days'), ?,?,?,?,?,?,?,?,?,?,?,?)`, invoiceId, invoiceNumber, type, order.customer_id, order.business_account_id, order.id, order.scheduled_delivery_date, Math.max(0,total-order.tax_cents), order.tax_cents, total, total, snapshot, JSON.stringify({ name: "Great Lakes Moving Totes" }), notes, crypto.randomUUID().replace(/-/g, "").slice(0, 16), ctx.user.id, now, now);
  await run(env.DB, `INSERT INTO invoice_line_items (id,invoice_id,line_order,item_type,description,service_date,quantity,unit,unit_price_cents,taxable,tax_rate_percent,tax_cents,line_subtotal_cents,line_total_cents) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, id("ili"), invoiceId, 1, "package_rental", `Rental order ${order.order_number}`, order.scheduled_delivery_date, 1, "rental", Math.max(0,total-order.tax_cents), 1, 0, order.tax_cents, Math.max(0,total-order.tax_cents), total);
  await audit(env.DB, { actorUserId: ctx.user.id, action: "invoice.created", entityType: "invoice", entityId: invoiceId, detail: { invoiceNumber, orderNumber: order.order_number }, ip: ctx.ip });
  return Response.json({ id: invoiceId, invoiceNumber }, { status: 201 });
});
