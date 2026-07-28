import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { one, q } from "@/lib/db";
import { withErrorHandling } from "@/lib/errors";

const dateRange = (request: Request) => {
  const url = new URL(request.url);
  const days = Math.min(365, Math.max(7, Number(url.searchParams.get("days")) || 30));
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { days, start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
};

export const GET = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "dashboard.view", "reports.view");
  const env = await getEnv();
  const { days, start, end } = dateRange(request);
  const [orders, completed, cancellations, invoices, payments, assets, daily] = await Promise.all([
    one<{ n: number; total: number }>(env.DB, "SELECT COUNT(*) n,COALESCE(SUM(total_cents),0) total FROM orders WHERE deleted_at IS NULL AND date(created_at) BETWEEN ? AND ?", start, end),
    one<{ n: number }>(env.DB, "SELECT COUNT(*) n FROM orders WHERE deleted_at IS NULL AND order_status IN ('completed','closed') AND date(updated_at) BETWEEN ? AND ?", start, end),
    one<{ n: number; fees: number; refunds: number }>(env.DB, "SELECT COUNT(*) n,COALESCE(SUM(fee_cents),0) fees,COALESCE(SUM(refund_cents),0) refunds FROM cancellation_records WHERE date(created_at) BETWEEN ? AND ?", start, end),
    one<{ billed: number; open: number }>(env.DB, "SELECT COALESCE(SUM(total_cents),0) billed,COALESCE(SUM(balance_due_cents),0) open FROM invoices WHERE status NOT IN ('draft','voided') AND date(created_at) BETWEEN ? AND ?", start, end),
    one<{ collected: number }>(env.DB, "SELECT COALESCE(SUM(amount_cents),0) collected FROM payments WHERE status IN ('succeeded','partially_refunded') AND date(received_at) BETWEEN ? AND ?", start, end),
    q<{ status: string; count: number }>(env.DB, "SELECT current_status status,COUNT(*) count FROM assets WHERE deleted_at IS NULL GROUP BY current_status ORDER BY count DESC"),
    q<{ day: string; orders: number; billed: number; collected: number }>(env.DB, `SELECT d.day, COALESCE(o.orders,0) orders, COALESCE(i.billed,0) billed, COALESCE(p.collected,0) collected FROM (SELECT date(created_at) day FROM orders WHERE date(created_at) BETWEEN ? AND ? GROUP BY date(created_at)) d LEFT JOIN (SELECT date(created_at) day,COUNT(*) orders FROM orders WHERE deleted_at IS NULL AND date(created_at) BETWEEN ? AND ? GROUP BY date(created_at)) o ON o.day=d.day LEFT JOIN (SELECT date(created_at) day,SUM(total_cents) billed FROM invoices WHERE status NOT IN ('draft','voided') AND date(created_at) BETWEEN ? AND ? GROUP BY date(created_at)) i ON i.day=d.day LEFT JOIN (SELECT date(received_at) day,SUM(amount_cents) collected FROM payments WHERE status IN ('succeeded','partially_refunded') AND date(received_at) BETWEEN ? AND ? GROUP BY date(received_at)) p ON p.day=d.day ORDER BY d.day`, start, end, start, end, start, end, start, end),
  ]);
  return Response.json({ range: { days, start, end }, metrics: {
    orders: orders?.n ?? 0, bookedCents: orders?.total ?? 0, completed: completed?.n ?? 0,
    cancellations: cancellations?.n ?? 0, cancellationFeesCents: cancellations?.fees ?? 0,
    refundsCents: cancellations?.refunds ?? 0, billedCents: invoices?.billed ?? 0,
    openBalanceCents: invoices?.open ?? 0, collectedCents: payments?.collected ?? 0,
  }, assets, daily });
});
