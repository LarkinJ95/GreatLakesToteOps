import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { UnauthorizedError, withErrorHandling } from "@/lib/errors";
import { jsonBody, requiredString } from "@/lib/http";
import { acceptAgreement } from "@/lib/services/agreementService";

/** Customer portal electronic acceptance. The resulting signed PDF is immutable. */
export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    if (!ctx.portalCustomerId || ctx.user.id !== "usr_customer_portal")
      throw new UnauthorizedError("Customer portal sign-in required");
    const body = await jsonBody<{ typedName?: unknown; accepted?: unknown }>(request);
    if (body.accepted !== true) throw new UnauthorizedError("Agreement acceptance is required");
    const env = await getEnv();
    return Response.json(await acceptAgreement(env, ctx, (await context.params).id, requiredString(body.typedName, "Typed legal name", 200)));
  },
);
