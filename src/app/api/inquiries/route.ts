import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { q } from "@/lib/db";
import { withErrorHandling } from "@/lib/errors";
export const GET = withErrorHandling(async (request) => { const ctx = await requireUser(request); requirePermission(ctx, "customers.view", "orders.create"); const env = await getEnv(); const inquiries = await q(env.DB, "SELECT * FROM public_inquiries ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, created_at DESC LIMIT 100"); return Response.json({ inquiries }); });
