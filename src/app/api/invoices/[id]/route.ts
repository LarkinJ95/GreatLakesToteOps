import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { nowIso, one, q, run } from "@/lib/db";
import {
  NotFoundError,
  ValidationError,
  withErrorHandling,
} from "@/lib/errors";
import { jsonBody, optionalString } from "@/lib/http";

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
