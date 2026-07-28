import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { OpsLayout } from '@/components/ops/OpsLayout';
import { EmptyState, StatusBadge, formatAddress, inputCls, money, selectCls } from '@/components/ops/bits';
import { trpc } from '@/providers/trpc';

const invoiceStatuses = ['draft', 'sent', 'paid', 'overdue', 'void'] as const;

export function OpsBilling() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = trpc.billing.list.useQuery({
    status: status || undefined,
    search: search || undefined,
  });

  const totals = (data ?? []).reduce(
    (acc, r) => {
      acc.billed += Number(r.invoice.amount);
      acc.collected += Number(r.invoice.amountPaid);
      if (r.invoice.status === 'sent' || r.invoice.status === 'overdue') {
        acc.outstanding += Number(r.invoice.amount) - Number(r.invoice.amountPaid);
      }
      return acc;
    },
    { billed: 0, collected: 0, outstanding: 0 }
  );

  return (
    <OpsLayout title="Billing">
      <div className="mb-5 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-charcoal-400">Billed (filtered)</p>
          <p className="mt-1 text-2xl font-extrabold text-navy-700">{money(totals.billed)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-charcoal-400">Collected</p>
          <p className="mt-1 text-2xl font-extrabold text-teal">{money(totals.collected)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-charcoal-400">Outstanding</p>
          <p className="mt-1 text-2xl font-extrabold text-gold-600">{money(totals.outstanding)}</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <input className={`${inputCls} max-w-xs`} placeholder="Search invoice, order, customer…"
          value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search invoices" />
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {invoiceStatuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-charcoal-400">Loading…</p>
      ) : !data || data.length === 0 ? (
        <EmptyState message="No invoices match these filters." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-mist text-navy-700">
                <th className="px-5 py-3 font-bold">Invoice</th>
                <th className="px-5 py-3 font-bold">Order</th>
                <th className="px-5 py-3 font-bold">Customer</th>
                <th className="px-5 py-3 font-bold">Terms</th>
                <th className="px-5 py-3 font-bold">Due</th>
                <th className="px-5 py-3 text-right font-bold">Paid</th>
                <th className="px-5 py-3 text-right font-bold">Amount</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3" aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {data.map(({ invoice: inv, orderNumber, customerFirst, customerLast }) => (
                <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-mist/40">
                  <td className="px-5 py-3.5 font-semibold text-navy-700">{inv.invoiceNumber}</td>
                  <td className="px-5 py-3.5">{orderNumber}</td>
                  <td className="px-5 py-3.5">{customerFirst} {customerLast}</td>
                  <td className="px-5 py-3.5 capitalize text-charcoal-500">{inv.terms}</td>
                  <td className="px-5 py-3.5 text-charcoal-500">{inv.dueDate ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right">{money(inv.amountPaid)}</td>
                  <td className="px-5 py-3.5 text-right font-semibold">{money(inv.amount)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={inv.status} /></td>
                  <td className="px-5 py-3.5 text-right">
                    <Link to={`/ops/billing/${inv.id}`} className="inline-flex items-center gap-1 font-semibold text-teal">
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

export function OpsInvoiceDetail() {
  const { id } = useParams();
  const invoiceId = Number(id);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.billing.detail.useQuery({ id: invoiceId });
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('card');
  const [note, setNote] = useState('');

  const recordPayment = trpc.billing.recordPayment.useMutation({
    onSuccess: () => {
      utils.billing.detail.invalidate({ id: invoiceId });
      utils.billing.list.invalidate();
      setAmount(''); setNote('');
    },
  });
  const updateStatus = trpc.billing.updateStatus.useMutation({
    onSuccess: () => { utils.billing.detail.invalidate({ id: invoiceId }); utils.billing.list.invalidate(); },
  });

  if (isLoading || !data?.invoice) {
    return <OpsLayout title="Invoice"><p className="text-sm text-charcoal-400">Loading…</p></OpsLayout>;
  }
  const inv = data.invoice;
  const balance = Number(inv.amount) - Number(inv.amountPaid);

  return (
    <OpsLayout title={`Invoice ${inv.invoiceNumber}`}>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-6">
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-navy-700">
                  {data.customer ? `${data.customer.firstName} ${data.customer.lastName}` : ''}
                  {data.customer?.companyName ? ` — ${data.customer.companyName}` : ''}
                </h2>
                <p className="text-sm text-charcoal-400">
                  Order <Link to={`/ops/orders/${inv.orderId}`} className="text-teal">{data.order?.orderNumber}</Link>
                  {' '}· Terms: <span className="capitalize">{inv.terms}</span> · Due {inv.dueDate ?? '—'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={inv.status} />
                <select className={selectCls} value={inv.status} aria-label="Invoice status"
                  onChange={(e) => updateStatus.mutate({ id: inv.id, status: e.target.value as never })}>
                  {invoiceStatuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <tbody>
                  {(Array.isArray(inv.lineItems) ? inv.lineItems as { label: string; amount: number }[] : []).map((li, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-4 py-3">{li.label}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(li.amount)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-border bg-mist">
                    <td className="px-4 py-3 font-bold">Invoice total</td>
                    <td className="px-4 py-3 text-right font-extrabold">{money(inv.amount)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-gold-700">Balance due</td>
                    <td className="px-4 py-3 text-right font-extrabold text-gold-700">{money(balance)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {data.order && (
              <p className="mt-3 text-xs text-charcoal-300">
                {data.order.packageName} · {data.order.deliveryDate} → {data.order.pickupDate} · {formatAddress(data.order.deliveryAddress)}
              </p>
            )}
          </section>
        </div>

        <div className="grid content-start gap-6">
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="font-bold text-navy-700">Record payment</h2>
            <div className="mt-3 grid gap-3">
              <div>
                <label htmlFor="pay-amount" className="mb-1 block text-xs font-bold uppercase text-charcoal-300">Amount</label>
                <input id="pay-amount" type="number" min="0" step="0.01" className={inputCls}
                  placeholder={balance.toFixed(2)} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <label htmlFor="pay-method" className="mb-1 block text-xs font-bold uppercase text-charcoal-300">Method</label>
                <select id="pay-method" className={selectCls} value={method} onChange={(e) => setMethod(e.target.value)}>
                  {['card', 'cash', 'check', 'ach', 'other'].map((m) => <option key={m} className="capitalize">{m}</option>)}
                </select>
              </div>
              <input className={inputCls} placeholder="Note (optional)" value={note}
                onChange={(e) => setNote(e.target.value)} aria-label="Payment note" />
              <button className="btn-gold !py-2.5 !text-sm"
                disabled={!amount || Number(amount) <= 0 || recordPayment.isPending}
                onClick={() => recordPayment.mutate({ invoiceId: inv.id, amount: Number(amount), method, note: note || undefined })}>
                Record payment
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white shadow-sm">
            <h2 className="border-b border-border px-5 py-4 font-bold text-navy-700">Payment history</h2>
            <ul className="divide-y divide-border">
              {data.payments.length === 0 && <li className="px-5 py-6 text-sm text-charcoal-300">No payments recorded.</li>}
              {data.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                  <div>
                    <p className="font-semibold text-navy-700">{money(p.amount)} <span className="font-normal text-charcoal-300">· {p.method}</span></p>
                    {p.note && <p className="text-xs text-charcoal-400">{p.note}</p>}
                  </div>
                  <span className="text-xs text-charcoal-300">{new Date(p.paidAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </OpsLayout>
  );
}
