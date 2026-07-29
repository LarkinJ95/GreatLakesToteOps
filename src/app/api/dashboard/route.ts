import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { one, q } from "@/lib/db";
import { withErrorHandling } from "@/lib/errors";
export const GET = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "dashboard.view");
  const env = await getEnv();
  const today = new Date().toISOString().slice(0, 10);
  const [
    stops,
    inventory,
    attention,
    balance,
    assignments,
    overdueInvoices,
    assetAttention,
    cancellations,
    orderWork,
    dispatchRisks,
    warehouseWork,
  ] = await Promise.all([
    one<{ n: number }>(
      env.DB,
      "SELECT COUNT(*) AS n FROM assignments WHERE scheduled_date = ? AND status NOT IN ('completed','cancelled')",
      today,
    ),
    one<{ n: number }>(
      env.DB,
      "SELECT COUNT(*) AS n FROM assets WHERE current_status IN ('rented','delivered','out_for_delivery') AND deleted_at IS NULL",
    ),
    one<{ n: number }>(
      env.DB,
      "SELECT COUNT(*) AS n FROM agreements WHERE status IN ('sent','viewed') AND expires_at >= ?",
      new Date().toISOString(),
    ),
    one<{ cents: number }>(
      env.DB,
      "SELECT COALESCE(SUM(balance_due_cents), 0) AS cents FROM invoices WHERE status IN ('finalized','sent','partially_paid','overdue')",
    ),
    q<{
      id: string;
      assignment_number: string;
      assignment_type: string;
      scheduled_date: string;
      window_start: string | null;
      window_end: string | null;
      status: string;
      order_number: string | null;
      customer_name: string | null;
    }>(
      env.DB,
      `SELECT a.id, a.assignment_number, a.assignment_type, a.scheduled_date, a.window_start, a.window_end, a.status, o.order_number, COALESCE(c.business_name, trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS customer_name FROM assignments a LEFT JOIN orders o ON o.id = a.order_id LEFT JOIN customers c ON c.id = o.customer_id WHERE a.scheduled_date = ? ORDER BY a.window_start, a.route_order LIMIT 20`,
      today,
    ),
    q<{
      id: string;
      invoice_number: string;
      customer_name: string;
      balance_due_cents: number;
      due_date: string | null;
    }>(
      env.DB,
      `SELECT i.id,i.invoice_number,COALESCE(c.business_name,trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) customer_name,i.balance_due_cents,i.due_date FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.status IN ('finalized','sent','partially_paid','overdue') AND i.balance_due_cents>0 ORDER BY CASE WHEN i.due_date < date('now') THEN 0 ELSE 1 END,i.due_date LIMIT 10`,
    ),
    q<{
      id: string;
      asset_number: string;
      asset_type: string;
      current_status: string;
    }>(
      env.DB,
      `SELECT id,asset_number,asset_type,current_status FROM assets WHERE deleted_at IS NULL AND current_status IN ('dirty_return','inspection_required','repair_required','quarantine','missing','damaged') ORDER BY last_scan_at LIMIT 12`,
    ),
    q<{
      id: string;
      order_number: string;
      customer_name: string;
      created_at: string;
    }>(
      env.DB,
      `SELECT o.id,o.order_number,COALESCE(c.business_name,trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) customer_name,cr.created_at FROM cancellation_records cr JOIN orders o ON o.id=cr.order_id JOIN customers c ON c.id=o.customer_id ORDER BY cr.created_at DESC LIMIT 8`,
    ),
    q<{
      id: string;
      order_number: string;
      order_status: string;
      scheduled_delivery_date: string | null;
      scheduled_pickup_date: string | null;
      customer_name: string;
      assigned_assets: number;
      required_assets: number;
    }>(
      env.DB,
      `SELECT
        o.id, o.order_number, o.order_status, o.scheduled_delivery_date, o.scheduled_pickup_date,
        COALESCE(c.business_name, trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS customer_name,
        COUNT(DISTINCT oa.asset_id) AS assigned_assets,
        COALESCE(p.tote_quantity, 0) + COALESCE(p.dolly_quantity, 0) AS required_assets
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN rental_packages p ON p.id = o.package_id
      LEFT JOIN order_assets oa ON oa.order_id = o.id AND oa.warehouse_return_at IS NULL
      WHERE o.deleted_at IS NULL
        AND o.order_status IN ('confirmed','equipment_reserved','staged','delivery_assigned','out_for_delivery','delivered','active_rental','pickup_scheduled','pickup_assigned')
        AND (o.scheduled_delivery_date <= date('now', '+2 day') OR o.scheduled_pickup_date <= date('now', '+2 day'))
      GROUP BY o.id
      ORDER BY
        CASE
          WHEN o.scheduled_delivery_date <= date('now') THEN 0
          WHEN o.scheduled_pickup_date <= date('now') THEN 1
          ELSE 2
        END,
        COALESCE(o.scheduled_delivery_date, o.scheduled_pickup_date)
      LIMIT 20`,
    ),
    q<{
      id: string;
      assignment_number: string;
      assignment_type: string;
      scheduled_date: string;
      window_start: string | null;
      customer_name: string | null;
      order_id: string | null;
      missing_driver: number;
      missing_vehicle: number;
    }>(
      env.DB,
      `SELECT a.id, a.assignment_number, a.assignment_type, a.scheduled_date, a.window_start,
        COALESCE(c.business_name, trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS customer_name,
        a.order_id,
        CASE WHEN a.assigned_employee_id IS NULL THEN 1 ELSE 0 END AS missing_driver,
        CASE WHEN a.vehicle_id IS NULL THEN 1 ELSE 0 END AS missing_vehicle
      FROM assignments a
      LEFT JOIN orders o ON o.id = a.order_id
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE a.scheduled_date BETWEEN date('now') AND date('now', '+1 day')
        AND a.status NOT IN ('completed','cancelled')
        AND (a.assigned_employee_id IS NULL OR a.vehicle_id IS NULL)
      ORDER BY a.scheduled_date, a.window_start
      LIMIT 12`,
    ),
    q<{
      id: string;
      asset_number: string;
      asset_type: string;
      current_status: string;
      last_scan_at: string | null;
    }>(
      env.DB,
      `SELECT id, asset_number, asset_type, current_status, last_scan_at
      FROM assets
      WHERE deleted_at IS NULL
        AND current_status IN ('dirty_return','inspection_required','repair_required','quarantine')
      ORDER BY CASE WHEN last_scan_at IS NULL THEN 0 ELSE 1 END, last_scan_at
      LIMIT 12`,
    ),
  ]);
  return Response.json({
    date: today,
    metrics: {
      stops: stops?.n ?? 0,
      totesInField: inventory?.n ?? 0,
      agreementsAwaiting: attention?.n ?? 0,
      openBalanceCents: balance?.cents ?? 0,
    },
    assignments,
    overdueInvoices,
    assetAttention,
    cancellations,
    orderWork,
    dispatchRisks,
    warehouseWork,
  });
});
