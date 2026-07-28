"use client";
import { FormEvent, useEffect, useState } from "react";

type Customer = {
  id: string;
  customer_number: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
};
type Package = {
  id: string;
  name: string;
  tote_quantity: number;
  dolly_quantity: number;
  included_rental_days: number;
  launch_price_cents: number;
};
type Order = {
  id: string;
  order_number: string;
  order_status: string;
  scheduled_delivery_date: string | null;
  scheduled_pickup_date: string | null;
  total_cents: number;
  customer_name: string;
};
const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

export function OrderDesk() {
  const [customers, setCustomers] = useState<Customer[]>([]),
    [packages, setPackages] = useState<Package[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  async function load() {
    const [a, b, c] = await Promise.all([
      fetch("/api/customers"),
      fetch("/api/packages"),
      fetch("/api/orders"),
    ]);
    if (!a.ok || !b.ok || !c.ok) {
      setError("Sign in is required to use the order desk.");
      return;
    }
    setCustomers(((await a.json()) as { customers: Customer[] }).customers);
    setPackages(((await b.json()) as { packages: Package[] }).packages);
    setOrders(((await c.json()) as { orders: Order[] }).orders);
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const f = new FormData(event.currentTarget);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerId: f.get("customerId"),
        packageId: f.get("packageId"),
        rentalStartDate: f.get("delivery"),
        scheduledDeliveryDate: f.get("delivery"),
        scheduledPickupDate: f.get("pickup"),
        customerNotes: f.get("notes"),
      }),
    });
    if (!res.ok) {
      const p = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(p?.error?.message ?? "Order could not be created");
    } else {
      event.currentTarget.reset();
      void load();
    }
    setSaving(false);
  }
  async function advance(order: Order) {
    const next: Record<string, string> = {
      inquiry: "quote",
      quote: "awaiting_customer_approval",
      awaiting_customer_approval: "awaiting_agreement",
      awaiting_agreement: "awaiting_payment",
      awaiting_payment: "confirmed",
      confirmed: "equipment_reserved",
      equipment_reserved: "staged",
      staged: "delivery_assigned",
      delivery_assigned: "out_for_delivery",
      out_for_delivery: "delivered",
      delivered: "active_rental",
      active_rental: "pickup_scheduled",
      pickup_scheduled: "pickup_assigned",
      pickup_assigned: "picked_up",
      picked_up: "equipment_reconciliation",
      equipment_reconciliation: "cleaning",
      cleaning: "final_invoice_review",
    };
    const toStatus = next[order.order_status];
    if (!toStatus) return;
    const r = await fetch(`/api/orders/${order.id}/transition`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toStatus }),
    });
    const p = (await r.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    if (!r.ok) setError(p?.error?.message ?? "Order cannot advance yet");
    else await load();
  }
  return (
    <main className="desk">
      <header className="desk-header">
        <a href="/ops" className="back">
          ← ToteOps
        </a>
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>Order desk</h1>
        </div>
        <a className="login-link" href="/customers">
          Customers →
        </a>
      </header>
      <section className="desk-grid">
        <form className="create-order" onSubmit={submit}>
          <p className="eyebrow">NEW RENTAL</p>
          <h2>Create an order</h2>
          <label>
            Customer
            <select name="customerId" required>
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.business_name || `${c.first_name} ${c.last_name}`} ·{" "}
                  {c.customer_number}
                </option>
              ))}
            </select>
          </label>
          <label>
            Package
            <select name="packageId" required>
              <option value="">Select a package</option>
              {packages.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name} · {p.tote_quantity} totes ·{" "}
                  {money(p.launch_price_cents)}
                </option>
              ))}
            </select>
          </label>
          <div className="form-pair">
            <label>
              Delivery
              <input name="delivery" type="date" required />
            </label>
            <label>
              Pickup
              <input name="pickup" type="date" required />
            </label>
          </div>
          <label>
            Customer notes
            <textarea name="notes" rows={3} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary" disabled={saving}>
            {saving ? "Creating…" : "Create order"}
          </button>
          <p className="desk-hint">
            Need a customer first? Use the Customers desk.
          </p>
        </form>
        <section className="order-list">
          <div>
            <p className="eyebrow">LIVE PIPELINE</p>
            <h2>Recent orders</h2>
          </div>
          {orders.length === 0 ? (
            <p className="empty">
              No orders yet. Your first rental starts here.
            </p>
          ) : (
            <div className="orders-table">
              {orders.map((o) => (
                <article key={o.id}>
                  <div>
                    <strong>{o.order_number}</strong>
                    <span>{o.customer_name}</span>
                  </div>
                  <div>
                    <span>{o.scheduled_delivery_date ?? "Unscheduled"}</span>
                    <b>{money(o.total_cents)}</b>
                  </div>
                  <div className="order-actions">
                    <em>{o.order_status.replaceAll("_", " ")}</em>
                    {![
                      "final_invoice_review",
                      "completed",
                      "closed",
                      "cancelled",
                    ].includes(o.order_status) && (
                      <button
                        className="secondary"
                        onClick={() => void advance(o)}
                      >
                        Advance
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
