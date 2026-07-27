import { getEnv, sessionTtlMs, type Env } from "./cloudflare";
import { randomToken, sha256Hex } from "./crypto";
import { id, nowIso, one, q, run, type Db } from "./db";
import { ForbiddenError, UnauthorizedError } from "./errors";
import type { AuthContext, UserRow } from "./types";

export const SESSION_COOKIE = "glmt_session";

interface SessionRow {
  id: string; user_id: string; expires_at: string; revoked_at: string | null;
  portal_customer_id: string | null;
}

export async function createSession(
  db: Db, env: Env, userId: string,
  opts: { ip?: string | null; deviceInfo?: string | null; portalCustomerId?: string | null } = {},
): Promise<{ token: string; expiresAt: string }> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + sessionTtlMs(env)).toISOString();
  await run(
    db,
    `INSERT INTO sessions (id, user_id, token_hash, created_at, last_activity_at, expires_at, ip_address, device_info, portal_customer_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id("ses"), userId, await sha256Hex(token), nowIso(), nowIso(), expiresAt,
    opts.ip ?? null, opts.deviceInfo ?? null, opts.portalCustomerId ?? null,
  );
  return { token, expiresAt };
}

export function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === SESSION_COOKIE) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** Resolve the request to an authenticated user + permissions, or null. */
export async function resolveAuth(db: Db, request: Request): Promise<AuthContext | null> {
  const token = extractToken(request);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const session = await one<SessionRow>(
    db,
    `SELECT id, user_id, expires_at, revoked_at, portal_customer_id FROM sessions
     WHERE token_hash = ? AND revoked_at IS NULL`,
    tokenHash,
  );
  if (!session || session.expires_at < nowIso()) return null;

  const user = await one<UserRow>(
    db, `SELECT * FROM users WHERE id = ? AND active = 1 AND deleted_at IS NULL`, session.user_id,
  );
  if (!user) return null;

  const role = await one<{ id: string; name: string }>(db, `SELECT id, name FROM roles WHERE id = ?`, user.role_id);
  const perms = await q<{ permission_key: string }>(
    db,
    `SELECT p.permission_key FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ?`,
    user.role_id,
  );

  // Sliding activity refresh (cheap, non-blocking correctness is fine)
  await run(db, `UPDATE sessions SET last_activity_at = ? WHERE id = ?`, nowIso(), session.id);

  return {
    user,
    roleName: role?.name ?? "Unknown",
    permissions: new Set(perms.map((p) => p.permission_key)),
    sessionId: session.id,
    portalCustomerId: session.portal_customer_id,
    ip: request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for"),
  };
}

export async function requireUser(request?: Request): Promise<AuthContext> {
  if (!request) throw new UnauthorizedError();
  const env = await getEnv();
  const ctx = await resolveAuth(env.DB, request);
  if (!ctx) throw new UnauthorizedError();
  return ctx;
}

export function requirePermission(ctx: AuthContext, ...keys: string[]): void {
  if (!keys.some((k) => ctx.permissions.has(k))) {
    throw new ForbiddenError(`Requires permission: ${keys.join(" or ")}`);
  }
}

/** Branch scoping: users with branch_id see only their branch's rows. */
export function branchFilter(ctx: AuthContext): { branchId: string | null } {
  return { branchId: ctx.user.branch_id };
}

export function assertBranchAccess(ctx: AuthContext, branchId: string | null): void {
  if (ctx.user.branch_id && branchId && ctx.user.branch_id !== branchId) {
    throw new ForbiddenError("Record belongs to a different branch");
  }
}

export async function revokeSession(db: Db, sessionId: string): Promise<void> {
  await run(db, `UPDATE sessions SET revoked_at = ? WHERE id = ?`, nowIso(), sessionId);
}

export async function revokeAllUserSessions(db: Db, userId: string): Promise<void> {
  await run(db, `UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`, nowIso(), userId);
}

export function sessionCookieHeader(token: string, expiresAt: string, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/", "HttpOnly", "SameSite=Lax",
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/** Verify a Cloudflare Turnstile token when enabled. Fails closed when enabled. */
export async function verifyTurnstile(env: Env, token: string | null, ip?: string | null): Promise<boolean> {
  if (env.TURNSTILE_ENABLED !== "true") return true;
  if (!token || !env.TURNSTILE_SECRET_KEY) return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
