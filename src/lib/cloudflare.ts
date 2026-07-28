import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Bindings + vars + secrets available to the Worker. Never serialize to the client. */
export interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  JOB_QUEUE?: Queue;
  ASSETS?: Fetcher;
  APP_ENV: string;
  APP_BASE_URL: string;
  SESSION_TTL_HOURS?: string;
  TURNSTILE_ENABLED?: string;
  STRIPE_ENABLED?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  SMS_ACCOUNT_SID?: string;
  SMS_AUTH_TOKEN?: string;
  SMS_FROM_NUMBER?: string;
  DOC_LINK_SECRET?: string;
  BOOTSTRAP_TOKEN?: string;
  PUBLIC_API_KEY?: string;
}

let cached: Env | null = null;

export async function getEnv(): Promise<Env> {
  if (cached && process.env.NODE_ENV !== "development") return cached;
  try {
    const { env } = await getCloudflareContext({ async: true });
    cached = env as unknown as Env;
  } catch {
    // Fallback for `next dev` without the adapter context
    cached = (globalThis as Record<string, unknown>).env as Env;
  }
  if (!cached?.DB) throw new Error("Cloudflare bindings unavailable — run via wrangler/OpenNext dev");
  return cached;
}

export function sessionTtlMs(env: Env): number {
  const hours = Number(env.SESSION_TTL_HOURS ?? "12") || 12;
  return hours * 60 * 60 * 1000;
}
