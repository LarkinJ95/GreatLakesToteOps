import { id, nowIso, run, type Db } from "./db";

export interface AuditEntry {
  actorUserId?: string | null;
  actorLabel?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  detail?: Record<string, unknown> | null;
  ip?: string | null;
}

/** Append an immutable audit record. System actions pass actorUserId = null. */
export async function audit(db: Db, entry: AuditEntry): Promise<void> {
  await run(
    db,
    `INSERT INTO audit_logs (id, actor_user_id, actor_label, action, entity_type, entity_id, detail_json, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id("aud"), entry.actorUserId ?? null, entry.actorLabel ?? null, entry.action,
    entry.entityType, entry.entityId ?? null,
    entry.detail ? JSON.stringify(entry.detail) : null, entry.ip ?? null, nowIso(),
  );
}
