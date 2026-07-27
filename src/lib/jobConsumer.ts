import type { Env } from "./cloudflare";
import { one } from "./db";
import { markJob, type JobEnvelope } from "./jobs";

/**
 * Queue-consumer entry point shared by the future Worker queue handler and the
 * local fallback.  Document-producing job handlers are added with their owning
 * modules; this guard keeps retry state idempotent from the first deployment.
 */
export async function processJob(env: Env, job: JobEnvelope): Promise<void> {
  const recorded = await one<{ status: string }>(
    env.DB,
    "SELECT status FROM job_records WHERE idempotency_key = ?",
    job.idempotencyKey,
  );
  if (!recorded || recorded.status === "completed") return;

  await markJob(env.DB, job.idempotencyKey, "processing");
  try {
    // A job is deliberately not treated as successful until an owning handler
    // exists. This makes unsupported production work visible and retryable.
    throw new Error(`No consumer registered for ${job.jobType}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown queue error";
    await markJob(env.DB, job.idempotencyKey, "failed", message);
    throw error;
  }
}
