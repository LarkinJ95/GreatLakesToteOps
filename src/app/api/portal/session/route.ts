import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { one, q } from "@/lib/db";
import { UnauthorizedError, withErrorHandling } from "@/lib/errors";

type Customer = { first_name: string | null; last_name: string | null; business_name: string | null; customer_number: string; email: string | null; primary_phone: string | null };

export const GET = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  if (!ctx.portalCustomerId || ctx.user.id !== "usr_customer_portal") throw new UnauthorizedError("Customer portal sign-in required");
  const env = await getEnv();
  const customer = await one<Customer>(env.DB, "SELECT first_name,last_name,business_name,customer_number,email,primary_phone FROM customers WHERE id = ? AND deleted_at IS NULL", ctx.portalCustomerId);
  if (!customer) throw new UnauthorizedError("Customer account is unavailable");
  const [orders, invoices, agreements] = await Promise.all([
    q(env.DB, `SELECT o.order_number,o.order_status,o.scheduled_delivery_date,o.scheduled_pickup_date,o.total_cents,o.balance_due_cents,o.payment_status,o.agreement_status,p.name AS package_name, da.street AS delivery_street, da.city AS delivery_city, da.state AS delivery_state, da.zip AS delivery_zip, pa.street AS pickup_street, pa.city AS pickup_city, pa.state AS pickup_state, pa.zip AS pickup_zip FROM orders o LEFT JOIN rental_packages p ON p.id=o.package_id LEFT JOIN customer_addresses da ON da.id=o.delivery_address_id LEFT JOIN customer_addresses pa ON pa.id=o.pickup_address_id WHERE o.customer_id = ? AND o.deleted_at IS NULL ORDER BY COALESCE(o.scheduled_delivery_date,o.created_at) DESC LIMIT 20`, ctx.portalCustomerId),
    q(env.DB, `SELECT i.invoice_number,i.status,i.due_date,i.total_cents,i.balance_due_cents,o.order_number FROM invoices i LEFT JOIN orders o ON o.id=i.order_id WHERE i.customer_id = ? AND i.status NOT IN ('draft','voided') ORDER BY i.created_at DESC LIMIT 30`, ctx.portalCustomerId),
    q(env.DB, `SELECT a.agreement_number,a.status,a.expires_at,a.accepted_at,o.order_number FROM agreements a JOIN orders o ON o.id=a.order_id WHERE a.customer_id = ? ORDER BY a.created_at DESC LIMIT 20`, ctx.portalCustomerId),
  ]);
  return Response.json({ customer: { name: customer.business_name || `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim(), customerNumber: customer.customer_number, email: customer.email, phone: customer.primary_phone }, orders, invoices, agreements });
});
