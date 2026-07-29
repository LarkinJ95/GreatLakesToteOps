"use client";
import { FormEvent, useEffect, useState } from "react";
const money = (n: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n ?? 0) / 100,
  );
const words = (v: unknown) => String(v ?? "").replaceAll("_", " ");
// D1 date columns are calendar dates, not UTC instants. Formatting them as a
// Date object shifts Michigan bookings into the previous evening.
const date = (v: unknown) => {
  if (!v) return "—";
  const raw = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw))
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${raw}T12:00:00`));
  return new Date(raw).toLocaleString();
};
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
    [notice, setNotice] = useState(""),
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
  async function saveSchedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
    });
    if (!r.ok) setError("Schedule or address update was not accepted.");
    else void load();
    setSaving(false);
  }
  async function removeRecord() {
    const label = kind === "customer" ? "customer" : "order";
    if (!window.confirm(`Delete this ${label}? This is only available for records without operational or billing history.`)) return;
    setSaving(true);
    setError("");
    try {
      const r = await fetch(base, { method: "DELETE" });
      const p = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!r.ok) {
        setError(p?.error?.message ?? `This ${label} could not be deleted.`);
        return;
      }
      window.location.assign(kind === "customer" ? "/customers" : "/orders");
    } catch {
      setError(`This ${label} could not be deleted.`);
    } finally {
      setSaving(false);
    }
  }
  async function advanceEquipment() {
    setSaving(true); setError(""); setNotice("Updating equipment…");
    try {
      const r = await fetch(`/api/orders/${id}/equipment-action`, { method: "POST" });
      const p = (await r.json().catch(() => null)) as { action?: string | null; label?: string; completed?: string[]; failed?: { message?: string }[]; error?: { message?: string } } | null;
      if (!r.ok) { setError(p?.error?.message ?? "The equipment action could not be completed."); return; }
      const count = p?.completed?.length ?? 0, failed = p?.failed?.length ?? 0;
      setNotice(count ? `${p?.label ?? "Equipment updated"}: ${count} item${count === 1 ? "" : "s"}${failed ? `; ${failed} need attention.` : "."}` : (p?.label ?? "No equipment action is pending."));
      await load();
    } catch { setError("The equipment action could not be completed."); }
    finally { setSaving(false); }
  }
  async function assignPackageEquipment() {
    setSaving(true); setError(""); setNotice("Assigning required package equipment…");
    try {
      const r = await fetch(`/api/orders/${id}/assets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "auto" }) });
      const p = (await r.json().catch(() => null)) as { assigned?: Record<string, number>; error?: { message?: string } } | null;
      if (!r.ok) { setError(p?.error?.message ?? "Package equipment could not be assigned."); return; }
      const count = Object.values(p?.assigned ?? {}).reduce((total, value) => total + Number(value), 0);
      setNotice(count ? `Assigned ${count} required package item${count === 1 ? "" : "s"}.` : "The full package is already assigned."); await load();
    } catch { setError("Package equipment could not be assigned."); } finally { setSaving(false); }
  }
  async function assignSelectedEquipment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setError(""); setNotice("Assigning selected equipment…");
    const assetIds = new FormData(e.currentTarget).getAll("assetIds");
    try {
      const r = await fetch(`/api/orders/${id}/assets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "selected", assetIds }) });
      const p = (await r.json().catch(() => null)) as { assigned?: string[]; error?: { message?: string } } | null;
      if (!r.ok) { setError(p?.error?.message ?? "Selected equipment could not be assigned."); return; }
      setNotice(`Assigned ${p?.assigned?.length ?? 0} selected item(s).`); await load();
    } catch { setError("Selected equipment could not be assigned."); } finally { setSaving(false); }
  }
  async function generateContract() {
    setSaving(true); setError(""); setNotice("Generating rental contract…");
    try {
      const r = await fetch(`/api/orders/${id}/agreement`, { method: "POST" });
      const p = (await r.json().catch(() => null)) as { agreementId?: string; agreementNumber?: string; reused?: boolean; error?: { message?: string } } | null;
      if (!r.ok) { setError(p?.error?.message ?? "The contract could not be generated."); return; }
      setNotice(p?.reused ? `An accepted contract already exists: ${p.agreementNumber ?? "agreement"}.` : `Contract ${p?.agreementNumber ?? "generated"} is ready in the customer portal.`);
      await load();
    } catch { setError("The contract could not be generated."); } finally { setSaving(false); }
  }
  async function finalizeOrder(toStatus: "completed" | "closed") {
    const label = toStatus === "closed" ? "close this order" : "mark this order complete";
    if (toStatus === "closed" && !window.confirm("Close this order? Closed orders are retained for history and cannot be edited.")) return;
    setSaving(true); setError(""); setNotice(toStatus === "closed" ? "Closing order…" : "Completing order…");
    try {
      const r = await fetch(`/api/orders/${id}/transition`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toStatus, reason: toStatus === "closed" ? "Operations and final billing complete" : "Final invoice review complete" }) });
      const p = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!r.ok) { setError(p?.error?.message ?? "The order could not be finalized."); return; }
      setNotice(toStatus === "closed" ? "Order closed and retained in history." : "Order marked complete. Close it when you are ready to lock the record.");
      await load();
    } catch { setError("The order could not be finalized."); } finally { setSaving(false); }
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
      equipment = (data.equipment ?? []) as Row[],
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
            <button className="danger" onClick={() => void removeRecord()} disabled={saving}>
              Delete customer
            </button>
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
          <section>
            <h2>Equipment custody</h2>
            {equipment.length ? equipment.map((asset, i) => <a className="record-row" href={`/orders/${String(asset.order_id)}`} key={i}><div><strong>{String(asset.asset_number)}</strong><span>{words(asset.asset_type)} · {words(asset.current_status)} · {String(asset.order_number)}</span></div><b>{asset.warehouse_return_at ? "Returned" : asset.picked_up_at ? "Picked up" : asset.delivered_at ? "With customer" : "Allocated"}</b></a>) : <p className="empty">No equipment has been assigned to this customer.</p>}
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
    cancellation = data.cancellation as Row | null,
    equipmentAvailability = (data.equipmentAvailability ?? []) as Row[],
    assignableAssets = (data.assignableAssets ?? []) as Row[];
  const equipment = [
    { type: "tote", label: "Totes", required: Number(o.package_tote_quantity ?? 0) },
    { type: "dolly", label: "Dollies", required: Number(o.package_dolly_quantity ?? 0) },
  ].map((requirement) => {
    const availability = equipmentAvailability.find((row) => String(row.asset_type) === requirement.type);
    const assigned = assets.filter((asset) => String(asset.asset_type) === requirement.type).length;
    return { ...requirement, assigned, stillNeeded: Math.max(0, requirement.required - assigned), cleanAvailable: Number(availability?.clean_available_count ?? 0) };
  });
  const status = String(o.order_status ?? "inquiry");
  const workflow = [
    { label: "Book", detail: "Customer & schedule", href: "#schedule", statuses: ["inquiry", "quote", "awaiting_customer_approval", "awaiting_agreement", "awaiting_payment"] },
    { label: "Prepare", detail: "Assign & stage", href: "#equipment", statuses: ["confirmed", "equipment_reserved", "staged"] },
    { label: "Deliver", detail: "Dispatch & delivery", href: "#equipment", statuses: ["delivery_assigned", "out_for_delivery"] },
    { label: "Rental", detail: "Customer has equipment", href: "#schedule", statuses: ["delivered", "active_rental"] },
    { label: "Return", detail: "Pickup & reconcile", href: "#equipment", statuses: ["pickup_scheduled", "pickup_assigned", "picked_up", "equipment_reconciliation", "cleaning", "final_invoice_review", "completed", "closed"] },
  ];
  const currentWorkflowIndex = Math.max(0, workflow.findIndex((step) => step.statuses.includes(status)));
  const equipmentActionLabel = assets.some((asset) => String(asset.current_status) === "reserved") ? "Stage all equipment"
    : assets.some((asset) => String(asset.current_status) === "staged") ? "Load all equipment"
    : assets.some((asset) => String(asset.current_status) === "loaded") ? "Deliver all equipment"
    : assets.some((asset) => ["delivered", "rented", "pickup_scheduled"].includes(String(asset.current_status))) ? "Pick up all equipment"
    : assets.some((asset) => String(asset.current_status) === "picked_up") ? "Return all equipment to warehouse"
    : "Equipment complete";
  const hasEquipmentAction = equipmentActionLabel !== "Equipment complete";
  function printPickList() {
    const escape = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
    const lines = assets.map((asset) => `<tr><td>${escape(asset.asset_number)}</td><td>${escape(words(asset.asset_type))}</td><td>${escape(words(asset.current_status))}</td></tr>`).join("");
    const popup = window.open("", "glmt-pick-list");
    if (!popup) { setError("Your browser blocked the pick-list print window. Allow pop-ups and try again."); return; }
    popup.opener = null;
    popup.document.write(`<!doctype html><html><head><title>Pick list ${escape(o.order_number)}</title><style>body{font:14px Arial,sans-serif;margin:32px;color:#173b52}h1{margin:0 0 5px}p{margin:4px 0 18px;color:#58717e}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #cfdadd;text-align:left}th{font-size:11px;text-transform:uppercase;color:#58717e}</style></head><body><h1>Equipment pick list</h1><p><strong>${escape(o.order_number)}</strong> · ${escape(o.customer_name)} · ${escape(o.package_name ?? "Tote rental")}</p><table><thead><tr><th>Asset</th><th>Type</th><th>Current status</th></tr></thead><tbody>${lines || "<tr><td colspan=\"3\">No equipment is assigned yet.</td></tr>"}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  }
  return (
    <main className="record order-record">
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
        <div className="record-actions">
          {status === "final_invoice_review" && <button className="primary" disabled={saving} onClick={() => void finalizeOrder("completed")}>{saving ? "Working…" : "Mark complete"}</button>}
          {status === "completed" && <button className="primary" disabled={saving} onClick={() => void finalizeOrder("closed")}>{saving ? "Working…" : "Close order"}</button>}
          {status === "closed" && <span className="inventory-ready">Order closed</span>}
          <button className="danger" onClick={() => void removeRecord()} disabled={saving}>
            Delete order
          </button>
        </div>
      </header>
      {error && <p className="form-error">{error}</p>}
      {notice && <p className="scan-status">{notice}</p>}
      <nav className="order-workflow" aria-label="Order lifecycle">
        {workflow.map((step, index) => (
          <a
            href={step.href}
            key={step.label}
            className={index === currentWorkflowIndex ? "current" : index < currentWorkflowIndex ? "complete" : ""}
          >
            <span>{step.label}</span>
            <strong>{step.detail}</strong>
          </a>
        ))}
      </nav>
      <div className="record-kpis">
        <article>
          <span>Balance due</span>
          <strong>{money(o.balance_due_cents)}</strong>
        </article>
        <article>
          <span>Delivery</span>
          <strong>{date(o.scheduled_delivery_date)}</strong>
          <small>{String(o.preferred_delivery_window ?? "Time not selected")}</small>
        </article>
        <article>
          <span>Pickup</span>
          <strong>{date(o.scheduled_pickup_date)}</strong>
          <small>{String(o.preferred_pickup_window ?? "Time not selected")}</small>
        </article>
      </div>
      <nav className="record-jump-nav" aria-label="Order workspace sections">
        <a href="#schedule">Schedule</a>
        <a href="#equipment">Equipment</a>
        <a href="#pricing">Pricing</a>
        <a href="#billing">Contracts & billing</a>
        <a href="#history">History</a>
      </nav>
      <section className="record-editor" id="schedule">
        <h2>Customer schedule & addresses</h2>
        <div className="record-grid">
          <div>
            <strong>Delivery</strong>
            <p>
              {date(o.scheduled_delivery_date)}
              <br />
              <b>Requested: {String(o.preferred_delivery_window ?? "No preference")}</b>
              {Boolean(o.confirmed_delivery_window_start || o.confirmed_delivery_window_end) && <><br />Confirmed: {String(o.confirmed_delivery_window_start ?? "—")}–{String(o.confirmed_delivery_window_end ?? "—")}</>}
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
              <b>Requested: {String(o.preferred_pickup_window ?? "No preference")}</b>
              {Boolean(o.confirmed_pickup_window_start || o.confirmed_pickup_window_end) && <><br />Confirmed: {String(o.confirmed_pickup_window_start ?? "—")}–{String(o.confirmed_pickup_window_end ?? "—")}</>}
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
          <div>
            <strong>Selected package</strong>
            <p>
              <b>{String(o.package_name ?? "No package selected")}</b>
              <br />
              {String(o.package_description ?? "Package details unavailable.")}
              <br />
              {Number(o.package_tote_quantity ?? 0)} totes · {Number(o.package_dolly_quantity ?? 0)} dollies · {Number(o.package_included_rental_days ?? 0)} included rental days
            </p>
          </div>
        </div>
        <form className="record-form" onSubmit={saveSchedule}>
          <div className="form-pair">
            <label>
              Delivery date
              <input
                name="deliveryDate"
                type="date"
                defaultValue={String(o.scheduled_delivery_date ?? "").slice(
                  0,
                  10,
                )}
              />
            </label>
            <label>
              Pickup date
              <input
                name="pickupDate"
                type="date"
                defaultValue={String(o.scheduled_pickup_date ?? "").slice(
                  0,
                  10,
                )}
              />
            </label>
          </div>
          <div className="form-pair">
            <label>
              Requested delivery window
              <select name="preferredDeliveryWindow" defaultValue={String(o.preferred_delivery_window ?? "")}>
                <option value="">No preference</option><option>Morning (8–11 AM)</option><option>Midday (11 AM–2 PM)</option><option>Afternoon (2–5 PM)</option>
              </select>
            </label>
            <label>
              Requested pickup window
              <select name="preferredPickupWindow" defaultValue={String(o.preferred_pickup_window ?? "")}>
                <option value="">No preference</option><option>Morning (8–11 AM)</option><option>Midday (11 AM–2 PM)</option><option>Afternoon (2–5 PM)</option>
              </select>
            </label>
          </div>
          <div className="form-pair">
            <label>Confirmed delivery start<input name="confirmedDeliveryWindowStart" type="time" defaultValue={String(o.confirmed_delivery_window_start ?? "")} /></label>
            <label>Confirmed delivery end<input name="confirmedDeliveryWindowEnd" type="time" defaultValue={String(o.confirmed_delivery_window_end ?? "")} /></label>
          </div>
          <div className="form-pair">
            <label>Confirmed pickup start<input name="confirmedPickupWindowStart" type="time" defaultValue={String(o.confirmed_pickup_window_start ?? "")} /></label>
            <label>Confirmed pickup end<input name="confirmedPickupWindowEnd" type="time" defaultValue={String(o.confirmed_pickup_window_end ?? "")} /></label>
          </div>
          <label>
            Delivery street
            <input
              name="deliveryStreet"
              defaultValue={String(o.delivery_street ?? "")}
            />
          </label>
          <div className="form-pair">
            <label>
              Delivery city
              <input
                name="deliveryCity"
                defaultValue={String(o.delivery_city ?? "")}
              />
            </label>
            <label>
              Delivery ZIP
              <input
                name="deliveryZip"
                defaultValue={String(o.delivery_zip ?? "")}
              />
            </label>
          </div>
          <label>
            Pickup street
            <input
              name="pickupStreet"
              defaultValue={String(o.pickup_street ?? "")}
            />
          </label>
          <div className="form-pair">
            <label>
              Pickup city
              <input
                name="pickupCity"
                defaultValue={String(o.pickup_city ?? "")}
              />
            </label>
            <label>
              Pickup ZIP
              <input
                name="pickupZip"
                defaultValue={String(o.pickup_zip ?? "")}
              />
            </label>
          </div>
          <label>
            Customer schedule/access notes
            <textarea
              name="customerNotes"
              defaultValue={String(o.customer_notes ?? "")}
            />
          </label>
          <button className="secondary" disabled={saving}>
            {saving ? "Saving…" : "Save schedule & addresses"}
          </button>
        </form>
      </section>
      <div className="record-grid">
        <section>
          <div className="section-heading">
            <div>
              <h2>Package pick list</h2>
              <p className="empty">{String(o.package_name ?? "No package selected")} · stage this equipment for delivery.</p>
            </div>
            <button type="button" className="secondary no-print" onClick={printPickList}>
              Print pick list
            </button>
          </div>
          {equipment.map((item) => (
            <div className="record-row" key={item.type}>
              <div>
                <strong>{item.label}</strong>
                <span>{item.required} required · {item.assigned} assigned · {item.cleanAvailable} clean and available</span>
              </div>
              <b>{item.stillNeeded ? `${item.stillNeeded} to assign` : "Ready"}</b>
            </div>
          ))}
          {assets.length ? <p className="desk-hint">Assigned assets are listed in Dispatch & equipment below.</p> : <p className="desk-hint">No serialized equipment has been assigned yet. Reserve the package inventory before staging.</p>}
        </section>
        <section id="pricing">
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
        <section id="equipment">
          <div className="section-heading">
            <h2>Dispatch & equipment</h2>
            <button type="button" className="primary" disabled={saving || !hasEquipmentAction} onClick={() => void advanceEquipment()}>
              {saving ? "Working…" : equipmentActionLabel}
            </button>
          </div>
          <p className="desk-hint">One guided action moves all assigned equipment through: stage, load, deliver, pick up, then warehouse return.</p>
          <div className="record-grid">
            <section>
              <h3>Assign package equipment</h3>
              <p className="desk-hint">Assigns all remaining totes and dollies required by this package in one action.</p>
              <button type="button" className="primary" disabled={saving} onClick={() => void assignPackageEquipment()}>{saving ? "Working…" : "Assign required equipment"}</button>
            </section>
            <section>
              <h3>Assign specific equipment</h3>
              <form className="record-form" onSubmit={assignSelectedEquipment}>
                <label>Available equipment (select multiple)<select name="assetIds" multiple size={6}>{assignableAssets.map((asset) => <option key={String(asset.id)} value={String(asset.id)}>{String(asset.asset_number)} · {words(asset.asset_type)}</option>)}</select></label>
                <button className="secondary" disabled={saving || !assignableAssets.length}>{saving ? "Working…" : "Assign selected equipment"}</button>
              </form>
            </section>
          </div>
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
        <section id="billing">
          <div className="section-heading">
            <div><h2>Contracts & billing</h2><p className="desk-hint">Generate an immutable customer contract with the current order, price, dates, addresses, and equipment terms.</p></div>
            <button type="button" className="primary no-print" disabled={saving} onClick={() => void generateContract()}>{saving ? "Working…" : agreements.some((agreement) => String(agreement.status) === "accepted") ? "Contract signed" : agreements.length ? "Regenerate contract" : "Generate contract"}</button>
          </div>
          {agreements.map((a, i) => (
            <a className="record-row" href={`/agreements/${String(a.id)}`} key={i}>
              <div>
                <strong>{String(a.agreement_number)}</strong>
                <span>
                  {words(a.status)} · Verify {String(a.verification_code)}
                </span>
              </div>
              <b>{a.signed_pdf_document_id ? "Signed PDF" : a.unsigned_pdf_document_id ? "Contract PDF" : "Open"}</b>
            </a>
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
        <section id="history">
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
