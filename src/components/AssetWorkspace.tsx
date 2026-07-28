"use client";
import { FormEvent, useEffect, useState } from "react";
import QRCode from "qrcode";
type Row = Record<string, unknown>;
const words = (v: unknown) => String(v ?? "").replaceAll("_", " ");
const date = (v: unknown) => (v ? new Date(String(v)).toLocaleString() : "—");
const movementActions: Record<string, { mode: string; label: string; help: string }[]> = {
  new: [{ mode: "receive", label: "Receive into clean inventory", help: "New equipment is ready to enter clean inventory." }],
  clean_inventory: [{ mode: "stage", label: "Stage for an order", help: "Moves the item from clean inventory to staging." }, { mode: "quarantine", label: "Quarantine", help: "Use only when the item needs review." }, { mode: "retire", label: "Retire", help: "Permanently removes unusable equipment from service." }],
  reserved: [{ mode: "stage", label: "Stage for an order", help: "Prepare the reserved item for delivery." }, { mode: "unstage", label: "Return to clean inventory", help: "Releases this reservation back to clean inventory." }],
  staged: [{ mode: "load", label: "Load for delivery", help: "Moves a staged item onto the vehicle." }, { mode: "unstage", label: "Return to clean inventory", help: "Returns the item to clean inventory." }],
  loaded: [{ mode: "deliver", label: "Deliver", help: "Confirm the item was delivered." }, { mode: "unload", label: "Unload to staging", help: "Moves the item back to staging." }],
  out_for_delivery: [{ mode: "deliver", label: "Deliver", help: "Confirm the item was delivered." }],
  delivered: [{ mode: "pickup", label: "Pick up", help: "Confirm the item was collected from the customer." }, { mode: "mark_missing", label: "Mark missing", help: "Use only when the item cannot be located." }],
  rented: [{ mode: "pickup", label: "Pick up", help: "Confirm the item was collected from the customer." }, { mode: "mark_missing", label: "Mark missing", help: "Use only when the item cannot be located." }],
  pickup_scheduled: [{ mode: "pickup", label: "Pick up", help: "Confirm the item was collected from the customer." }, { mode: "mark_missing", label: "Mark missing", help: "Use only when the item cannot be located." }],
  picked_up: [{ mode: "warehouse_return", label: "Return to warehouse", help: "Marks the item dirty and ready for cleaning." }, { mode: "quarantine", label: "Quarantine", help: "Use only when the item needs review." }],
  dirty_return: [{ mode: "clean_start", label: "Start cleaning", help: "Moves the returned item into cleaning." }, { mode: "quarantine", label: "Quarantine", help: "Use only when the item needs review." }],
  cleaning: [{ mode: "clean_complete", label: "Finish cleaning", help: "Moves the item to inspection." }],
  inspection_required: [{ mode: "inspect", label: "Inspect", help: "Pass returns it to clean inventory; other outcomes keep it out of service." }],
  repair_required: [{ mode: "inspect", label: "Inspect after repair", help: "Choose Pass to return the item to clean inventory." }],
  quarantine: [{ mode: "repair", label: "Send to repair", help: "Moves the quarantined item to repair required." }],
  damaged: [{ mode: "repair", label: "Send to repair", help: "Moves the damaged item to repair required." }],
  missing: [{ mode: "recover", label: "Recover item", help: "Returns a recovered item as a dirty return for cleaning." }],
};
export function AssetWorkspace({ id }: { id: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null),
    [qr, setQr] = useState(""),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false),
    [mode, setMode] = useState("receive");
  const currentStatus = data ? String((data.asset as Row).current_status) : "";
  const actions = movementActions[currentStatus] ?? [];
  const load = async () => {
    const r = await fetch(`/api/assets/${id}`);
    if (r.ok) setData(await r.json());
    else setMessage("Unable to load asset.");
  };
  useEffect(() => {
    void load();
  }, [id]);
  useEffect(() => {
    if (data)
      void QRCode.toDataURL(`${location.origin}/inventory/${id}`, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: "M",
      }).then(setQr);
  }, [data, id]);
  useEffect(() => {
    if (actions.length && !actions.some((action) => action.mode === mode))
      setMode(actions[0].mode);
  }, [currentStatus, mode, actions]);
  async function scan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    const f = new FormData(e.currentTarget);
    const a = data.asset as Row;
    const r = await fetch("/api/scans", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-device-id": "asset-workspace",
      },
      body: JSON.stringify({
        idempotencyKey: `${id}:${f.get("mode")}:${Date.now()}`,
        assetIdentifier: a.qr_code_value,
        mode,
        notes: f.get("notes"),
        condition: f.get("condition"),
        outcome: mode === "inspect" ? f.get("outcome") : undefined,
      }),
    });
    const p = (await r.json().catch(() => null)) as {
      message?: string;
      error?: { message?: string };
    } | null;
    setMessage(
      r.ok
        ? `Recorded ${mode.replaceAll("_", " ")}.`
        : (p?.message ?? p?.error?.message ?? "Scan was not accepted."),
    );
    if (r.ok) void load();
    setSaving(false);
  }
  async function saveDetails(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.currentTarget);
    const r = await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(f)),
    });
    setMessage(
      r.ok ? "Asset details saved." : "Asset details could not be saved.",
    );
    if (r.ok) void load();
    setSaving(false);
  }
  if (!data)
    return (
      <main className="record">
        <p>{message || "Loading asset…"}</p>
      </main>
    );
  const a = data.asset as Row;
  return (
    <main className="record asset-record">
      <a className="back" href="/inventory">
        ← Inventory
      </a>
      <header>
        <div>
          <p className="eyebrow">ASSET LIFECYCLE</p>
          <h1>{String(a.asset_number)}</h1>
          <span>
            {words(a.asset_type)} · {words(a.current_status)} ·{" "}
            {words(a.current_condition)}
          </span>
        </div>
        <button type="button" className="primary no-print" onClick={() => window.print()}>
          Print QR label
        </button>
      </header>
      <div className="record-grid">
        <section>
          <h2>Operational QR</h2>
          {qr && (
            <img
              className="asset-qr"
              src={qr}
              alt={`QR code for ${String(a.asset_number)}`}
            />
          )}
          <p className="desk-hint">
            Scan opens this asset workspace for a signed-in staff member. Every
            movement is retained below.
          </p>
        </section>
        <section>
          <h2>Asset details</h2>
          <form className="record-form" onSubmit={saveDetails}>
            <label>
              Manufacturer
              <input
                name="manufacturer"
                defaultValue={String(a.manufacturer ?? "")}
              />
            </label>
            <label>
              Model
              <input name="model" defaultValue={String(a.model ?? "")} />
            </label>
            <label>
              Color
              <input name="color" defaultValue={String(a.color ?? "")} />
            </label>
            <label>
              Notes
              <textarea name="notes" defaultValue={String(a.notes ?? "")} />
            </label>
            <button className="secondary" disabled={saving}>
              Save asset details
            </button>
          </form>
        </section>
        <section>
          <h2>Scan movement</h2>
          <form className="record-form" onSubmit={scan}>
            <label>
              Action
              <select name="mode" value={mode} onChange={(event) => setMode(event.target.value)} disabled={!actions.length}>
                {actions.map((action) => <option value={action.mode} key={action.mode}>{action.label}</option>)}
              </select>
            </label>
            <p className="desk-hint">{actions.find((action) => action.mode === mode)?.help ?? "No movement scan is available for this retired item."}</p>
            <label>
              Condition
              <select name="condition">
                <option value="good">Good</option>
                <option value="excellent">Excellent</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="damaged">Damaged</option>
              </select>
            </label>
            {mode === "inspect" && <label>
              Inspection outcome
              <select name="outcome" defaultValue="pass">
                <option value="pass">Pass — return to clean inventory</option>
                <option value="repair">Repair required</option>
                <option value="quarantine">Quarantine</option>
              </select>
            </label>}
            <label>
              Notes
              <textarea name="notes" />
            </label>
            <button className="primary" disabled={saving}>
              {saving ? "Recording…" : "Record scan"}
            </button>
            {message && <p className="desk-hint">{message}</p>}
          </form>
        </section>
        <section>
          <h2>Lifecycle history</h2>
          {((data.history ?? []) as Row[]).map((h, i) => (
            <div className="timeline" key={i}>
              <strong>
                {words(h.from_status)} → {words(h.to_status)}
              </strong>
              <span>
                {date(h.changed_at)} {h.notes ? `· ${String(h.notes)}` : ""}
              </span>
            </div>
          ))}
        </section>
        <section>
          <h2>Order allocation</h2>
          {((data.allocations ?? []) as Row[]).map((o, i) => (
            <a
              className="record-row"
              href={`/orders/${String(o.order_id)}`}
              key={i}
            >
              <strong>{String(o.order_number)}</strong>
              <span>Assigned {date(o.assigned_at)}</span>
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}
