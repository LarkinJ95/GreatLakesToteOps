import { clearSessionCookieHeader, requireUser, revokeSession } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { withErrorHandling } from "@/lib/errors";
export const runtime = "edge";
export const POST = withErrorHandling(async (request) => { const ctx = await requireUser(request); const env = await getEnv(); await revokeSession(env.DB, ctx.sessionId); const response = Response.json({ ok: true }); response.headers.set("Set-Cookie", clearSessionCookieHeader()); return response; });
