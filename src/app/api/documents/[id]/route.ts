import { requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { getDocument, documentResponse } from "@/lib/documents";
import { ForbiddenError, withErrorHandling } from "@/lib/errors";
import { one } from "@/lib/db";

/** Secure inline/download endpoint for staff and the owning portal customer. */
export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    const env = await getEnv();
    const document = await getDocument(env.DB, (await context.params).id);
    if (ctx.portalCustomerId) {
      if (document.related_entity_type !== "agreement") throw new ForbiddenError("Document is not available in the portal");
      const agreement = await one<{ customer_id: string }>(env.DB, "SELECT customer_id FROM agreements WHERE id=?", document.related_entity_id);
      if (!agreement || agreement.customer_id !== ctx.portalCustomerId) throw new ForbiddenError("Document belongs to a different customer");
    } else if (!ctx.permissions.has("documents.view") && !ctx.permissions.has("documents.download")) {
      throw new ForbiddenError();
    }
    const download = new URL(request.url).searchParams.get("download") === "1";
    return documentResponse(env, document, download ? "attachment" : "inline");
  },
);
