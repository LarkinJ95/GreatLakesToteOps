import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { one } from "@/lib/db";
import { NotFoundError, withErrorHandling } from "@/lib/errors";
export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "agreements.view");
    const env = await getEnv(),
      id = (await context.params).id;
    const agreement = await one(
      env.DB,
      `SELECT a.*,o.order_number,COALESCE(c.business_name,trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) customer_name FROM agreements a JOIN orders o ON o.id=a.order_id JOIN customers c ON c.id=a.customer_id WHERE a.id=?`,
      id,
    );
    if (!agreement) throw new NotFoundError("Agreement not found");
    return Response.json({ agreement });
  },
);
