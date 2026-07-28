import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { id, nowIso, one, q, run } from "@/lib/db";
import { NotFoundError, ValidationError, withErrorHandling } from "@/lib/errors";
import { jsonBody, requiredString } from "@/lib/http";

type InboxRow = { id: string; source: "inquiry" | "lead"; inquiry_type: string; name: string | null; email: string | null; phone: string | null; payload_json: string; status: string; created_at: string };
const validStatuses = new Set(["new", "reviewing", "contacted", "closed", "converted"]);

export const GET = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "customers.view", "orders.create");
  const env = await getEnv();
  const [inquiries, leads] = await Promise.all([
    q<InboxRow>(env.DB, "SELECT id,'inquiry' source,inquiry_type,name,email,phone,payload_json,status,created_at FROM public_inquiries ORDER BY created_at DESC LIMIT 100"),
    q<InboxRow>(env.DB, "SELECT id,'lead' source,lead_type inquiry_type,NULL name,NULL email,NULL phone,payload_json,pipeline_status status,created_at FROM public_leads ORDER BY created_at DESC LIMIT 100"),
  ]);
  return Response.json({ inquiries: [...inquiries, ...leads].sort((a, b) => b.created_at.localeCompare(a.created_at)) });
});

export const PATCH = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "customers.edit", "orders.create");
  const env = await getEnv();
  const body = await jsonBody<Record<string, unknown>>(request);
  const id = requiredString(body.id, "id", 100);
  const source = requiredString(body.source ?? "inquiry", "source", 20);
  const status = requiredString(body.status, "status", 20);
  if (!validStatuses.has(status)) throw new ValidationError("Invalid inquiry status");
  if (source === "inquiry") await run(env.DB, "UPDATE public_inquiries SET status=?,updated_at=? WHERE id=?", status === "converted" ? "closed" : status, nowIso(), id);
  else if (source === "lead") await run(env.DB, "UPDATE public_leads SET pipeline_status=?,updated_at=? WHERE id=?", status, nowIso(), id);
  else throw new ValidationError("Invalid inquiry source");
  return Response.json({ ok: true });
});

export const POST = withErrorHandling(async (request) => {
  const ctx = await requireUser(request);
  requirePermission(ctx, "customers.create", "orders.create");
  const env = await getEnv();
  const body = await jsonBody<Record<string, unknown>>(request);
  const recordId = requiredString(body.id, "id", 100);
  const source = requiredString(body.source, "source", 20);
  let record: InboxRow | null = null;
  if (source === "inquiry") record = await one<InboxRow>(env.DB, "SELECT id,'inquiry' source,inquiry_type,name,email,phone,payload_json,status,created_at FROM public_inquiries WHERE id=?", recordId);
  else if (source === "lead") record = await one<InboxRow>(env.DB, "SELECT id,'lead' source,lead_type inquiry_type,NULL name,NULL email,NULL phone,payload_json,pipeline_status status,created_at FROM public_leads WHERE id=?", recordId);
  else throw new ValidationError("Invalid inquiry source");
  if (!record) throw new NotFoundError("Inquiry");
  let payload: Record<string, unknown> = {};
  try { const value = JSON.parse(record.payload_json); if (value && typeof value === "object" && !Array.isArray(value)) payload = value as Record<string, unknown>; } catch { /* Retain the lead even if legacy payload JSON is malformed. */ }
  const customer = payload.customer && typeof payload.customer === "object" && !Array.isArray(payload.customer) ? payload.customer as Record<string, unknown> : {};
  const rawName = typeof customer.name === "string" ? customer.name : typeof record.name === "string" ? record.name : typeof payload.name === "string" ? payload.name : "Website lead";
  const firstName = typeof customer.firstName === "string" && customer.firstName.trim() ? customer.firstName.trim() : rawName.trim().split(/\s+/)[0] || "Website";
  const lastName = typeof customer.lastName === "string" && customer.lastName.trim() ? customer.lastName.trim() : rawName.trim().split(/\s+/).slice(1).join(" ") || "Lead";
  const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : typeof record.email === "string" ? record.email.trim().toLowerCase() : typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email) throw new ValidationError("This lead has no email address to create a customer record");
  let existing = await one<{ id: string }>(env.DB, "SELECT id FROM customers WHERE lower(email)=? AND deleted_at IS NULL LIMIT 1", email);
  if (!existing) {
    const customerId = id("cus");
    await run(env.DB, "INSERT INTO customers (id,customer_number,customer_type,first_name,last_name,primary_phone,email,notes,marketing_consent,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", customerId, `GLMT-CUS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, "residential", firstName, lastName, typeof customer.phone === "string" ? customer.phone : record.phone, email, `Converted from ${source === "lead" ? "website lead" : "public inquiry"} ${record.id}`, 0, nowIso(), nowIso());
    existing = { id: customerId };
  }
  if (source === "inquiry") await run(env.DB, "UPDATE public_inquiries SET status='closed',updated_at=? WHERE id=?", nowIso(), record.id);
  else await run(env.DB, "UPDATE public_leads SET pipeline_status='converted',updated_at=? WHERE id=?", nowIso(), record.id);
  await audit(env.DB, { actorUserId: ctx.user.id, action: "lead.converted", entityType: "customer", entityId: existing.id, detail: { source, recordId: record.id, email }, ip: ctx.ip });
  return Response.json({ customerId: existing.id, created: true });
});
