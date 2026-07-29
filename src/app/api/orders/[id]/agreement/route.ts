import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { withErrorHandling } from "@/lib/errors";
import { generateAgreement } from "@/lib/services/agreementService";

/** Generate an immutable, customer-visible contract and its unsigned PDF. */
export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "orders.edit", "agreements.manage_templates");
    const env = await getEnv();
    const result = await generateAgreement(env, ctx, (await context.params).id);
    return Response.json(result, { status: result.reused ? 200 : 201 });
  },
);
