import { createSession, sessionCookieHeader, verifyTurnstile } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { id, nowIso, one, run } from "@/lib/db";
import { withErrorHandling, UnauthorizedError, ValidationError } from "@/lib/errors";
import { jsonBody, requiredString } from "@/lib/http";
import type { UserRow } from "@/lib/types";

export const POST = withErrorHandling(async (request) => {
  const body = await jsonBody<{ email?: unknown; password?: unknown; turnstileToken?: unknown }>(request);
  const email = requiredString(body.email, "Email", 254).toLowerCase();
  const password = requiredString(body.password, "Password", 1024);
  const env = await getEnv();
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  const deviceInfo = request.headers.get("user-agent");
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : null;
  if (!await verifyTurnstile(env, turnstileToken, ip)) throw new ValidationError("Security verification failed");

  const user = await one<UserRow>(env.DB, "SELECT * FROM users WHERE email = ? AND deleted_at IS NULL", email);
  const locked = !!user?.locked_until && user.locked_until > nowIso();
  const valid = !!user && user.active === 1 && !locked && await verifyPassword(password, user.password_hash);
  await run(env.DB, "INSERT INTO login_audit (id, user_id, email, success, ip_address, device_info, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", id("log"), user?.id ?? null, email, valid ? 1 : 0, ip, deviceInfo, nowIso());
  if (!valid) {
    if (user && !locked) {
      const failures = user.failed_login_count + 1;
      const lockedUntil = failures >= 5 ? new Date(Date.now() + 30 * 60_000).toISOString() : null;
      await run(env.DB, "UPDATE users SET failed_login_count = ?, locked_until = ?, updated_at = ? WHERE id = ?", failures, lockedUntil, nowIso(), user.id);
    }
    throw new UnauthorizedError(locked ? "Account is temporarily locked" : "Invalid email or password");
  }

  await run(env.DB, "UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?", nowIso(), nowIso(), user.id);
  const session = await createSession(env.DB, env, user.id, { ip, deviceInfo });
  const response = Response.json({ user: { id: user.id, name: user.name, email: user.email } });
  response.headers.set("Set-Cookie", sessionCookieHeader(session.token, session.expiresAt, new URL(request.url).protocol === "https:"));
  return response;
});
