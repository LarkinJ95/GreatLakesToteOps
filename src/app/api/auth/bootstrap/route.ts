import { getEnv } from "@/lib/cloudflare";
import { hashPassword, timingSafeEqualHex } from "@/lib/crypto";
import { id, nowIso, one, run } from "@/lib/db";
import { ForbiddenError, ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString, requiredString } from "@/lib/http";

export const runtime = "edge";

/** One-time owner creation. Set BOOTSTRAP_TOKEN as a Worker secret before calling. */
export const POST = withErrorHandling(async (request) => {
  const env = await getEnv();
  const secret = env.BOOTSTRAP_TOKEN;
  const provided = request.headers.get("x-bootstrap-token") ?? "";
  if (!secret || !timingSafeEqualHex(provided, secret)) throw new ForbiddenError("Bootstrap authorization failed");
  const existing = await one<{ n: number }>(env.DB, "SELECT COUNT(*) AS n FROM users WHERE deleted_at IS NULL");
  if ((existing?.n ?? 0) > 0) throw new ValidationError("A user already exists; bootstrap is closed");
  const body = await jsonBody<{ name?: unknown; email?: unknown; password?: unknown; phone?: unknown }>(request);
  const name = requiredString(body.name, "Name", 120);
  const email = requiredString(body.email, "Email", 254).toLowerCase();
  const password = requiredString(body.password, "Password", 1024);
  if (password.length < 12) throw new ValidationError("Password must be at least 12 characters");
  const userId = id("usr");
  await run(env.DB, "INSERT INTO users (id, name, email, phone, password_hash, role_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'role_owner', 1, ?, ?)", userId, name, email, optionalString(body.phone, "Phone", 40), await hashPassword(password), nowIso(), nowIso());
  return Response.json({ user: { id: userId, name, email }, message: "Owner created. Sign in to continue." }, { status: 201 });
});
