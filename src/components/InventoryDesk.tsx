"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Asset = {
  id: string;
  asset_number: string;
  asset_type: string;
  current_status: string;
  current_condition: string;
  color: string | null;
  replacement_cost_cents: number;
  last_scan_at: string | null;
  order_number: string | null;
  customer_name: string | null;
};
type Count = { current_status: string; count: number };

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
const words = (value: string | null | undefined) =>
  String(value ?? "").replaceAll("_", " ");
const nextStep: Record<string, { mode: string; label: string }> = {
  new: { mode: "receive", label: "Receive" },
  reserved: { mode: "stage", label: "Stage" },
  staged: { mode: "load", label: "Load" },
  loaded: { mode: "deliver", label: "Deliver" },
  out_for_delivery: { mode: "deliver", label: "Deliver" },
  delivered: { mode: "pickup", label: "Pick up" },
  rented: { mode: "pickup", label: "Pick up" },
  pickup_scheduled: { mode: "pickup", label: "Pick up" },
  picked_up: { mode: "warehouse_return", label: "Return to warehouse" },
  dirty_return: { mode: "clean_start", label: "Start cleaning" },
  cleaning: { mode: "clean_complete", label: "Complete cleaning" },
  inspection_required: { mode: "inspect", label: "Pass inspection" },
};
const statusCards = [
  { key: "new", label: "To receive", hint: "New equipment" },
  { key: "dirty_return", label: "Returns", hint: "Need cleaning" },
  { key: "cleaning", label: "Cleaning", hint: "In progress" },
  { key: "inspection_required", label: "Inspect", hint: "Ready to check" },
  { key: "clean_inventory", label: "Ready", hint: "Available to assign" },
  { key: "in_field", label: "In the field", hint: "With a customer" },
] as const;

