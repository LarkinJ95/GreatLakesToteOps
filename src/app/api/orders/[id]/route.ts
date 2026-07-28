import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { one, q } from "@/lib/db";
import { NotFoundError, withErrorHandling } from "@/lib/errors";

export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "orders.view");
    const env = await getEnv(),
      orderId = (await context.params).id;
    const order = await one(
      env.DB,
      `SELECT o.*,p.name AS package_name,COALESCE(c.business_name,trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS customer_name,c.customer_number,c.email,c.primary_phone,da.street delivery_street,da.unit delivery_unit,da.city delivery_city,da.state delivery_state,da.zip delivery_zip,da.delivery_notes delivery_notes,pa.street pickup_street,pa.unit pickup_unit,pa.city pickup_city,pa.state pickup_state,pa.zip pickup_zip,pa.delivery_notes pickup_notes FROM orders o JOIN customers c ON c.id=o.customer_id LEFT JOIN rental_packages p ON p.id=o.package_id LEFT JOIN customer_addresses da ON da.id=o.delivery_address_id LEFT JOIN customer_addresses pa ON pa.id=o.pickup_address_id WHERE o.id=? AND o.deleted_at IS NULL`,
      orderId,
    );
    if (!order) throw new NotFoundError("Order");
    const [
      assignments,
      assets,
      invoices,
      agreements,
      statusHistory,
      cancellation,
    ] = await Promise.all([
      q(
        env.DB,
        "SELECT id,assignment_number,assignment_type,scheduled_date,window_start,window_end,status FROM assignments WHERE order_id=? ORDER BY scheduled_date",
        orderId,
      ),
      q(
        env.DB,
        "SELECT a.id,a.asset_number,a.asset_type,a.current_status,oa.delivered_at,oa.picked_up_at,oa.missing,oa.damaged FROM order_assets oa JOIN assets a ON a.id=oa.asset_id WHERE oa.order_id=?",
        orderId,
      ),
      q(
        env.DB,
        "SELECT id,invoice_number,status,due_date,total_cents,balance_due_cents FROM invoices WHERE order_id=? ORDER BY created_at DESC",
        orderId,
      ),
      q(
        env.DB,
        "SELECT id,agreement_number,status,accepted_at,expires_at,verification_code FROM agreements WHERE order_id=? ORDER BY created_at DESC",
        orderId,
      ),
      q(
        env.DB,
        "SELECT from_status,to_status,reason,changed_at FROM order_status_history WHERE order_id=? ORDER BY changed_at DESC",
        orderId,
      ),
      one(
        env.DB,
        "SELECT * FROM cancellation_records WHERE order_id=?",
        orderId,
      ),
    ]);
    return Response.json({
      order,
      assignments,
      assets,
      invoices,
      agreements,
      statusHistory,
      cancellation,
    });
  },
);
