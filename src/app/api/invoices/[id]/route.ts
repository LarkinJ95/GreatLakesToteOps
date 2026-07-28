import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { id, nowIso, one, q, run } from "@/lib/db";
import {
  NotFoundError,
  ValidationError,
  withErrorHandling,
} from "@/lib/errors";
import { jsonBody, optionalString } from "@/lib/http";
import { nextDocumentNumber } from "@/lib/numbering";

const invoiceSql = `SELECT i.*,o.order_number,COALESCE(c.business_name,trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) customer_name FROM invoices i JOIN customers c ON c.id=i.customer_id LEFT JOIN orders o ON o.id=i.order_id WHERE i.id=?`;
export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "invoices.view");
    const env = await getEnv(),
      id = (await context.params).id;
    const invoice = await one(env.DB, invoiceSql, id);
    if (!invoice) throw new NotFoundError("Invoice not found");
    const [lines, payments, auditTrail] = await Promise.all([
      q(
        env.DB,
        "SELECT * FROM invoice_line_items WHERE invoice_id=? ORDER BY line_order",
        id,
      ),
      q(
        env.DB,
        "SELECT * FROM payments WHERE invoice_id=? ORDER BY received_at DESC",
        id,
      ),
      q(
        env.DB,
        "SELECT * FROM audit_logs WHERE entity_type='invoice' AND entity_id=? ORDER BY created_at DESC LIMIT 100",
        id,
      ),
    ]);
    return Response.json({ invoice, lines, payments, auditTrail });
  },
);
export const PATCH = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "invoices.edit");
    const env = await getEnv(),
      id = (await context.params).id,
      invoice = await one<Record<string, unknown>>(env.DB, invoiceSql, id);
    if (!invoice) throw new NotFoundError("Invoice not found");
    if (String(invoice.status) !== "draft")
      throw new ValidationError("Only draft invoices can be edited");
    const body = await jsonBody<Record<string, unknown>>(request);
    const dueDate = optionalString(body.dueDate, "dueDate", 20),
      notes = optionalString(body.notes, "notes", 4000),
      internalNotes = optionalString(body.internalNotes, "internalNotes", 4000);
    await run(
      env.DB,
      "UPDATE invoices SET due_date=?,notes=?,internal_notes=?,updated_at=?,version=version+1 WHERE id=?",
      dueDate,
      notes,
      internalNotes,
      nowIso(),
      id,
    );
    await audit(env.DB, {
      actorUserId: ctx.user.id,
      action: "invoice.updated",
      entityType: "invoice",
      entityId: id,
      detail: { dueDate },
      ip: ctx.ip,
    });
    return Response.json({ invoice: await one(env.DB, invoiceSql, id) });
  },
);

export const POST = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "payments.record");
    const env = await getEnv();
    const invoiceId = (await context.params).id;
    const body = await jsonBody<Record<string, unknown>>(request);
    if (body.action !== "recordPayment")
      throw new ValidationError("Unsupported invoice action");
    const amount = Number(body.amountCents);
    if (!Number.isInteger(amount) || amount <= 0)
      throw new ValidationError("Payment amount must be a positive USD cent amount");
    const method = optionalString(body.method, "payment method", 30) ?? "card";
    if (!new Set(["card", "ach", "check", "cash", "account_terms", "other"]).has(method))
      throw new ValidationError("Unsupported payment method");
    const invoice = await one<{ id: string; customer_id: string; order_id: string | null; status: string; total_cents: number; amount_paid_cents: number; balance_due_cents: number }>(
      env.DB,
      "SELECT id,customer_id,order_id,status,total_cents,amount_paid_cents,balance_due_cents FROM invoices WHERE id=?",
      invoiceId,
    );
    if (!invoice) throw new NotFoundError("Invoice not found");
    if (!new Set(["finalized", "sent", "partially_paid", "overdue"]).has(invoice.status))
      throw new ValidationError("Finalize the invoice before recording payment");
    if (amount > invoice.balance_due_cents)
      throw new ValidationError("Payment cannot exceed the invoice balance due");
    const now = nowIso();
    const paid = invoice.amount_paid_cents + amount;
    const balance = Math.max(0, invoice.total_cents - paid);
    const paymentId = id("pay");
    const paymentNumber = await nextDocumentNumber(env.DB, "receipt");
    await run(
      env.DB,
      "INSERT INTO payments (id,payment_number,customer_id,order_id,invoice_id,provider,payment_method_type,amount_cents,status,received_at,created_by,created_at) VALUES (?,?,?,?,?,'manual',?,?,'succeeded',?,?,?)",
      paymentId, paymentNumber, invoice.customer_id, invoice.order_id, invoice.id,
      method, amount, now, ctx.user.id, now,
    );
    await run(
      env.DB,
      "UPDATE invoices SET amount_paid_cents=?,balance_due_cents=?,status=?,updated_at=?,version=version+1 WHERE id=?",
      paid, balance, balance === 0 ? "paid" : "partially_paid", now, invoice.id,
    );
    if (invoice.order_id) await run(
      env.DB,
      "UPDATE orders SET amount_paid_cents=amount_paid_cents+?,balance_due_cents=MAX(0,balance_due_cents-?),payment_status=?,updated_at=?,version=version+1 WHERE id=?",
      amount, amount, balance === 0 ? "paid" : "partially_paid", now, invoice.order_id,
    );
    await audit(env.DB, {
      actorUserId: ctx.user.id, action: "payment.recorded", entityType: "invoice",
      entityId: invoice.id, detail: { paymentId, paymentNumber, amountCents: amount, method }, ip: ctx.ip,
    });
    return Response.json({ paymentId, paymentNumber, balanceDueCents: balance }, { status: 201 });
  },
);
