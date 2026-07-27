import { getEnv } from "@/lib/cloudflare";
import { id, nowIso, run } from "@/lib/db";
import { ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, optionalString, requiredString } from "@/lib/http";

export const POST = withErrorHandling(async (request) => {
  const body = await jsonBody<{ type?: unknown; name?: unknown; email?: unknown; phone?: unknown; details?: unknown }>(request);
  const type = requiredString(body.type, "type", 40);
  if (!new Set(["availability", "reservation", "contact", "business_account"]).has(type)) throw new ValidationError("Unsupported inquiry type");
  const name = requiredString(body.name, "name", 160), email = requiredString(body.email, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("Enter a valid email address");
  const env = await getEnv(), inquiryId = id("inq"), now = nowIso();
  await run(env.DB, "INSERT INTO public_inquiries (id, inquiry_type, name, email, phone, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", inquiryId, type, name, email, optionalString(body.phone, "phone", 40), JSON.stringify(body.details ?? {}), now, now);
  return Response.json({ ok: true, reference: `GLMT-${inquiryId.slice(-8).toUpperCase()}` }, { status: 201 });
});
