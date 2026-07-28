"use client";
import { FormEvent, useEffect, useState } from "react";
type Row = Record<string, unknown>;
const money = (n: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n ?? 0) / 100,
  );
export function InvoiceWorkspace({ id }: { id: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false);
  const load = async () => {
    const r = await fetch(`/api/invoices/${id}`);
    if (r.ok) setData(await r.json());
    else setMessage("Unable to load invoice.");
  };
  useEffect(() => {
    void load();
  }, [id]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.currentTarget),
      r = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dueDate: f.get("dueDate"),
          notes: f.get("notes"),
          internalNotes: f.get("internalNotes"),
        }),
      });
    setMessage(r.ok ? "Invoice saved." : "Invoice could not be saved.");
    if (r.ok) void load();
    setSaving(false);
  }
  async function finalize() {
    const r = await fetch(`/api/invoices/${id}/finalize`, { method: "POST" });
    setMessage(
      r.ok ? "Invoice finalized." : "Only a draft invoice can be finalized.",
    );
    if (r.ok) void load();
  }
  async function recordPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.currentTarget);
    const r = await fetch(`/api/invoices/${id}/payments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountCents: Math.round(Number(f.get("amountUsd")) * 100), method: f.get("method") }),
    });
    const p = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
    setMessage(r.ok ? "Payment recorded." : p?.error?.message ?? "Payment could not be recorded.");
    if (r.ok) { e.currentTarget.reset(); void load(); }
    setSaving(false);
  }
  if (!data)
    return (
      <main className="record">
        <p>{message || "Loading invoice…"}</p>
      </main>
    );
  const i = data.invoice as Row;
  return (
    <main className="record">
      <a className="back" href="/billing">
        ← Invoice desk
      </a>
      <header>
        <div>
          <p className="eyebrow">INVOICE WORKSPACE</p>
          <h1>{String(i.invoice_number)}</h1>
          <span>
            {String(i.customer_name)} · {String(i.status)} ·{" "}
            {money(i.balance_due_cents)}
          </span>
        </div>
        <div className="record-actions">
          <button className="secondary" onClick={() => window.print()}>
            Print invoice
          </button>
          {String(i.status) === "draft" && (
            <button className="primary" onClick={() => void finalize()}>
              Finalize invoice
            </button>
          )}
        </div>
      </header>
      <div className="record-grid">
        <section>
          <h2>Invoice details</h2>
          <form className="record-form" onSubmit={save}>
            <label>
              Due date
              <input
                name="dueDate"
                type="date"
                defaultValue={String(i.due_date ?? "").slice(0, 10)}
              />
            </label>
            <label>
              Customer notes
              <textarea name="notes" defaultValue={String(i.notes ?? "")} />
            </label>
            <label>
              Internal notes
              <textarea
                name="internalNotes"
                defaultValue={String(i.internal_notes ?? "")}
              />
            </label>
            <button className="primary" disabled={saving}>
              {saving ? "Saving…" : "Save invoice"}
            </button>
            {message && <p className="desk-hint">{message}</p>}
          </form>
        </section>
        <section>
          <h2>Line items</h2>
          {((data.lines ?? []) as Row[]).map((l, n) => (
            <div className="record-row" key={n}>
              <div>
                <strong>{String(l.description)}</strong>
                <span>
                  {String(l.quantity)} {String(l.unit)}
                </span>
              </div>
              <b>{money(l.line_total_cents)}</b>
            </div>
          ))}
        </section>
        <section>
          <h2>Payments</h2>
          {((data.payments ?? []) as Row[]).length ? (
            ((data.payments ?? []) as Row[]).map((p, n) => (
              <div className="record-row" key={n}>
                <strong>{String(p.payment_number)}</strong>
                <b>{money(p.amount_cents)}</b>
              </div>
            ))
          ) : (
            <p className="empty">
              No payment has been recorded.
            </p>
          )}
          {!["draft", "voided", "paid"].includes(String(i.status)) && (
            <form className="record-form payment-form" onSubmit={recordPayment}>
              <label>
                Amount received (USD)
                <input name="amountUsd" type="number" min="0.01" max={String(Number(i.balance_due_cents ?? 0) / 100)} step="0.01" required />
              </label>
              <label>
                Method
                <select name="method" defaultValue="card"><option value="card">Card</option><option value="ach">ACH</option><option value="check">Check</option><option value="cash">Cash</option><option value="account_terms">Account terms</option><option value="other">Other</option></select>
              </label>
              <button className="secondary" disabled={saving}>{saving ? "Recording…" : "Record payment"}</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
