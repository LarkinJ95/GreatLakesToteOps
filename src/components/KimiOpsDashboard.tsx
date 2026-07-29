"use client";
import { ReactNode, useEffect, useState } from "react";
import { CommandSearch } from "./CommandSearch";

type Dashboard = {
  date: string;
  metrics: {
    stops: number;
    totesInField: number;
    agreementsAwaiting: number;
    openBalanceCents: number;
  };
  assignments: {
    id: string;
    assignment_number: string;
    assignment_type: string;
    scheduled_date: string;
    window_start: string | null;
    status: string;
    order_number: string | null;
    customer_name: string | null;
  }[];
  overdueInvoices: {
    id: string;
    invoice_number: string;
    customer_name: string;
    balance_due_cents: number;
    due_date: string | null;
  }[];
  assetAttention: {
    id: string;
    asset_number: string;
    asset_type: string;
    current_status: string;
  }[];
  cancellations: {
    id: string;
    order_number: string;
    customer_name: string;
    created_at: string;
  }[];
  orderWork: {
    id: string;
    order_number: string;
    order_status: string;
    scheduled_delivery_date: string | null;
    scheduled_pickup_date: string | null;
    customer_name: string;
    assigned_assets: number;
    required_assets: number;
  }[];
  dispatchRisks: {
    id: string;
    assignment_number: string;
    assignment_type: string;
    scheduled_date: string;
    window_start: string | null;
    customer_name: string | null;
    order_id: string | null;
    missing_driver: number;
    missing_vehicle: number;
  }[];
  warehouseWork: {
    id: string;
    asset_number: string;
    asset_type: string;
    current_status: string;
    last_scan_at: string | null;
  }[];
};
const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
const words = (value: string) => value.replaceAll("_", " ");
const orderTask = (order: Dashboard["orderWork"][number]) => {
  if (["confirmed", "equipment_reserved"].includes(order.order_status))
    return order.assigned_assets < order.required_assets
      ? "Assign package equipment"
      : "Stage equipment";
  if (order.order_status === "staged") return "Load for delivery";
  if (["delivery_assigned", "out_for_delivery"].includes(order.order_status))
    return "Complete delivery";
  if (["delivered", "active_rental"].includes(order.order_status))
    return "Plan pickup";
  return "Complete pickup";
};
const links = [
  ["▦", "Dashboard", "/ops"],
  ["◌", "Inquiries", "/inquiries"],
  ["♙", "Customers", "/customers"],
  ["☷", "Order desk", "/orders"],
  ["➜", "Dispatch", "/dispatch"],
  ["$", "Billing", "/billing"],
  ["↗", "Reports", "/reports"],
  ["▣", "Inventory", "/inventory"],
  ["⌗", "Warehouse bins", "/bins"],
] as const;

export function KimiOpsShell({
  children,
  title = "Operations dashboard",
}: {
  children: ReactNode;
  title?: string;
}) {
  const [user, setUser] = useState<{ name: string; email: string } | null>(
    null,
  );
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  useEffect(() => {
    fetch("/api/auth/me").then(async (r) => {
      if (!r.ok) {
        location.assign("/login");
        return;
      }
      setUser(
        ((await r.json()) as { user: { name: string; email: string } }).user,
      );
    });
  }, []);
  return (
    <div className="kimi-ops">
      <aside>
        <a className="kimi-brand" href="/ops">
          <img
            src="/brand/great-lakes-moving-totes.png"
            alt="Great Lakes Moving Totes"
          />
          <span>
            ToteOps<small>Operations dashboard</small>
          </span>
        </a>
        <nav>
          {links.map(([icon, label, href]) => (
            <a className={path === href ? "active" : ""} href={href} key={href}>
              <b>{icon}</b>
              {label}
            </a>
          ))}
        </nav>
        <div className="kimi-user">
          <strong>{user?.name ?? "Loading…"}</strong>
          <span>{user?.email}</span>
          <button
            onClick={() =>
              fetch("/api/auth/logout", { method: "POST" }).then(() =>
                location.assign("/login"),
              )
            }
          >
            Sign out
          </button>
        </div>
      </aside>
      <section className="kimi-main">
        <header>
          <button
            className="kimi-menu"
            onClick={() =>
              document.querySelector(".kimi-ops")?.classList.toggle("menu-open")
            }
          >
            ☰
          </button>
          <h1>{title}</h1>
          <CommandSearch />
          <a href="/site/">View marketing site →</a>
        </header>
        {children}
      </section>
    </div>
  );
}

