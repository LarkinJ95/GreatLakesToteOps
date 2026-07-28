"use client";
import { useEffect, useState } from "react";
type Inquiry = {
  id: string;
  inquiry_type: string;
  name: string;
  email: string;
  phone: string | null;
  payload_json: string;
  status: string;
  created_at: string;
};
export function InquiryDesk() {
  const [items, setItems] = useState<Inquiry[]>([]),
    [error, setError] = useState("");
  const load = () =>
    fetch("/api/inquiries")
      .then(async (r) => {
        if (!r.ok) throw new Error("Sign in is required to view inquiries.");
        setItems(((await r.json()) as { inquiries: Inquiry[] }).inquiries);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  async function status(id: string, status: string) {
    const r = await fetch("/api/inquiries", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (r.ok) void load();
  }
  return (
    <main className="desk">
      <header className="desk-header">
        <a href="/ops" className="back">
          ← ToteOps
        </a>
        <div>
          <p className="eyebrow">PUBLIC INBOX</p>
          <h1>New inquiries</h1>
        </div>
        <a className="login-link" href="/customers">
          Customers →
        </a>
      </header>
      <section className="order-list">
        <div>
          <p className="eyebrow">CUSTOMER REQUESTS</p>
          <h2>Availability and booking requests</h2>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="orders-table">
          {items.map((i) => (
            <article key={i.id}>
              <div>
                <strong>{i.name}</strong>
                <span>
                  {i.inquiry_type.replaceAll("_", " ")} · {i.email}
                  {i.phone ? ` · ${i.phone}` : ""}
                </span>
              </div>
              <div>
                <span>{new Date(i.created_at).toLocaleString()}</span>
                <b>{i.status}</b>
              </div>
              <div className="order-actions">
                <a className="order-for-customer" href={`/customers`}>
                  Create customer
                </a>
                <button
                  className="secondary"
                  onClick={() =>
                    void status(
                      i.id,
                      i.status === "new" ? "reviewing" : "contacted",
                    )
                  }
                >
                  {i.status === "new" ? "Review" : "Contacted"}
                </button>
              </div>
            </article>
          ))}
        </div>
        {!error && items.length === 0 && (
          <p className="empty">No public inquiries yet.</p>
        )}
      </section>
    </main>
  );
}
