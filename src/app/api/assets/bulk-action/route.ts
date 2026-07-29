import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { q } from "@/lib/db";
import { ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, requiredString } from "@/lib/http";
import { processScan } from "@/lib/services/assetService";

const actions = {
  complete_cleaning: { status: "cleaning", mode: "clean_complete" as const, label: "Marked clean" },
  pass_inspection: { status: "inspection_required", mode: "inspect" as const, label: "Passed inspection" },
} as const;

/** Bulk warehouse steps use the same scan state machine as individual equipment actions. */
export const POST = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "assets.manage");
  const body = await jsonBody<Record<string, unknown>>(request);
  const actionName = requiredString(body.action, "action", 40) as keyof typeof actions;
  const action = actions[actionName];
  if (!action) throw new ValidationError("Unsupported inventory bulk action");
  const env = await getEnv();
  const assets = await q<{ id: string; asset_number: string; qr_code_value: string }>(env.DB,
    "SELECT id,asset_number,qr_code_value FROM assets WHERE deleted_at IS NULL AND current_status=? ORDER BY asset_number", action.status);
  const timestamp = new Date().toISOString();
  const completed: string[] = [], failed: { assetNumber: string; message: string }[] = [];
  for (const asset of assets) {
    const result = await processScan(env.DB, {
      idempotencyKey: `inventory-bulk-${actionName}:${asset.id}:${timestamp}`,
      assetIdentifier: asset.qr_code_value,
      mode: action.mode,
      ...(action.mode === "inspect" ? { outcome: "pass" } : {}),
      userId: ctx.user.id,
      deviceId: "staff-inventory-bulk-action",
      deviceTimestamp: timestamp,
      notes: `${action.label} from Inventory desk`,
    });
    if (result.ok) completed.push(asset.asset_number);
    else failed.push({ assetNumber: asset.asset_number, message: result.message ?? "Action was not accepted" });
  }
  await audit(env.DB, { actorUserId: ctx.user.id, action: `assets.bulk_${actionName}`, entityType: "asset", entityId: null, detail: { count: assets.length, completed, failed }, ip: ctx.ip });
  return Response.json({ label: action.label, count: assets.length, completed, failed });
});