export function InventoryDesk() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [statusCounts, setStatusCounts] = useState<Count[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const countFor = (key: string) => {
    if (key === "in_field")
      return statusCounts
        .filter((count) => ["delivered", "rented", "pickup_scheduled"].includes(count.current_status))
        .reduce((total, count) => total + count.count, 0);
    return statusCounts.find((count) => count.current_status === key)?.count ?? 0;
  };
  const activeLabel = useMemo(
    () => statusCards.find((card) => card.key === status)?.label ?? "All equipment",
    [status],
  );

  async function load(next = { search, status, type }) {
    const params = new URLSearchParams();
    if (next.search.trim()) params.set("q", next.search.trim());
    if (next.status) params.set("status", next.status);
    if (next.type) params.set("type", next.type);
    const response = await fetch(`/api/assets${params.size ? `?${params}` : ""}`);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(payload?.error?.message ?? "Inventory could not be loaded.");
      return;
    }
    const payload = (await response.json()) as { assets: Asset[]; statusCounts: Count[] };
    setAssets(payload.assets);
    setStatusCounts(payload.statusCounts);
  }
  useEffect(() => { void load({ search: "", status: "", type: "" }); }, []);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true); setError("");
    try {
      const values = new FormData(form);
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetType: values.get("assetType"),
          quantity: Number(values.get("quantity")),
          replacementCostCents: Math.round(Number(values.get("replacementCostUsd")) * 100),
          color: values.get("color"),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { quantity?: number; error?: { message?: string } } | null;
      if (!response.ok) {
        setError(payload?.error?.message ?? "Equipment could not be added.");
        return;
      }
      form.reset();
      setShowAdd(false);
      setMessage(`${payload?.quantity ?? 1} item${payload?.quantity === 1 ? "" : "s"} added to the Receive queue.`);
      await load();
    } catch {
      setError("The equipment could not be added. Nothing was refreshed until the request finished.");
    } finally { setSaving(false); }
  }

  async function move(asset: Asset) {
    const step = nextStep[asset.current_status];
    if (!step) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "content-type": "application/json", "x-device-id": "staff-inventory-desk" },
        body: JSON.stringify({
          idempotencyKey: `inventory-next:${asset.id}:${crypto.randomUUID()}`,
          assetIdentifier: asset.asset_number,
          mode: step.mode,
          ...(step.mode === "inspect" ? { outcome: "pass" } : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string; error?: { message?: string } } | null;
      if (!response.ok) {
        setError(payload?.message ?? payload?.error?.message ?? `${asset.asset_number} could not be moved.`);
        return;
      }
      setMessage(`${asset.asset_number}: ${step.label.toLowerCase()} completed.`);
      await load();
    } catch {
      setError(`${asset.asset_number} could not be moved.`);
    } finally { setSaving(false); }
  }

  function selectQueue(key: string) {
    const nextStatus = key;
    setStatus(nextStatus); setSearch(""); setError("");
    void load({ search: "", status: nextStatus, type });
  }

  return (
    <main className="inventory-desk">
      <header className="inventory-header">
        <div>
          <p className="eyebrow">WAREHOUSE CONTROL</p>
          <h1>Inventory</h1>
          <p>Work the next physical step first. Use the register only when you need to find an item.</p>
        </div>
        <div className="inventory-header-actions">
          <button className="primary" onClick={() => setShowAdd(true)}>Add equipment</button>
        </div>
      </header>

      <section className="inventory-queues" aria-label="Warehouse work queues">
        {statusCards.map((card) => (
          <button
            key={card.key}
            className={status === card.key ? "active" : ""}
            onClick={() => selectQueue(card.key)}
          >
            <span>{card.label}</span><strong>{countFor(card.key)}</strong><small>{card.hint}</small>
          </button>
        ))}
      </section>

      <section className="inventory-register">
        <header>
          <div><p className="eyebrow">EQUIPMENT REGISTER</p><h2>{activeLabel}</h2></div>
          <form onSubmit={(event) => { event.preventDefault(); void load(); }}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Asset, QR, order, or customer" />
            <select value={type} onChange={(event) => { const nextType = event.target.value; setType(nextType); void load({ search, status, type: nextType }); }}>
              <option value="">All types</option><option value="tote">Totes</option><option value="dolly">Dollies</option><option value="hand_truck">Hand trucks</option><option value="blanket_pack">Blanket packs</option><option value="trailer">Trailers</option><option value="other">Other</option>
            </select>
            {(status || search || type) && <button type="button" className="secondary" onClick={() => { setSearch(""); setStatus(""); setType(""); void load({ search: "", status: "", type: "" }); }}>Clear</button>}
            <button className="primary">Search</button>
          </form>
        </header>
        {message && <p className="scan-status">{message}</p>}
        {error && <p className="form-error">{error}</p>}
        <div className="inventory-table">
          <div className="inventory-table-head"><span>Equipment</span><span>Custody / location</span><span>Status</span><span>Next step</span></div>
          {assets.map((asset) => {
            const step = nextStep[asset.current_status];
            return <article key={asset.id}>
              <div><a className="record-link" href={`/inventory/${asset.id}`}>{asset.asset_number}</a><span>{words(asset.asset_type)} · {asset.color || "No color"} · {money(asset.replacement_cost_cents)}</span></div>
              <div><strong>{asset.order_number || "Warehouse inventory"}</strong><span>{asset.customer_name || (asset.order_number ? "Order assigned" : "Unassigned equipment")}</span></div>
              <div><em className={`inventory-status status-${asset.current_status}`}>{words(asset.current_status)}</em><span>{asset.current_condition} condition</span></div>
              <div className="inventory-row-action">
                {step ? <button className="secondary" disabled={saving} onClick={() => void move(asset)}>{saving ? "Working…" : step.label}</button> : <span className="inventory-ready">{asset.current_status === "clean_inventory" ? "Ready to assign" : "Exception review required"}</span>}
                <a href={`/inventory/${asset.id}`}>Details</a>
              </div>
            </article>;
          })}
        </div>
        {!assets.length && <p className="empty">No equipment matches this view.</p>}
      </section>

      {showAdd && <div className="record-modal" role="dialog" aria-modal="true" aria-label="Add equipment">
        <form className="record-editor inventory-add-modal" onSubmit={add}>
          <header><div><p className="eyebrow">FAST INTAKE</p><h2>Add equipment</h2></div><button type="button" onClick={() => setShowAdd(false)} aria-label="Close">×</button></header>
          <p className="desk-hint">New items go to the Receive queue. They become available only after staff receive them.</p>
          <label>Equipment type<select name="assetType" defaultValue="tote"><option value="tote">Tote</option><option value="dolly">Dolly</option><option value="hand_truck">Hand truck</option><option value="blanket_pack">Blanket pack</option><option value="trailer">Trailer</option><option value="other">Other</option></select></label>
          <div className="form-pair"><label>Quantity<input name="quantity" type="number" min="1" max="100" step="1" defaultValue="1" required /></label><label>Replacement value (USD)<input name="replacementCostUsd" type="number" min="0" step="0.01" defaultValue="25.00" required /></label></div>
          <label>Color<input name="color" placeholder="Blue" /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary" disabled={saving}>{saving ? "Adding…" : "Add to receive queue"}</button>
        </form>
      </div>}
    </main>
  );
}
