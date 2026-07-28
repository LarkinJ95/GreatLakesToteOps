"use client";
import { FormEvent, useEffect, useState } from "react";
const money = (n: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n ?? 0) / 100,
  );
const words = (v: unknown) => String(v ?? "").replaceAll("_", " ");
const date = (v: unknown) => (v ? new Date(String(v)).toLocaleString() : "—");
type Row = Record<string, unknown>;
type Data = Record<string, unknown>;
export function OpsRecord({
  kind,
  id,
}: {
  kind: "customer" | "order";
  id: string;
}) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const base =
    kind === "customer" ? `/api/customers/${id}` : `/api/orders/${id}`;
  const load = async () => {
    const r = await fetch(base);
    if (!r.ok) {
      setError("Unable to load this record.");
      return;
    }
    setData((await r.json()) as Data);
  };
  useEffect(() => {
    void load();
  }, [id]);
  async function action(path: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(f);
    for (const k of [
      "discountCents",
      "accessFeeCents",
      "addOnCents",
      "feeCents",
      "refundCents",
    ])
      if (k in body) body[k] = Math.round(Number(body[k]) * 100);
    const r = await fetch(`/api/orders/${id}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok)
      setError(
        `${path === "cancel" ? "Cancellation" : "Pricing"} update was not accepted.`,
      );
    else await load();
    setSaving(false);
  }
  if (!data)
    return (
      <main className="record">
        <p>{error || "Loading record…"}</p>
      </main>
    );
  if (kind === "customer") {
    const c = data.customer as Row,
      orders = (data.orders ?? []) as Row[],
      invoices = (data.invoices ?? []) as Row[],
      agreements = (data.agreements ?? []) as Row[],
      history = (data.history ?? []) as Row[];
    return (
      <main className="record">
        <a href="/customers" className="back">
          ← Customers
        </a>
        <header>
          <div>
            <p className="eyebrow">CUSTOMER 360</p>
            <h1>
              {String(
                c.business_name || `${c.first_name ?? ""} ${c.last_name ?? ""}`,
              )}
            </h1>
            <span>
              {String(c.customer_number)} · {String(c.email ?? "No email")} ·{" "}
              {String(c.primary_phone ?? "No phone")}
            </span>
          </div>
          <div className="record-actions">
            <button
              className="secondary"
              onClick={() =>
                window.dispatchEvent(new Event("open-customer-editor"))
              }
            >
              Edit customer
            </button>
            <a className="primary" href={`/orders?customer=${id}`}>
              New order
            </a>
          </div>
        </header>
        <div className="record-kpis">
          <article>
            <span>Orders</span>
            <strong>{orders.length}</strong>
          </article>
          <article>
            <span>Open invoices</span>
            <strong>
              {
                invoices.filter(
                  (i) => !["paid", "voided"].includes(String(i.status)),
                ).length
              }
            </strong>
          </article>
          <article>
            <span>Agreements</span>
            <strong>{agreements.length}</strong>
          </article>
        </div>
        <div className="record-grid">
          <section>
            <h2>Rental history</h2>
            {orders.map((o) => (
              <a
                className="record-row"
                href={`/orders/${String(o.id)}`}
                key={String(o.id)}
              >
                <div>
                  <strong>{String(o.order_number)}</strong>
                  <span>
                    {String(o.package_name ?? "Tote rental")} ·{" "}
                    {words(o.order_status)}
                  </span>
                </div>
                <b>{money(o.total_cents)}</b>
              </a>
            ))}
          </section>
          <section>
            <h2>Invoices</h2>
            {invoices.map((i) => (
              <a
                className="record-row"
                href={`/invoices/${String(i.id)}`}
                key={String(i.invoice_number)}
              >
                <div>
                  <strong>{String(i.invoice_number)}</strong>
                  <span>
                    {words(i.status)} · Due {date(i.due_date)}
                  </span>
                </div>
                <b>{money(i.balance_due_cents)}</b>
              </a>
            ))}
          </section>
          <section>
            <h2>Signed contracts</h2>
            {agreements.map((a) => (
              <a
                className="record-row"
                href={`/agreements/${String(a.id)}`}
                key={String(a.agreement_number)}
              >
                <div>
                  <strong>{String(a.agreement_number)}</strong>
                  <span>
                    {words(a.status)} · Verify {String(a.verification_code)}
                  </span>
                </div>
                <b>{a.accepted_at ? "Signed" : "Pending"}</b>
              </a>
            ))}
          </section>
          <section>
            <h2>Audit timeline</h2>
            {history.slice(0, 15).map((h, i) => (
              <div className="timeline" key={i}>
                <strong>{words(h.action)}</strong>
                <span>{date(h.created_at)}</span>
              </div>
            ))}
          </section>
        </div>
      </main>
    );
  }
  const o = data.order as Row,
    assignments = (data.assignments ?? []) as Row[],
    assets = (data.assets ?? []) as Row[],
    invoices = (data.invoices ?? []) as Row[],
    agreements = (data.agreements ?? []) as Row[],
    history = (data.statusHistory ?? []) as Row[],
    cancellation = data.cancellation as Row | null;
  return (
    <main className="record">
      <a href={`/customers/${String(o.customer_id)}`} className="back">
        ← {String(o.customer_name)}
      </a>
      <header>
        <div>
          <p className="eyebrow">ORDER WORKSPACE</p>
          <h1>{String(o.order_number)}</h1>
          <span>
            {String(o.package_name ?? "Tote rental")} · {words(o.order_status)}{" "}
            · {money(o.total_cents)}
          </span>
        </div>
      </header>
      {error && <p className="form-error">{error}</p>}
      <div className="record-kpis">
        <article>
          <span>Balance due</span>
          <strong>{money(o.balance_due_cents)}</strong>
        </article>
        <article>
          <span>Delivery</span>
          <strong>{date(o.scheduled_delivery_date)}</strong>
        </article>
        <article>
          <span>Pickup</span>
          <strong>{date(o.scheduled_pickup_date)}</strong>
        </article>
      </div>
      <section className="record-editor">
        <h2>Customer schedule & addresses</h2>
        <div className="record-grid">
          <div>
            <strong>Delivery</strong>
            <p>
              {date(o.scheduled_delivery_date)}
              <br />
              {String(o.delivery_street ?? "Address to be confirmed")}
              {o.delivery_unit ? `, ${String(o.delivery_unit)}` : ""}
              <br />
              {String(o.delivery_city ?? "")} {String(o.delivery_state ?? "")}{" "}
              {String(o.delivery_zip ?? "")}
            </p>
          </div>
          <div>
            <strong>Pickup</strong>
            <p>
              {date(o.scheduled_pickup_date)}
              <br />
              {String(o.pickup_street ?? "Address to be confirmed")}
              {o.pickup_unit ? `, ${String(o.pickup_unit)}` : ""}
              <br />
              {String(o.pickup_city ?? "")} {String(o.pickup_state ?? "")}{" "}
              {String(o.pickup_zip ?? "")}
            </p>
          </div>
          <div>
            <strong>Customer preferences</strong>
            <p>
              {String(
                o.customer_notes ?? "No customer access or time-window notes.",
              )}
            </p>
          </div>
        </div>
      </section>
      <div className="record-grid">
        <section>
          <h2>Pricing & discount</h2>
          <form
            className="record-form"
            onSubmit={(e) => void action("pricing", e)}
          >
            <label>
              Access fee (USD)
              <input
                name="accessFeeCents"
                type="number"
                min="0"
                defaultValue={String(Number(o.access_fee_cents ?? 0) / 100)}
              />
            </label>
            <label>
              Add-ons (USD)
              <input
                name="addOnCents"
                type="number"
                min="0"
                defaultValue={String(Number(o.add_on_cents ?? 0) / 100)}
              />
            </label>
            <label>
              Discount (USD)
              <input
                name="discountCents"
                type="number"
                min="0"
                defaultValue={String(Number(o.discount_cents ?? 0) / 100)}
              />
            </label>
            <label>
              Reason for discount
              <textarea name="reason" />
            </label>
            <button className="primary" disabled={saving}>
              Save audited pricing
            </button>
          </form>
        </section>
        <section>
          <h2>Cancellation</h2>
          {cancellation ? (
            <div className="notice">
              <strong>Cancelled</strong>
              <span>
                {String(cancellation.reason)} · Fee{" "}
                {money(cancellation.fee_cents)} · Refund{" "}
                {money(cancellation.refund_cents)}
              </span>
            </div>
          ) : (
            <form
              className="record-form"
              onSubmit={(e) => void action("cancel", e)}
            >
              <label>
                Reason
                <textarea name="reason" required />
              </label>
              <label>
                Cancellation fee (USD)
                <input name="feeCents" type="number" min="0" defaultValue="0" />
              </label>
              <label>
                Refund approved (USD)
                <input
                  name="refundCents"
                  type="number"
                  min="0"
                  defaultValue="0"
                />
              </label>
              <label>
                Internal note
                <textarea name="notes" />
              </label>
              <button className="danger" disabled={saving}>
                Cancel order and release assets
              </button>
            </form>
          )}
        </section>
        <section>
          <h2>Dispatch & equipment</h2>
          {assignments.map((a, i) => (
            <div className="record-row" key={i}>
              <div>
                <strong>{String(a.assignment_number)}</strong>
                <span>
                  {words(a.assignment_type)} · {date(a.scheduled_date)}
                </span>
              </div>
              <b>{words(a.status)}</b>
            </div>
          ))}
          {assets.map((a, i) => (
            <div className="record-row" key={`a${i}`}>
              <div>
                <strong>{String(a.asset_number)}</strong>
                <span>
                  {words(a.asset_type)} · {words(a.current_status)}
                </span>
              </div>
            </div>
          ))}
        </section>
        <section>
          <h2>Contracts & billing</h2>
          {agreements.map((a, i) => (
            <div className="record-row" key={i}>
              <div>
                <strong>{String(a.agreement_number)}</strong>
                <span>
                  {words(a.status)} · Verify {String(a.verification_code)}
                </span>
              </div>
            </div>
          ))}
          {invoices.map((i, n) => (
            <div className="record-row" key={`i${n}`}>
              <div>
                <strong>{String(i.invoice_number)}</strong>
                <span>
                  {words(i.status)} · Due {date(i.due_date)}
                </span>
              </div>
              <b>{money(i.balance_due_cents)}</b>
            </div>
          ))}
        </section>
        <section>
          <h2>Order history</h2>
          {history.map((h, i) => (
            <div className="timeline" key={i}>
              <strong>
                {words(h.from_status)} → {words(h.to_status)}
              </strong>
              <span>
                {date(h.changed_at)} {h.reason ? `· ${String(h.reason)}` : ""}
              </span>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
