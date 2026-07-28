"use client";
import { FormEvent, useEffect, useState } from "react";
export function CustomerEditor({ id }: { id: string }) {
  const [customer, setCustomer] = useState<Record<string, unknown> | null>(
      null,
    ),
    [open, setOpen] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    fetch(`/api/customers/${id}`).then(
      async (r) =>
        r.ok &&
        setCustomer(
          ((await r.json()) as { customer: Record<string, unknown> }).customer,
        ),
    );
    const openEditor = () => setOpen(true);
    window.addEventListener("open-customer-editor", openEditor);
    return () => window.removeEventListener("open-customer-editor", openEditor);
  }, [id]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("Saving…");
    const r = await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
    });
    setMessage(r.ok ? "Saved." : "Could not save changes.");
    if (r.ok) setTimeout(() => setOpen(false), 450);
  }
  if (!customer) return null;
  return (
    <>
      {open && (
        <div
          className="record-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Edit customer"
        >
          <section className="record-editor">
            <header>
              <h2>Edit customer</h2>
              <button onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </header>
            <form className="record-form" onSubmit={save}>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  defaultValue={String(customer.email ?? "")}
                />
              </label>
              <label>
                Phone
                <input
                  name="phone"
                  defaultValue={String(customer.primary_phone ?? "")}
                />
              </label>
              <label>
                Operational notes
                <textarea
                  name="notes"
                  defaultValue={String(customer.notes ?? "")}
                />
              </label>
              <button className="primary">Save customer changes</button>
              {message && <p className="desk-hint">{message}</p>}
            </form>
          </section>
        </div>
      )}
    </>
  );
}
