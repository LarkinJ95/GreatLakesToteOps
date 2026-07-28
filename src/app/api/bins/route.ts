import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { id, nowIso, q, run } from "@/lib/db";
import { ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString, requiredString } from "@/lib/http";

export const GET = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "assets.view");
  const env = await getEnv();
  const bins = await q(
    env.DB,
    `SELECT b.*,l.name location_name,l.code location_code,ba.id assignment_id,ba.customer_id,ba.order_id,ba.purpose,COALESCE(o.order_number,'') order_number,COALESCE(c.business_name,trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) customer_name FROM warehouse_bins b JOIN storage_locations l ON l.id=b.storage_location_id LEFT JOIN bin_assignments ba ON ba.bin_id=b.id AND ba.status='active' LEFT JOIN orders o ON o.id=ba.order_id LEFT JOIN customers c ON c.id=ba.customer_id WHERE b.active=1 ORDER BY l.code,b.code`,
  );
  const locations = await q(
    env.DB,
    "SELECT id,name,code FROM storage_locations WHERE active=1 ORDER BY code",
  );
  return Response.json({ bins, locations });
});
export const POST = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "assets.manage");
  const env = await getEnv(),
    body = await jsonBody<Record<string, unknown>>(request);
  const storageLocationId = requiredString(
      body.storageLocationId,
      "storageLocationId",
      100,
    ),
    code = requiredString(body.code, "bin code", 40).toUpperCase(),
    binType = optionalString(body.binType, "bin type", 30) ?? "general";
  if (
    !new Set([
      "general",
      "staging",
      "customer_hold",
      "returns",
      "repair",
      "quarantine",
    ]).has(binType)
  )
    throw new ValidationError("Unsupported bin type");
  const binId = id("bin");
  await run(
    env.DB,
    "INSERT INTO warehouse_bins (id,storage_location_id,code,label,bin_type,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
    binId,
    storageLocationId,
    code,
    optionalString(body.label, "label", 100),
    binType,
    optionalString(body.notes, "notes", 1000),
    nowIso(),
    nowIso(),
  );
  await audit(env.DB, {
    actorUserId: ctx.user.id,
    action: "bin.created",
    entityType: "bin",
    entityId: binId,
    detail: { code },
    ip: ctx.ip,
  });
  return Response.json({ id: binId }, { status: 201 });
});
export const PATCH = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "assets.manage");
  const env = await getEnv(),
    body = await jsonBody<Record<string, unknown>>(request),
    binId = requiredString(body.binId, "binId", 100),
    customerId = optionalString(body.customerId, "customerId", 100),
    orderId = optionalString(body.orderId, "orderId", 100);
  if (!customerId && !orderId)
    throw new ValidationError("Choose a customer or order for this bin");
  await run(
    env.DB,
    "UPDATE bin_assignments SET status='released',released_at=? WHERE bin_id=? AND status='active'",
    nowIso(),
    binId,
  );
  const assignmentId = id("bna");
  await run(
    env.DB,
    "INSERT INTO bin_assignments (id,bin_id,customer_id,order_id,status,purpose,notes,assigned_by,assigned_at) VALUES (?,?,?,?, 'active',?,?,?,?)",
    assignmentId,
    binId,
    customerId,
    orderId,
    optionalString(body.purpose, "purpose", 100) ?? "hold",
    optionalString(body.notes, "notes", 1000),
    ctx.user.id,
    nowIso(),
  );
  await audit(env.DB, {
    actorUserId: ctx.user.id,
    action: "bin.assigned",
    entityType: "bin",
    entityId: binId,
    detail: { customerId, orderId },
    ip: ctx.ip,
  });
  return Response.json({ id: assignmentId });
});

/** Archive an empty bin. Bins with active holds must be released first. */
export const DELETE = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "assets.manage");
  const env = await getEnv(), body = await jsonBody<Record<string, unknown>>(request);
  const binId = requiredString(body.binId, "binId", 100);
  const activeAssignment = await q<{ id: string }>(
    env.DB,
    "SELECT id FROM bin_assignments WHERE bin_id=? AND status='active' LIMIT 1",
    binId,
  );
  if (activeAssignment.length)
    throw new ValidationError("Release this bin's active customer or order hold before deleting it");
  const result = await run(
    env.DB,
    "UPDATE warehouse_bins SET active=0,updated_at=? WHERE id=? AND active=1",
    nowIso(),
    binId,
  );
  if ((result.meta.changes ?? 0) === 0) throw new ValidationError("Bin was not found or is already deleted");
  await audit(env.DB, {
    actorUserId: ctx.user.id,
    action: "bin.deleted",
    entityType: "bin",
    entityId: binId,
    detail: {},
    ip: ctx.ip,
  });
  return Response.json({ ok: true });
});