export function KimiOpsDashboard() {
  const [data, setData] = useState<Dashboard | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/dashboard").then(async (r) => {
      if (!r.ok) {
        setError("Unable to load operations data.");
        return;
      }
      setData((await r.json()) as Dashboard);
    });
  }, []);
  return (
    <KimiOpsShell>
      {!data ? (
        <p className="kimi-loading">{error || "Loading ToteOps…"}</p>
      ) : (
        <div className="kimi-content">
          <section className="ops-focus">
            <div>
              <p className="eyebrow">DAILY CONTROL CENTER · {data.date}</p>
              <h2>Start with the work that moves today.</h2>
              <p>
                Orders, dispatch exceptions, and warehouse recovery are grouped
                here so staff do not need to hunt through separate desks.
              </p>
            </div>
            <div className="ops-focus-actions">
              <a className="primary" href="/orders">New order</a>
              <a className="secondary" href="/dispatch">Open route board</a>
            </div>
          </section>
          <div className="kimi-kpis">
            <article>
              <span>Active rentals</span>
              <strong>{data.metrics.totesInField}</strong>
              <i>▣</i>
            </article>
            <article>
              <span>Stops today</span>
              <strong>{data.metrics.stops}</strong>
              <i>➜</i>
            </article>
            <article>
              <span>Agreements waiting</span>
              <strong>{data.metrics.agreementsAwaiting}</strong>
              <i>◷</i>
            </article>
            <article>
              <span>Open balance</span>
              <strong>{money(data.metrics.openBalanceCents)}</strong>
              <i>$</i>
            </article>
          </div>
          <section className="ops-work-queue">
            <header>
              <div>
                <p className="eyebrow">PRIORITY QUEUE</p>
                <h2>Today’s operational work</h2>
              </div>
              <span>{data.orderWork.length + data.dispatchRisks.length + data.warehouseWork.length} open items</span>
            </header>
            <div className="ops-work-lanes">
              <article>
                <header><h3>Orders to move</h3><a href="/orders">Order desk →</a></header>
                {data.orderWork.length ? <ul>{data.orderWork.map((order) => (
                  <li key={order.id}>
                    <div>
                      <a href={`/orders/${order.id}`}><strong>{order.order_number}</strong></a>
                      <span>{order.customer_name} · {words(order.order_status)}</span>
                    </div>
                    <div className="work-action"><b>{orderTask(order)}</b><small>{order.scheduled_delivery_date ? `Delivery ${order.scheduled_delivery_date}` : `Pickup ${order.scheduled_pickup_date ?? "to schedule"}`}</small></div>
                  </li>
                ))}</ul> : <p className="kimi-empty">No delivery or pickup work is due in the next two days.</p>}
              </article>
              <article>
                <header><h3>Dispatch gaps</h3><a href="/dispatch">Dispatch →</a></header>
                {data.dispatchRisks.length ? <ul>{data.dispatchRisks.map((assignment) => (
                  <li key={assignment.id}>
                    <div>
                      <a href={`/dispatch/${assignment.id}`}><strong>{assignment.assignment_number}</strong></a>
                      <span>{words(assignment.assignment_type)} · {assignment.customer_name || "Warehouse task"}</span>
                    </div>
                    <div className="work-action"><b>{[assignment.missing_driver ? "Driver" : "", assignment.missing_vehicle ? "vehicle" : ""].filter(Boolean).join(" + ")} needed</b><small>{assignment.scheduled_date} {assignment.window_start || ""}</small></div>
                  </li>
                ))}</ul> : <p className="kimi-empty">All next-day stops have a driver and vehicle.</p>}
              </article>
              <article>
                <header><h3>Warehouse recovery</h3><a href="/inventory">Inventory →</a></header>
                {data.warehouseWork.length ? <ul>{data.warehouseWork.map((asset) => (
                  <li key={asset.id}>
                    <div>
                      <a href={`/inventory/${asset.id}`}><strong>{asset.asset_number}</strong></a>
                      <span>{words(asset.asset_type)} · {words(asset.current_status)}</span>
                    </div>
                    <div className="work-action"><b>{asset.current_status === "dirty_return" ? "Clean and inspect" : "Review condition"}</b><small>{asset.last_scan_at ? "Recently scanned" : "No scan recorded"}</small></div>
                  </li>
                ))}</ul> : <p className="kimi-empty">No inventory is waiting for recovery.</p>}
              </article>
            </div>
          </section>
          <div className="kimi-grid">
            <section className="kimi-panel">
              <header>
                <h2>Today’s dispatch</h2>
                <a href="/dispatch">Open dispatch →</a>
              </header>
              {data.assignments.length ? (
                <ul>
                  {data.assignments.map((a) => (
                    <li key={a.id}>
                      <div>
                        <a href={`/dispatch/${a.id}`}>
                          <strong>
                            {a.assignment_type.replaceAll("_", " ")} ·{" "}
                            {a.assignment_number}
                          </strong>
                        </a>
                        <span>
                          {a.order_number
                            ? `${a.order_number} · ${a.customer_name}`
                            : "Warehouse task"}
                        </span>
                      </div>
                      <time>{a.window_start || "Unscheduled"}</time>
                      <em>{a.status}</em>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="kimi-empty">No stops scheduled today.</p>
              )}
            </section>
            <section className="kimi-panel">
              <header>
                <h2>Action queue</h2>
              </header>
              <ul>
                {data.overdueInvoices.map((i) => (
                  <li key={i.id}>
                    <div>
                      <a href={`/invoices/${i.id}`}>
                        <strong>{i.invoice_number}</strong>
                      </a>
                      <span>
                        {i.customer_name} · {money(i.balance_due_cents)}
                      </span>
                    </div>
                    <em>Billing</em>
                  </li>
                ))}
                {data.assetAttention.map((a) => (
                  <li key={a.id}>
                    <div>
                      <a href={`/inventory/${a.id}`}>
                        <strong>{a.asset_number}</strong>
                      </a>
                      <span>
                        {a.asset_type.replaceAll("_", " ")} ·{" "}
                        {a.current_status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <em>Asset</em>
                  </li>
                ))}
                {data.cancellations.map((c) => (
                  <li key={c.id}>
                    <div>
                      <a href={`/orders/${c.id}`}>
                        <strong>{c.order_number}</strong>
                      </a>
                      <span>{c.customer_name} · cancelled</span>
                    </div>
                    <em>Review</em>
                  </li>
                ))}
                {!data.overdueInvoices.length &&
                  !data.assetAttention.length &&
                  !data.cancellations.length && (
                    <p className="kimi-empty">
                      Nothing needs follow-up right now.
                    </p>
                  )}
              </ul>
            </section>
            <section className="kimi-panel">
              <header>
                <h2>Quick actions</h2>
              </header>
              <div className="kimi-actions">
                <a href="/orders">Create rental order</a>
                <a href="/customers">Add customer</a>
                <a href="/inventory">Receive equipment</a>
                <a href="/billing">Create invoice</a>
              </div>
            </section>
          </div>
        </div>
      )}
    </KimiOpsShell>
  );
}
