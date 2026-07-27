import { requireUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/errors";
export const runtime = "edge";
export const GET = withErrorHandling(async (request) => { const ctx = await requireUser(request); return Response.json({ user: { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email, branchId: ctx.user.branch_id }, role: ctx.roleName, permissions: [...ctx.permissions] }); });
