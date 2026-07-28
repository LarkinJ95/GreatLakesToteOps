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
    `SELECT b.*,l.name location_name,l.code location_code,ba.id assignment_id,ba.customer_id,ba.order_id,ba.purpose,COALESCE(o.order_number,'') order_number,COALESCE(c.business_name,trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) customer_name,(SELECT COUNT(*) FROM asset_bin_assignments aba WHERE aba.bin_id=b.id AND aba.status='active') asset_count FROM warehouse_bins b JOIN storage_locations l ON l.id=b.storage_location_id LEFT JOIN bin_assignments ba ON ba.bin_id=b.id AND ba.status='active' LEFT JOIN orders o ON o.id=ba.order_id LEFT JOIN customers c ON c.id=ba.customer_id WHERE b.active=1 ORDER BY l.code,b.code`,
  );
  const locations = await q(
    env.DB,
    "SELECT id,name,code FROM storage_locations WHERE active=1 ORDER BY code",
  );
  const [assets, assetAssignments] = await Promise.all([
    q(env.DB, "SELECT id,asset_number,asset_type,current_status FROM assets WHERE deleted_at IS NULL AND current_status NOT IN ('retired') ORDER BY asset_number LIMIT 500"),
    q(env.DB, "SELECT aba.id,aba.asset_id,aba.bin_id,aba.notes,aba.assigned_at,a.asset_number,a.asset_type,a.current_status,b.code bin_code,l.code location_code FROM asset_bin_assignments aba JOIN assets a ON a.id=aba.asset_id JOIN warehouse_bins b ON b.id=aba.bin_id JOIN storage_locations l ON l.id=b.storage_location_id WHERE aba.status='active' ORDER BY l.code,b.code,a.asset_number"),
  ]);
  return Response.json({ bins, locations, assets, assetAssignments });
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
    requestedCustomerId = optionalString(body.customerId, "customerId", 100),
    orderId = optionalString(body.orderId, "orderId", 100);
  const assetId = optionalString(body.assetId, "assetId", 100);
  if (assetId) {
    const asset = await q<{ id: string }>(env.DB, "SELECT id FROM assets WHERE id=? AND deleted_at IS NULL", assetId);
    const bin = await q<{ id: string }>(env.DB, "SELECT id FROM warehouse_bins WHERE id=? AND active=1", binId);
    if (!asset[0] || !bin[0]) throw new ValidationError("The selected equipment or bin was not found");
    const now = nowIso();
    await run(env.DB, "UPDATE asset_bin_assignments SET status='released',released_at=? WHERE asset_id=? AND status='active'", now, assetId);
    const assignmentId = id("aba");
    await run(env.DB, "INSERT INTO asset_bin_assignments (id,asset_id,bin_id,status,notes,assigned_by,assigned_at) VALUES (?,?,?,'active',?,?,?)", assignmentId, assetId, binId, optionalString(body.notes, "notes", 1000), ctx.user.id, now);
    await audit(env.DB, { actorUserId: ctx.user.id, action: "asset.bin_assigned", entityType: "asset", entityId: assetId, detail: { binId }, ip: ctx.ip });
    return Response.json({ id: assignmentId });
  }
  if (!requestedCustomerId && !orderId)
    throw new ValidationError("Choose a customer or order for this bin");
  // An order hold always belongs to that order's customer. Store both links so
  // the customer profile and the order workspace show the same physical bin.
  let customerId = requestedCustomerId;
  if (orderId) {
    const order = await q<{ customer_id: string }>(
      env.DB, "SELECT customer_id FROM orders WHERE id=? AND deleted_at IS NULL", orderId);
    if (!order[0]) throw new ValidationError("The selected order was not found");
    if (customerId && customerId !== order[0].customer_id)
      throw new ValidationError("The selected customer does not own this order");
    customerId = order[0].customer_id;
  }
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
  const activeAssets = await q<{ id: string }>(env.DB, "SELECT id FROM asset_bin_assignments WHERE bin_id=? AND status='active' LIMIT 1", binId);
  if (activeAssets.length)
    throw new ValidationError("Move equipment out of this bin before deleting it");
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
