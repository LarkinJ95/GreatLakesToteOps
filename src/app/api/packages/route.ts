import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { q } from "@/lib/db";
import { withErrorHandling } from "@/lib/errors";
export const GET = withErrorHandling(async (request) => { const ctx = await requireUser(request); requirePermission(ctx, "orders.create", "pricing.manage"); const env = await getEnv(); return Response.json({ packages: await q(env.DB, "SELECT * FROM rental_packages WHERE active = 1 ORDER BY tote_quantity, name") }); });
