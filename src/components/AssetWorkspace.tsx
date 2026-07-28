"use client";
import { FormEvent, useEffect, useState } from "react";
import QRCode from "qrcode";
type Row = Record<string, unknown>;
const words = (v: unknown) => String(v ?? "").replaceAll("_", " ");
const date = (v: unknown) => (v ? new Date(String(v)).toLocaleString() : "—");
export function AssetWorkspace({ id }: { id: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null),
    [qr, setQr] = useState(""),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false);
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
        mode: f.get("mode"),
        notes: f.get("notes"),
        condition: f.get("condition"),
        outcome: f.get("outcome"),
      }),
    });
    const p = (await r.json().catch(() => null)) as {
      message?: string;
      error?: { message?: string };
    } | null;
    setMessage(
      r.ok
        ? `Recorded ${String(f.get("mode")).replaceAll("_", " ")}.`
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
    <main className="record">
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
        <a className="primary" href={`/inventory/${id}/print`}>
          Print QR label
        </a>
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
              <select name="mode">
                <option value="receive">Receive into clean inventory</option>
                <option value="stage">Stage</option>
                <option value="load">Load for delivery</option>
                <option value="deliver">Deliver</option>
                <option value="pickup">Pickup</option>
                <option value="warehouse_return">Warehouse return</option>
                <option value="clean_start">Start cleaning</option>
                <option value="clean_complete">Finish cleaning</option>
                <option value="inspect">Inspect</option>
                <option value="quarantine">Quarantine</option>
                <option value="repair">Send to repair</option>
                <option value="mark_missing">Mark missing</option>
              </select>
            </label>
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
            <label>
              Inspection outcome
              <select name="outcome">
                <option value="pass">Pass</option>
                <option value="repair">Repair</option>
                <option value="quarantine">Quarantine</option>
              </select>
            </label>
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
