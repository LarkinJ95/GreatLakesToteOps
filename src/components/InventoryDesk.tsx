"use client";
import { FormEvent, useEffect, useState } from "react";
type Asset = {
  id: string;
  asset_number: string;
  asset_type: string;
  current_status: string;
  color: string | null;
  replacement_cost_cents: number;
  last_scan_at: string | null;
};
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
export function InventoryDesk() {
  const [assets, setAssets] = useState<Asset[]>([]),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  async function load() {
    const r = await fetch("/api/assets");
    if (!r.ok) {
      setError("Sign in is required to manage inventory.");
      return;
    }
    setAssets(((await r.json()) as { assets: Asset[] }).assets);
  }
  useEffect(() => {
    void load();
  }, []);
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/assets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        assetType: f.get("assetType"),
        quantity: Number(f.get("quantity")),
        replacementCostCents: Math.round(
          Number(f.get("replacementCostUsd")) * 100,
        ),
        color: f.get("color"),
      }),
    });
    const p = (await r.json().catch(() => null)) as {
      quantity?: number;
      error?: { message?: string };
    } | null;
    if (!r.ok) setError(p?.error?.message ?? "Asset could not be added");
    else {
      e.currentTarget.reset();
      setStatus(`${p?.quantity ?? 1} asset${p?.quantity === 1 ? "" : "s"} added. Receive them into clean inventory when ready.`);
      void load();
    }
    setSaving(false);
  }
  async function receive(asset: Asset) {
    setStatus("");
    const r = await fetch("/api/scans", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-device-id": "staff-inventory-desk",
      },
      body: JSON.stringify({
        idempotencyKey: `receive:${asset.id}:${Date.now()}`,
        assetIdentifier: asset.asset_number,
        mode: "receive",
      }),
    });
    const p = (await r.json().catch(() => null)) as {
      message?: string;
      error?: { message?: string };
    } | null;
    setStatus(
      r.ok
        ? `${asset.asset_number} received into clean inventory.`
        : (p?.message ?? p?.error?.message ?? "Scan failed"),
    );
    if (r.ok) void load();
  }
  return (
    <main className="desk">
      <header className="desk-header">
        <a href="/ops" className="back">
          ← ToteOps
        </a>
        <div>
          <p className="eyebrow">WAREHOUSE</p>
          <h1>Inventory desk</h1>
        </div>
        <a className="login-link" href="/orders">
          Order desk →
        </a>
      </header>
      <section className="desk-grid">
        <form className="create-order" onSubmit={add}>
          <p className="eyebrow">NEW ASSET</p>
          <h2>Add equipment</h2>
          <label>
            Asset type
            <select name="assetType" defaultValue="tote">
              <option value="tote">Tote</option>
              <option value="dolly">Dolly</option>
              <option value="hand_truck">Hand truck</option>
              <option value="blanket_pack">Blanket pack</option>
              <option value="trailer">Trailer</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Quantity
            <input name="quantity" type="number" min="1" max="100" step="1" defaultValue="1" required />
          </label>
          <label>
            Replacement value (USD)
            <input
              name="replacementCostUsd"
              type="number"
              min="0"
              step="0.01"
              defaultValue="25.00"
              required
            />
          </label>
          <label>
            Color
            <input name="color" placeholder="Blue" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary" disabled={saving}>
            {saving ? "Adding…" : "Add assets"}
          </button>
          <p className="desk-hint">
            New assets must be received before they can be reserved or scanned
            into a rental.
          </p>
        </form>
        <section className="order-list">
          <div>
            <p className="eyebrow">EQUIPMENT REGISTER</p>
            <h2>Assets</h2>
          </div>
          {status && <p className="scan-status">{status}</p>}
          <div className="orders-table">
            {assets.map((a) => (
              <article key={a.id}>
                <div>
                  <a className="record-link" href={`/inventory/${a.id}`}>
                    {a.asset_number}
                  </a>
                  <span>
                    {a.asset_type.replaceAll("_", " ")} ·{" "}
                    {a.color || "No color"}
                  </span>
                </div>
                <div>
                  <span>{a.current_status.replaceAll("_", " ")}</span>
                  <b>{money(a.replacement_cost_cents)}</b>
                </div>
                {a.current_status === "new" ? (
                  <button className="secondary" onClick={() => void receive(a)}>
                    Receive
                  </button>
                ) : (
                  <em>{a.current_status.replaceAll("_", " ")}</em>
                )}
              </article>
            ))}
          </div>
          {assets.length === 0 && (
            <p className="empty">No equipment has been added yet.</p>
          )}
        </section>
      </section>
    </main>
  );
}
