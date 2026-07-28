"use client";
import { FormEvent, useEffect, useState } from "react";
type Row = Record<string, unknown>;
const words = (v: unknown) => String(v ?? "").replaceAll("_", " ");
export function AssignmentWorkspace({ id }: { id: string }) {
  const [a, setA] = useState<Row | null>(null),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false);
  const load = async () => {
    const r = await fetch(`/api/assignments/${id}`);
    if (r.ok) setA(((await r.json()) as { assignment: Row }).assignment);
    else setMessage("Unable to load assignment.");
  };
  useEffect(() => {
    void load();
  }, [id]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.currentTarget),
      r = await fetch(`/api/assignments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(f)),
      });
    setMessage(
      r.ok ? "Dispatch assignment saved." : "Assignment could not be saved.",
    );
    if (r.ok) void load();
    setSaving(false);
  }
  if (!a)
    return (
      <main className="record">
        <p>{message || "Loading dispatch assignment…"}</p>
      </main>
    );
  return (
    <main className="record">
      <a className="back" href="/dispatch">
        ← Dispatch
      </a>
      <header>
        <div>
          <p className="eyebrow">DISPATCH WORKSPACE</p>
          <h1>{String(a.assignment_number)}</h1>
          <span>
            {words(a.assignment_type)} ·{" "}
            {String(a.customer_name ?? "Warehouse task")} · {words(a.status)}
          </span>
        </div>
        {Boolean(a.order_id) && (
          <a className="primary" href={`/orders/${String(a.order_id)}`}>
            Open order
          </a>
        )}
      </header>
      <div className="record-grid">
        <section>
          <h2>Schedule & progress</h2>
          <form className="record-form" onSubmit={save}>
            <label>
              Status
              <select name="status" defaultValue={String(a.status)}>
                {[
                  "scheduled",
                  "en_route",
                  "arrived",
                  "in_progress",
                  "completed",
                  "failed",
                  "cancelled",
                ].map((v) => (
                  <option value={v} key={v}>
                    {words(v)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Scheduled date
              <input
                name="scheduledDate"
                type="date"
                defaultValue={String(a.scheduled_date ?? "")}
              />
            </label>
            <div className="form-pair">
              <label>
                Window start
                <input
                  name="windowStart"
                  type="time"
                  defaultValue={String(a.window_start ?? "")}
                />
              </label>
              <label>
                Window end
                <input
                  name="windowEnd"
                  type="time"
                  defaultValue={String(a.window_end ?? "")}
                />
              </label>
            </div>
            <label>
              Completion / dispatch notes
              <textarea
                name="notes"
                defaultValue={String(a.completion_notes ?? "")}
              />
            </label>
            <button className="primary" disabled={saving}>
              {saving ? "Saving…" : "Save assignment"}
            </button>
            {message && <p className="desk-hint">{message}</p>}
          </form>
        </section>
        <section>
          <h2>Operational details</h2>
          <div className="record-row">
            <strong>Priority</strong>
            <b>{String(a.priority)}</b>
          </div>
          <div className="record-row">
            <strong>Order</strong>
            <span>{String(a.order_number ?? "None")}</span>
          </div>
        </section>
      </div>
    </main>
  );
}
