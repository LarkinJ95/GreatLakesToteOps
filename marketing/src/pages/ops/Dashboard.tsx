import { Link } from 'react-router';
import { Boxes, ClipboardList, Inbox, Truck, Wallet } from 'lucide-react';
import { OpsLayout } from '@/components/ops/OpsLayout';
import { KpiCard, StatusBadge, formatAddress, money } from '@/components/ops/bits';
import { trpc } from '@/providers/trpc';

export function OpsDashboard() {
  const { data, isLoading } = trpc.dashboard.kpis.useQuery();

  return (
    <OpsLayout title="Dashboard">
      {isLoading || !data ? (
        <p className="text-sm text-charcoal-400">Loading…</p>
      ) : (
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
            <KpiCard label="Active rentals" value={data.activeRentals} icon={<Boxes className="h-5 w-5 text-teal" aria-hidden />} />
            <KpiCard label="Pending orders" value={data.pendingOrders} sub="Needs review" icon={<ClipboardList className="h-5 w-5 text-gold-600" aria-hidden />} />
            <KpiCard label="Confirmed" value={data.confirmedOrders} icon={<Truck className="h-5 w-5 text-navy-500" aria-hidden />} />
            <KpiCard label="New inquiries" value={data.newInquiries} icon={<Inbox className="h-5 w-5 text-gold-600" aria-hidden />} />
            <KpiCard label="Outstanding" value={money(data.outstanding)} sub={`${money(data.collected)} collected`} icon={<Wallet className="h-5 w-5 text-teal" aria-hidden />} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Upcoming stops */}
            <section className="rounded-2xl border border-border bg-white shadow-sm">
              <header className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-bold text-navy-700">Upcoming dispatch stops</h2>
                <Link to="/ops/dispatch" className="text-sm font-semibold text-teal">Open dispatch →</Link>
              </header>
              <ul className="divide-y divide-border">
                {data.upcomingStops.length === 0 && (
                  <li className="px-5 py-6 text-sm text-charcoal-300">No stops scheduled.</li>
                )}
                {data.upcomingStops.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-navy-700 capitalize">
                        {s.type} · {s.stopDate}
                      </p>
                      <p className="text-xs text-charcoal-400">{formatAddress(s.address)} · {s.window}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </li>
                ))}
              </ul>
            </section>

            {/* Recent orders */}
            <section className="rounded-2xl border border-border bg-white shadow-sm">
              <header className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-bold text-navy-700">Recent orders</h2>
                <Link to="/ops/orders" className="text-sm font-semibold text-teal">Order desk →</Link>
              </header>
              <ul className="divide-y divide-border">
                {data.recentOrders.map((r) => (
                  <li key={r.order.id}>
                    <Link to={`/ops/orders/${r.order.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-mist/50">
                      <div>
                        <p className="text-sm font-semibold text-navy-700">
                          {r.order.orderNumber} — {r.customerFirst} {r.customerLast}
                        </p>
                        <p className="text-xs text-charcoal-400">{r.order.packageName} · {money(r.order.total)}</p>
                      </div>
                      <StatusBadge status={r.order.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Recent inquiries */}
          <section className="rounded-2xl border border-border bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-bold text-navy-700">Latest inquiries</h2>
              <Link to="/ops/inquiries" className="text-sm font-semibold text-teal">Inbox →</Link>
            </header>
            <ul className="divide-y divide-border">
              {data.recentLeads.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-700">{l.name} <span className="font-normal text-charcoal-300">· {l.type}</span></p>
                    <p className="truncate text-xs text-charcoal-400">{l.message}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </OpsLayout>
  );
}
