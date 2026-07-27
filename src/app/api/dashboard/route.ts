import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { one, q } from "@/lib/db";
import { withErrorHandling } from "@/lib/errors";
export const GET = withErrorHandling(async (request) => {
  const ctx = await requireUser(request); requirePermission(ctx, "dashboard.view"); const env = await getEnv();
  const today = new Date().toISOString().slice(0, 10);
  const [stops, inventory, attention, balance, assignments] = await Promise.all([
    one<{ n: number }>(env.DB, "SELECT COUNT(*) AS n FROM assignments WHERE scheduled_date = ? AND status NOT IN ('completed','cancelled')", today),
    one<{ n: number }>(env.DB, "SELECT COUNT(*) AS n FROM assets WHERE current_status IN ('rented','delivered','out_for_delivery') AND deleted_at IS NULL"),
    one<{ n: number }>(env.DB, "SELECT COUNT(*) AS n FROM agreements WHERE status IN ('sent','viewed') AND expires_at >= ?", new Date().toISOString()),
    one<{ cents: number }>(env.DB, "SELECT COALESCE(SUM(balance_due_cents), 0) AS cents FROM invoices WHERE status IN ('finalized','sent','partially_paid','overdue')"),
    q<{ id: string; assignment_number: string; assignment_type: string; scheduled_date: string; window_start: string | null; window_end: string | null; status: string; order_number: string | null; customer_name: string | null }>(env.DB, `SELECT a.id, a.assignment_number, a.assignment_type, a.scheduled_date, a.window_start, a.window_end, a.status, o.order_number, COALESCE(c.business_name, trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS customer_name FROM assignments a LEFT JOIN orders o ON o.id = a.order_id LEFT JOIN customers c ON c.id = o.customer_id WHERE a.scheduled_date = ? ORDER BY a.window_start, a.route_order LIMIT 20`, today),
  ]);
  return Response.json({ date: today, metrics: { stops: stops?.n ?? 0, totesInField: inventory?.n ?? 0, agreementsAwaiting: attention?.n ?? 0, openBalanceCents: balance?.cents ?? 0 }, assignments });
});
