import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { likePattern, q } from "@/lib/db";
import { withErrorHandling } from "@/lib/errors";
export const GET = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "dashboard.view");
  const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (term.length < 2) return Response.json({ results: [] });
  const env = await getEnv(),
    p = likePattern(term);
  const [customers, orders, invoices, assets, assignments, agreements] =
    await Promise.all([
      q<{ id: string; label: string; detail: string }>(
        env.DB,
        "SELECT id,COALESCE(business_name,trim(COALESCE(first_name,'') || ' ' || COALESCE(last_name,''))) label,customer_number detail FROM customers WHERE deleted_at IS NULL AND (customer_number LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR first_name LIKE ? ESCAPE '\\' OR last_name LIKE ? ESCAPE '\\' OR business_name LIKE ? ESCAPE '\\') LIMIT 6",
        p,
        p,
        p,
        p,
        p,
      ),
      q<{ id: string; label: string; detail: string }>(
        env.DB,
        "SELECT id,order_number label,order_status detail FROM orders WHERE deleted_at IS NULL AND order_number LIKE ? ESCAPE '\\' LIMIT 6",
        p,
      ),
      q<{ id: string; label: string; detail: string }>(
        env.DB,
        "SELECT id,invoice_number label,status detail FROM invoices WHERE invoice_number LIKE ? ESCAPE '\\' LIMIT 6",
        p,
      ),
      q<{ id: string; label: string; detail: string }>(
        env.DB,
        "SELECT id,asset_number label,current_status detail FROM assets WHERE deleted_at IS NULL AND (asset_number LIKE ? ESCAPE '\\' OR qr_code_value LIKE ? ESCAPE '\\') LIMIT 6",
        p,
        p,
      ),
      q<{ id: string; label: string; detail: string }>(
        env.DB,
        "SELECT id,assignment_number label,status detail FROM assignments WHERE assignment_number LIKE ? ESCAPE '\\' LIMIT 6",
        p,
      ),
      q<{ id: string; label: string; detail: string }>(
        env.DB,
        "SELECT id,agreement_number label,status detail FROM agreements WHERE agreement_number LIKE ? ESCAPE '\\' LIMIT 6",
        p,
      ),
    ]);
  const group = (
    type: string,
    path: string,
    rows: { id: string; label: string; detail: string }[],
  ) =>
    rows.map((r) => ({
      type,
      label: r.label,
      detail: r.detail,
      href: `${path}/${r.id}`,
    }));
  return Response.json({
    results: [
      ...group("Customer", "/customers", customers),
      ...group("Order", "/orders", orders),
      ...group("Invoice", "/invoices", invoices),
      ...group("Asset", "/inventory", assets),
      ...group("Dispatch", "/dispatch", assignments),
      ...group("Agreement", "/agreements", agreements),
    ],
  });
});
