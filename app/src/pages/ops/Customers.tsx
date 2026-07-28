import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { OpsLayout } from '@/components/ops/OpsLayout';
import { EmptyState, StatusBadge, inputCls, money, selectCls } from '@/components/ops/bits';
import { trpc } from '@/providers/trpc';

export function OpsCustomers() {
  const [search, setSearch] = useState('');
  const [accountType, setAccountType] = useState('');

  const { data, isLoading } = trpc.customers.list.useQuery({
    search: search || undefined,
    accountType: accountType || undefined,
  });

  return (
    <OpsLayout title="Customers">
      <div className="mb-5 flex flex-wrap gap-3">
        <input className={`${inputCls} max-w-xs`} placeholder="Search customers…"
          value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search customers" />
        <select className={selectCls} value={accountType} onChange={(e) => setAccountType(e.target.value)} aria-label="Filter by account type">
          <option value="">All accounts</option>
          <option value="residential">Residential</option>
          <option value="business">Business</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-charcoal-400">Loading…</p>
      ) : !data || data.length === 0 ? (
        <EmptyState message="No customers found." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-mist text-navy-700">
                <th className="px-5 py-3 font-bold">Customer</th>
                <th className="px-5 py-3 font-bold">Contact</th>
                <th className="px-5 py-3 font-bold">Type</th>
                <th className="px-5 py-3 font-bold">Referral</th>
                <th className="px-5 py-3 text-right font-bold">Orders</th>
                <th className="px-5 py-3 text-right font-bold">Lifetime value</th>
                <th className="px-5 py-3" aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-mist/40">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-navy-700">{c.firstName} {c.lastName}</p>
                    {c.companyName && <p className="text-xs text-charcoal-400">{c.companyName}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-charcoal-500">{c.email}</p>
                    <p className="text-xs text-charcoal-300">{c.phone}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.accountType === 'business' ? 'qualified' : 'closed'} />
                    <span className="ml-1.5 text-xs capitalize text-charcoal-400">{c.accountType}</span>
                  </td>
                  <td className="px-5 py-3.5 text-charcoal-400">{c.referralSource ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right font-semibold">{c.orderCount}</td>
                  <td className="px-5 py-3.5 text-right font-semibold">{money(c.lifetimeValue)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Link to={`/ops/customers/${c.id}`} className="inline-flex items-center gap-1 font-semibold text-teal">
                      Open <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </OpsLayout>
  );
}

export function OpsCustomerDetail() {
  const id = Number(window.location.pathname.split('/').pop());
  const { data, isLoading } = trpc.customers.detail.useQuery({ id });
  const [notes, setNotes] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const update = trpc.customers.update.useMutation({
    onSuccess: () => utils.customers.detail.invalidate({ id }),
  });

  if (isLoading || !data?.customer) {
    return <OpsLayout title="Customer"><p className="text-sm text-charcoal-400">Loading…</p></OpsLayout>;
  }
  const c = data.customer;

  return (
    <OpsLayout title={`${c.firstName} ${c.lastName}`}>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="grid content-start gap-6">
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="font-bold text-navy-700">Contact</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              <div><dt className="inline font-semibold">Email: </dt><dd className="inline"><a className="text-teal" href={`mailto:${c.email}`}>{c.email}</a></dd></div>
              <div><dt className="inline font-semibold">Phone: </dt><dd className="inline">{c.phone ?? '—'}</dd></div>
              <div><dt className="inline font-semibold">Company: </dt><dd className="inline">{c.companyName ?? '—'}</dd></div>
              <div><dt className="inline font-semibold">Account: </dt><dd className="inline capitalize">{c.accountType}</dd></div>
              <div><dt className="inline font-semibold">Referral: </dt><dd className="inline">{c.referralSource ?? '—'}</dd></div>
              <div><dt className="inline font-semibold">Since: </dt><dd className="inline">{new Date(c.createdAt).toLocaleDateString()}</dd></div>
            </dl>
          </section>
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="font-bold text-navy-700">Notes</h2>
            <textarea className={`${inputCls} mt-3`} rows={5}
              value={notes ?? c.notes ?? ''}
              onChange={(e) => setNotes(e.target.value)}
              aria-label="Customer notes" />
            <button className="btn-primary mt-3 !px-4 !py-2 !text-sm"
              disabled={update.isPending || notes === null}
              onClick={() => update.mutate({ id: c.id, notes: notes ?? '' })}>
              Save notes
            </button>
          </section>
        </div>

        <div className="grid content-start gap-6">
          <section className="rounded-2xl border border-border bg-white shadow-sm">
            <h2 className="border-b border-border px-5 py-4 font-bold text-navy-700">Orders</h2>
            <ul className="divide-y divide-border">
              {data.orders.length === 0 && <li className="px-5 py-6 text-sm text-charcoal-300">No orders yet.</li>}
              {data.orders.map((o) => (
                <li key={o.id}>
                  <Link to={`/ops/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-mist/40">
                    <div>
                      <p className="text-sm font-semibold text-navy-700">{o.orderNumber} — {o.packageName}</p>
                      <p className="text-xs text-charcoal-400">{o.deliveryDate} → {o.pickupDate}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{money(o.total)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-white shadow-sm">
            <h2 className="border-b border-border px-5 py-4 font-bold text-navy-700">Invoices</h2>
            <ul className="divide-y divide-border">
              {data.invoices.length === 0 && <li className="px-5 py-6 text-sm text-charcoal-300">No invoices.</li>}
              {data.invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-navy-700">{inv.invoiceNumber}</p>
                    <p className="text-xs text-charcoal-400">Due {inv.dueDate ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{money(inv.amountPaid)} / {money(inv.amount)}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </OpsLayout>
  );
}
