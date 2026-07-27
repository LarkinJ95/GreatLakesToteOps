import type { Env } from "./cloudflare";
import { id, nowIso, one, run, type Db } from "./db";
import type { JobType } from "./types";

export interface JobEnvelope {
  schemaVersion: 1;
  idempotencyKey: string;
  jobType: JobType;
  entityId: string | null;
  requestedBy: string | null;
  requestedAt: string;
  attempt: number;
  payload: Record<string, unknown>;
}

/**
 * Enqueue a background job: records it in job_records (unique idempotency key) and sends it
 * to JOB_QUEUE. If the same idempotency key already exists, this is a no-op (retry-safe).
 * When no queue binding exists (bare `next dev`), the consumer is invoked inline so local
 * development still produces real documents.
 */
export async function enqueueJob(
  env: Pick<Env, "DB"> & Partial<Env>,
  jobType: JobType,
  opts: {
    entityId?: string | null;
    idempotencyKey?: string;
    payload?: Record<string, unknown>;
    requestedBy?: string | null;
  } = {},
): Promise<{ jobId: string; idempotencyKey: string; duplicate: boolean }> {
  const db = env.DB;
  const idempotencyKey = opts.idempotencyKey ?? `${jobType}:${opts.entityId ?? id("ent")}:${crypto.randomUUID()}`;
  const jobId = id("job");

  const existing = await one<{ id: string }>(db, `SELECT id FROM job_records WHERE idempotency_key = ?`, idempotencyKey);
  if (existing) return { jobId: existing.id, idempotencyKey, duplicate: true };

  await run(
    db,
    `INSERT INTO job_records (id, idempotency_key, job_type, entity_id, status, requested_by, requested_at, payload_json)
     VALUES (?, ?, ?, ?, 'queued', ?, ?, ?)`,
    jobId, idempotencyKey, jobType, opts.entityId ?? null,
    opts.requestedBy ?? null, nowIso(), JSON.stringify(opts.payload ?? {}),
  );

  const envelope: JobEnvelope = {
    schemaVersion: 1, idempotencyKey, jobType, entityId: opts.entityId ?? null,
    requestedBy: opts.requestedBy ?? null, requestedAt: nowIso(), attempt: 1,
    payload: opts.payload ?? {},
  };

  if (env.JOB_QUEUE) {
    await env.JOB_QUEUE.send(envelope);
  } else {
    // Local fallback: run the same consumer code inline.
    const { processJob } = await import("./jobConsumer");
    await processJob(env as Env, envelope);
  }
  return { jobId, idempotencyKey, duplicate: false };
}

export async function markJob(db: Db, idempotencyKey: string, status: string, error?: string | null): Promise<void> {
  await run(
    db,
    `UPDATE job_records SET status = ?, attempts = attempts + 1, last_error = ?,
       completed_at = CASE WHEN ? IN ('completed') THEN ? ELSE completed_at END
     WHERE idempotency_key = ?`,
    status, error ?? null, status, nowIso(), idempotencyKey,
  );
}
