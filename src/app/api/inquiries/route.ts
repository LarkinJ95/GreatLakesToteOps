import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { q } from "@/lib/db";
import { nowIso, run } from "@/lib/db";
import { ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, requiredString } from "@/lib/http";
export const GET = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "customers.view", "orders.create");
  const env = await getEnv();
  const inquiries = await q(
    env.DB,
    "SELECT * FROM public_inquiries ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, created_at DESC LIMIT 100",
  );
  return Response.json({ inquiries });
});
export const PATCH = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "customers.edit", "orders.create");
  const env = await getEnv(),
    body = await jsonBody<Record<string, unknown>>(request),
    id = requiredString(body.id, "id", 100),
    status = requiredString(body.status, "status", 20);
  if (!new Set(["new", "reviewing", "contacted", "closed"]).has(status))
    throw new ValidationError("Invalid inquiry status");
  await run(
    env.DB,
    "UPDATE public_inquiries SET status=?,updated_at=? WHERE id=?",
    status,
    nowIso(),
    id,
  );
  return Response.json({ ok: true });
});
