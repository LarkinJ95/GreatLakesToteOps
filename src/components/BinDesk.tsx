"use client";
import { FormEvent, useEffect, useState } from "react";
type Bin = {
  id: string;
  code: string;
  location_code: string;
  bin_type: string;
  customer_name: string | null;
  order_number: string | null;
  customer_id: string | null;
  order_id: string | null;
};
type Order = { id: string; order_number: string; customer_name: string };
type Customer = {
  id: string;
  customer_number: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
};
type Location = { id: string; code: string; name: string };
export function BinDesk() {
  const [bins, setBins] = useState<Bin[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [customers, setCustomers] = useState<Customer[]>([]),
    [locations, setLocations] = useState<Location[]>([]),
    [message, setMessage] = useState("");
  const load = async () => {
    const [b, o, c] = await Promise.all([
      fetch("/api/bins"),
      fetch("/api/orders"),
      fetch("/api/customers"),
    ]);
    if (b.ok) {
      const data = (await b.json()) as { bins: Bin[]; locations: Location[] };
      setBins(data.bins);
      setLocations(data.locations);
    }
    if (o.ok) setOrders(((await o.json()) as { orders: Order[] }).orders);
    if (c.ok)
      setCustomers(((await c.json()) as { customers: Customer[] }).customers);
  };
  useEffect(() => {
    void load();
  }, []);
  async function assign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      r = await fetch("/api/bins", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(f)),
      });
    setMessage(r.ok ? "Bin assignment saved." : "Could not assign that bin.");
    if (r.ok) void load();
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      const f = new FormData(form);
      const r = await fetch("/api/bins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(f)),
      });
      const p = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!r.ok) {
        setMessage(p?.error?.message ?? "Could not create bin.");
        return;
      }
      form.reset();
      setMessage("Bin created and ready to assign.");
      await load();
    } catch {
      setMessage("The bin was created, but the screen could not refresh. Reload to view it.");
    }
  }
  return (
    <main className="desk">
      <header className="desk-header">
        <a className="back" href="/inventory">
          ← Inventory
        </a>
        <div>
          <p className="eyebrow">WAREHOUSE LOCATIONS</p>
          <h1>Bin assignments</h1>
        </div>
      </header>
      <section className="desk-grid">
        <form className="create-order" onSubmit={assign}>
          <p className="eyebrow">ASSIGN BIN</p>
          <h2>Hold for customer or order</h2>
          <label>
            Bin
            <select name="binId" required>
              <option value="">Choose bin</option>
              {bins.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.location_code} · {b.code}{" "}
                  {b.order_number ? `— ${b.order_number}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Order
            <select name="orderId">
              <option value="">No order</option>
              {orders.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.order_number} · {o.customer_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Customer
            <select name="customerId">
              <option value="">No customer</option>
              {customers.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.business_name || `${c.first_name} ${c.last_name}`} ·{" "}
                  {c.customer_number}
                </option>
              ))}
            </select>
          </label>
          <label>
            Purpose
            <input
              name="purpose"
              placeholder="Customer hold, staging, returns…"
            />
          </label>
          <label>
            Notes
            <textarea name="notes" />
          </label>
          <button className="primary">Save bin assignment</button>
          {message && <p className="desk-hint">{message}</p>}
        </form>
        <div className="record-grid">
          <form className="create-order" onSubmit={create}>
            <p className="eyebrow">CREATE BIN</p>
            <h2>Add a physical bin</h2>
            <label>
              Warehouse location
              <select name="storageLocationId" required>
                <option value="">Choose location</option>
                {locations.map((location) => <option value={location.id} key={location.id}>{location.code} · {location.name}</option>)}
              </select>
            </label>
            <label>Bin code<input name="code" placeholder="A-01" required /></label>
            <label>Label<input name="label" placeholder="Clean tote shelf A-01" /></label>
            <label>
              Bin type
              <select name="binType" defaultValue="general">
                <option value="general">General</option><option value="staging">Staging</option><option value="customer_hold">Customer hold</option><option value="returns">Returns</option><option value="repair">Repair</option><option value="quarantine">Quarantine</option>
              </select>
            </label>
            <label>Notes<textarea name="notes" /></label>
            <button className="secondary">Create bin</button>
            <p className="desk-hint">Bins are physical locations. Create them here first; then they appear in the assignment dropdown.</p>
          </form>
          <section className="order-list">
          <p className="eyebrow">BIN MAP</p>
          <h2>Active bins</h2>
          <div className="orders-table">
            {bins.map((b) => (
              <article key={b.id}>
                <div>
                  <strong>
                    {b.location_code} · {b.code}
                  </strong>
                  <span>{b.bin_type.replaceAll("_", " ")}</span>
                </div>
                <div>
                  <span>
                    {b.order_number || b.customer_name || "Available"}
                  </span>
                </div>
                {b.order_id ? (
                  <a className="record-link" href={`/orders/${b.order_id}`}>
                    Open order
                  </a>
                ) : b.customer_id ? (
                  <a
                    className="record-link"
                    href={`/customers/${b.customer_id}`}
                  >
                    Open customer
                  </a>
                ) : (
                  <em>Available</em>
                )}
              </article>
            ))}
          </div>
          </section>
        </div>
      </section>
    </main>
  );
}
