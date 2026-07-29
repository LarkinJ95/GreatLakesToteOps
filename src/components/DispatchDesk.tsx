"use client";
import { FormEvent, useEffect, useState } from "react";
type Assignment = {
  id: string;
  assignment_number: string;
  assignment_type: string;
  window_start: string | null;
  window_end: string | null;
  status: string;
  order_number: string | null;
  order_id: string | null;
  customer_name: string | null;
  employee_name: string | null;
  vehicle_number: string | null;
  priority: number;
};
type Order = { id: string; order_number: string; customer_name: string };
type Employee = { id: string; name: string };
type Vehicle = { id: string; unit_number: string; year?: number | null; make?: string | null; model?: string | null; license_plate?: string | null; max_tote_capacity?: number | null };
const today = () => new Date().toISOString().slice(0, 10);
export function DispatchDesk() {
  const [date, setDate] = useState(today()),
    [items, setItems] = useState<Assignment[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [employees, setEmployees] = useState<Employee[]>([]),
    [vehicles, setVehicles] = useState<Vehicle[]>([]),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [showVehicleForm, setShowVehicleForm] = useState(false);
  async function load(day = date) {
    const [a, b] = await Promise.all([
      fetch(`/api/assignments?date=${day}`),
      fetch("/api/orders?upcoming=true"),
    ]);
    if (!a.ok || !b.ok) {
      setError("Sign in is required to use dispatch.");
      return;
    }
    const dispatch = (await a.json()) as { assignments: Assignment[]; employees: Employee[]; vehicles: Vehicle[] };
    setItems(dispatch.assignments);
    setEmployees(dispatch.employees);
    setVehicles(dispatch.vehicles);
    setOrders(((await b.json()) as { orders: Order[] }).orders);
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/assignments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: f.get("type"),
        orderId: f.get("orderId"),
        scheduledDate: date,
        windowStart: f.get("windowStart"),
        windowEnd: f.get("windowEnd"),
        priority: Number(f.get("priority")),
        employeeId: f.get("employeeId"),
        vehicleId: f.get("vehicleId"),
      }),
    });
    const p = (await r.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    if (!r.ok) setError(p?.error?.message ?? "Assignment could not be created");
    else {
      e.currentTarget.reset();
      void load();
    }
    setSaving(false);
  }
  async function addVehicle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/vehicles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ unitNumber: f.get("unitNumber"), year: f.get("year"), make: f.get("make"), model: f.get("model"), licensePlate: f.get("licensePlate"), cargoCapacityCuft: f.get("cargoCapacityCuft"), maxToteCapacity: f.get("maxToteCapacity"), notes: f.get("notes") }) });
    const p = await r.json().catch(() => null) as { error?: { message?: string } } | null;
    if (!r.ok) setError(p?.error?.message ?? "Vehicle could not be added.");
    else { e.currentTarget.reset(); setShowVehicleForm(false); await load(); }
    setSaving(false);
  }
  return (
    <main className="desk">
      <header className="desk-header">
        <a href="/ops" className="back">
          ← ToteOps
        </a>
        <div>
          <p className="eyebrow">DISPATCH</p>
          <h1>Route board</h1>
        </div>
        <input
          className="date-picker"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            void load(e.target.value);
          }}
        />
      </header>
      <section className="desk-grid">
        <div>
        <form className="create-order" onSubmit={submit}>
          <p className="eyebrow">NEW ASSIGNMENT</p>
          <h2>Schedule a stop</h2>
          <label>
            Type
            <select name="type">
              <option value="delivery">Delivery</option>
              <option value="pickup">Pickup</option>
              <option value="swap">Swap</option>
              <option value="warehouse_task">Warehouse task</option>
            </select>
          </label>
          <label>
            Order
            <select name="orderId">
              <option value="">No order / warehouse task</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} · {o.customer_name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-pair">
            <label>
              Window start
              <input name="windowStart" type="time" />
            </label>
            <label>
              Window end
              <input name="windowEnd" type="time" />
            </label>
          </div>
          <div className="form-pair">
            <label>
              Driver / crew lead
              <select name="employeeId"><option value="">Unassigned</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select>
            </label>
            <label>
              Vehicle
              <select name="vehicleId"><option value="">Unassigned</option>{vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.unit_number}{vehicle.make ? ` · ${vehicle.make}${vehicle.model ? ` ${vehicle.model}` : ""}` : ""}</option>)}</select>
            </label>
          </div>
          <label>
            Priority
            <select name="priority" defaultValue="2">
              <option value="1">1 — High</option>
              <option value="2">2 — Standard</option>
              <option value="3">3 — Low</option>
            </select>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary" disabled={saving}>
            {saving ? "Scheduling…" : "Schedule assignment"}
          </button>
        </form>
        <div className="order-actions" style={{ marginTop: 12 }}><button className="secondary" type="button" onClick={() => setShowVehicleForm(show => !show)}>{showVehicleForm ? "Cancel adding vehicle" : "Add vehicle"}</button></div>
        {showVehicleForm && <form className="create-order" style={{ marginTop: 12 }} onSubmit={addVehicle}>
          <p className="eyebrow">VEHICLE FLEET</p><h2>Add delivery vehicle</h2>
          <label>Unit number<input name="unitNumber" placeholder="e.g. TRUCK-01" required /></label>
          <div className="form-pair"><label>Year<input name="year" type="number" min="1900" max="2100" /></label><label>License plate<input name="licensePlate" /></label></div>
          <div className="form-pair"><label>Make<input name="make" placeholder="Ford" /></label><label>Model<input name="model" placeholder="Transit" /></label></div>
          <div className="form-pair"><label>Cargo capacity (cu ft)<input name="cargoCapacityCuft" type="number" min="1" /></label><label>Max totes<input name="maxToteCapacity" type="number" min="1" defaultValue="60" /></label></div>
          <label>Notes<textarea name="notes" rows={2} /></label>
          <button className="primary" disabled={saving}>{saving ? "Saving…" : "Save vehicle"}</button>
        </form>}
        </div>
        <section className="order-list">
          <p className="eyebrow">{date}</p>
          <h2>Scheduled stops</h2>
          <div className="orders-table">
            {items.map((a) => (
              <article key={a.id}>
                <div>
                  <strong>
                    <a className="record-link" href={`/dispatch/${a.id}`}>
                      {a.assignment_number}
                    </a>{" "}
                    · {a.assignment_type}
                  </strong>
                  <span>
                    {a.order_number
                      ? `${a.order_number} · ${a.customer_name}`
                      : "Warehouse task"}
                  </span>
                </div>
                <div>
                  <span>
                    {a.window_start || "Unscheduled"}
                    {a.window_end ? `–${a.window_end}` : ""}
                  </span>
                  <b>{a.employee_name || "Unassigned"}{a.vehicle_number ? ` · ${a.vehicle_number}` : ""}</b>
                </div>
                <em>{a.status}</em>
              </article>
            ))}
          </div>
          {items.length === 0 && (
            <p className="empty">No stops scheduled for this day.</p>
          )}
        </section>
      </section>
    </main>
  );
}
