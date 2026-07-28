"use client";
import { FormEvent, useEffect, useState } from "react";
type A = Record<string, unknown>;
export function CustomerAddresses({ id }: { id: string }) {
  const [items, setItems] = useState<A[]>([]),
    [message, setMessage] = useState("");
  const load = async () => {
    const r = await fetch(`/api/customers/${id}/addresses`);
    if (r.ok) setItems(((await r.json()) as { addresses: A[] }).addresses);
  };
  useEffect(() => {
    void load();
  }, [id]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = await fetch(`/api/customers/${id}/addresses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
    });
    setMessage(r.ok ? "Address added." : "Could not add address.");
    if (r.ok) {
      e.currentTarget.reset();
      void load();
    }
  }
  return (
    <section className="record-editor">
      <h2>Saved addresses</h2>
      {items.map((a) => (
        <div className="record-row" key={String(a.id)}>
          <div>
            <strong>{String(a.label)}</strong>
            <span>
              {String(a.street)}
              {a.unit ? `, ${String(a.unit)}` : ""} · {String(a.city)},{" "}
              {String(a.state)} {String(a.zip)}
            </span>
          </div>
        </div>
      ))}
      <form className="record-form" onSubmit={save}>
        <div className="form-pair">
          <label>
            Label
            <input name="label" placeholder="Home, office, storage" required />
          </label>
          <label>
            Street
            <input name="street" required />
          </label>
        </div>
        <div className="form-pair">
          <label>
            City
            <input name="city" required />
          </label>
          <label>
            ZIP
            <input name="zip" required />
          </label>
        </div>
        <label>
          Access instructions
          <textarea name="accessNotes" />
        </label>
        <button className="secondary">Add saved address</button>
        {message && <p className="desk-hint">{message}</p>}
      </form>
    </section>
  );
}
