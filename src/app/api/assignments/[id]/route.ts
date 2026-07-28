import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { nowIso, one, run } from "@/lib/db";
import {
  NotFoundError,
  ValidationError,
  withErrorHandling,
} from "@/lib/errors";
import { jsonBody, optionalString } from "@/lib/http";
const sql = `SELECT a.*,o.order_number,COALESCE(c.business_name,trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) customer_name FROM assignments a LEFT JOIN orders o ON o.id=a.order_id LEFT JOIN customers c ON c.id=o.customer_id WHERE a.id=?`;
export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "assignments.view", "dispatch.view");
    const env = await getEnv(),
      id = (await context.params).id,
      assignment = await one(env.DB, sql, id);
    if (!assignment) throw new NotFoundError("Assignment not found");
    return Response.json({ assignment });
  },
);
export const PATCH = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "assignments.manage", "dispatch.manage");
    const env = await getEnv(),
      id = (await context.params).id,
      assignment = await one(env.DB, sql, id);
    if (!assignment) throw new NotFoundError("Assignment not found");
    const body = await jsonBody<Record<string, unknown>>(request);
    const status = optionalString(body.status, "status", 30),
      scheduledDate = optionalString(body.scheduledDate, "scheduledDate", 20),
      windowStart = optionalString(body.windowStart, "windowStart", 10),
      windowEnd = optionalString(body.windowEnd, "windowEnd", 10),
      notes = optionalString(body.notes, "notes", 4000);
    if (
      status &&
      !new Set([
        "scheduled",
        "en_route",
        "arrived",
        "in_progress",
        "completed",
        "failed",
        "cancelled",
      ]).has(status)
    )
      throw new ValidationError("Invalid assignment status");
    await run(
      env.DB,
      "UPDATE assignments SET status=COALESCE(?,status),scheduled_date=COALESCE(?,scheduled_date),window_start=?,window_end=?,completion_notes=?,updated_at=?,version=version+1 WHERE id=?",
      status,
      scheduledDate,
      windowStart,
      windowEnd,
      notes,
      nowIso(),
      id,
    );
    await audit(env.DB, {
      actorUserId: ctx.user.id,
      action: "assignment.updated",
      entityType: "assignment",
      entityId: id,
      detail: { status, scheduledDate },
      ip: ctx.ip,
    });
    return Response.json({ assignment: await one(env.DB, sql, id) });
  },
);
