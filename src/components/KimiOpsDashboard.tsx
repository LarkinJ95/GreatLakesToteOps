"use client";
import { ReactNode, useEffect, useState } from "react";

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
};
const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
const links = [
  ["▦", "Dashboard", "/ops"],
  ["◌", "Inquiries", "/inquiries"],
  ["♙", "Customers", "/customers"],
  ["☷", "Order desk", "/orders"],
  ["➜", "Dispatch", "/dispatch"],
  ["$", "Billing", "/billing"],
  ["▣", "Inventory", "/inventory"],
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
