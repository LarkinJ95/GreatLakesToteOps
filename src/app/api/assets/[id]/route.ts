import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { nowIso, one, q, run } from "@/lib/db";
import { NotFoundError, ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString } from "@/lib/http";

const assetSql =
  "SELECT a.*, o.order_number, COALESCE(c.business_name, trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS customer_name FROM assets a LEFT JOIN orders o ON o.id=a.current_order_id LEFT JOIN customers c ON c.id=a.current_customer_id WHERE a.id=? AND a.deleted_at IS NULL";

export const GET = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "assets.view");
  const env = await getEnv();
  const id = new URL(request.url).pathname.split("/").pop()!;
  const asset = await one(env.DB, assetSql, id);
  if (!asset) throw new NotFoundError("Asset not found");
  const [history, scans, allocations] = await Promise.all([
    q(
      env.DB,
      "SELECT * FROM asset_status_history WHERE asset_id=? ORDER BY changed_at DESC LIMIT 100",
      id,
    ),
    q(
      env.DB,
      "SELECT * FROM asset_scan_events WHERE asset_id=? ORDER BY server_timestamp DESC LIMIT 100",
      id,
    ),
    q(
      env.DB,
      "SELECT oa.*,o.order_number FROM order_assets oa JOIN orders o ON o.id=oa.order_id WHERE oa.asset_id=? ORDER BY oa.assigned_at DESC LIMIT 100",
      id,
    ),
  ]);
  return Response.json({ asset, history, scans, allocations });
});

export const PATCH = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "assets.manage");
  const env = await getEnv();
  const id = new URL(request.url).pathname.split("/").pop()!;
  const asset = await one(env.DB, assetSql, id);
  if (!asset) throw new NotFoundError("Asset not found");
  const body = await jsonBody<Record<string, unknown>>(request);
  const fields: [string, unknown][] = [
    ["manufacturer", optionalString(body.manufacturer, "manufacturer", 100)],
    ["model", optionalString(body.model, "model", 100)],
    ["color", optionalString(body.color, "color", 50)],
    ["notes", optionalString(body.notes, "notes", 4000)],
  ];
  const changed = fields.filter(([, v]) => v !== undefined);
  if (!changed.length) return Response.json({ asset });
  await run(
    env.DB,
    `UPDATE assets SET ${changed.map(([k]) => `${k}=?`).join(", ")},updated_at=?,version=version+1 WHERE id=?`,
    ...changed.map(([, v]) => v),
    nowIso(),
    id,
  );
  await audit(env.DB, {
    actorUserId: ctx.user.id,
    action: "asset.updated",
    entityType: "asset",
    entityId: id,
    detail: { fields: changed.map(([k]) => k) },
    ip: ctx.ip,
  });
  return Response.json({ asset: await one(env.DB, assetSql, id) });
});

/** Soft-delete only never-used new assets; operational history must remain auditable. */
export const DELETE = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "assets.manage");
  const env = await getEnv();
  const id = new URL(request.url).pathname.split("/").pop()!;
  const asset = await one<{ id: string; asset_number: string; current_status: string }>(
    env.DB,
    "SELECT id,asset_number,current_status FROM assets WHERE id=? AND deleted_at IS NULL",
    id,
  );
  if (!asset) throw new NotFoundError("Asset not found");
  const used = await one<{ n: number }>(
    env.DB,
    "SELECT (SELECT COUNT(*) FROM order_assets WHERE asset_id=?) + (SELECT COUNT(*) FROM asset_scan_events WHERE asset_id=?) AS n",
    id,
    id,
  );
  if (asset.current_status !== "new" || (used?.n ?? 0) > 0)
    throw new ValidationError(
      "Only unused new assets can be deleted. Retire equipment with operational history instead.",
    );
  await run(
    env.DB,
    "UPDATE assets SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?",
    nowIso(),
    nowIso(),
    id,
  );
  await audit(env.DB, {
    actorUserId: ctx.user.id,
    action: "asset.deleted",
    entityType: "asset",
    entityId: id,
    detail: { assetNumber: asset.asset_number },
    ip: ctx.ip,
  });
  return Response.json({ ok: true });
});
