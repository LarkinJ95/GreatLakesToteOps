import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { nowIso, run } from "@/lib/db";
import { ConflictError, withErrorHandling } from "@/lib/errors";
export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(async (request, context) => { const ctx = await requireUser(request); requirePermission(ctx, "invoices.finalize"); const env = await getEnv(), invoiceId = (await context.params).id, now = nowIso(); const result = await run(env.DB, "UPDATE invoices SET status='finalized', finalized_at=?, updated_at=? WHERE id=? AND status='draft'", now, now, invoiceId); if (!(result.meta.changes ?? 0)) throw new ConflictError("Only a draft invoice can be finalized"); await audit(env.DB,{actorUserId:ctx.user.id,action:"invoice.finalized",entityType:"invoice",entityId:invoiceId,ip:ctx.ip}); return Response.json({ ok:true }); });
