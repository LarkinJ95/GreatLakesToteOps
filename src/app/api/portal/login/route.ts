import { createSession, sessionCookieHeader } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { nowIso, one, run, id } from "@/lib/db";
import { UnauthorizedError, ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, requiredString } from "@/lib/http";

type CustomerMatch = { id: string };

export const POST = withErrorHandling(async (request) => {
  const body = await jsonBody<{ email?: unknown; reference?: unknown }>(request);
  const email = requiredString(body.email, "Email", 254).toLowerCase();
  const reference = requiredString(body.reference, "Reservation or customer number", 100).toUpperCase();
  const env = await getEnv();
  const customer = await one<CustomerMatch>(env.DB, `SELECT c.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.deleted_at IS NULL WHERE lower(c.email) = ? AND (upper(c.customer_number) = ? OR upper(o.order_number) = ?) AND c.deleted_at IS NULL LIMIT 1`, email, reference, reference);
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  await run(env.DB, "INSERT INTO login_audit (id, user_id, email, success, ip_address, device_info, created_at) VALUES (?, 'usr_customer_portal', ?, ?, ?, ?, ?)", id("log"), email, customer ? 1 : 0, ip, request.headers.get("user-agent"), nowIso());
  if (!customer) throw new UnauthorizedError("We couldn't verify those portal details");
  const session = await createSession(env.DB, env, "usr_customer_portal", { ip, deviceInfo: request.headers.get("user-agent"), portalCustomerId: customer.id });
  const response = Response.json({ ok: true });
  response.headers.set("Set-Cookie", sessionCookieHeader(session.token, session.expiresAt, new URL(request.url).protocol === "https:"));
  return response;
});
