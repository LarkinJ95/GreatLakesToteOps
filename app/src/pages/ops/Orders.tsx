import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { OpsLayout } from '@/components/ops/OpsLayout';
import { EmptyState, StatusBadge, formatAddress, inputCls, money, selectCls } from '@/components/ops/bits';
import { trpc } from '@/providers/trpc';

const orderStatuses = ['draft', 'pending', 'confirmed', 'active', 'completed', 'cancelled'] as const;

export function OpsOrders() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = trpc.orders.list.useQuery({
    status: (status || undefined) as never,
    search: search || undefined,
  });

  return (
    <OpsLayout title="Order Desk">
      <div className="mb-5 flex flex-wrap gap-3">
        <input className={`${inputCls} max-w-xs`} placeholder="Search order # or customer…"
          value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search orders" />
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {orderStatuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-charcoal-400">Loading…</p>
      ) : !data || data.length === 0 ? (
        <EmptyState message="No orders match these filters." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-mist text-navy-700">
                <th className="px-5 py-3 font-bold">Order</th>
                <th className="px-5 py-3 font-bold">Customer</th>
                <th className="px-5 py-3 font-bold">Package</th>
                <th className="px-5 py-3 font-bold">Dates</th>
                <th className="px-5 py-3 font-bold">Zone</th>
                <th className="px-5 py-3 text-right font-bold">Total</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3" aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {data.map(({ order: o, customerFirst, customerLast }) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-mist/40">
                  <td className="px-5 py-3.5 font-semibold text-navy-700">{o.orderNumber}</td>
                  <td className="px-5 py-3.5">{customerFirst} {customerLast}</td>
                  <td className="px-5 py-3.5">{o.packageName} <span className="text-xs text-charcoal-300">({o.totes} totes)</span></td>
                  <td className="px-5 py-3.5 text-charcoal-500">{o.deliveryDate} → {o.pickupDate}</td>
                  <td className="px-5 py-3.5 text-charcoal-500">{o.zoneKey?.replace('zone-', 'Zone ') ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right font-semibold">{money(o.total)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3.5 text-right">
                    <Link to={`/ops/orders/${o.id}`} className="inline-flex items-center gap-1 font-semibold text-teal">
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

export function OpsOrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.orders.detail.useQuery({ id: orderId });
  const [note, setNote] = useState('');

  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { utils.orders.detail.invalidate({ id: orderId }); utils.orders.list.invalidate(); },
  });
  const addNote = trpc.orders.addNote.useMutation({
    onSuccess: () => { utils.orders.detail.invalidate({ id: orderId }); setNote(''); },
  });
  const scheduleStops = trpc.orders.scheduleStops.useMutation({
    onSuccess: () => utils.orders.detail.invalidate({ id: orderId }),
  });
  const createInvoice = trpc.billing.createFromOrder.useMutation({
    onSuccess: () => { utils.orders.detail.invalidate({ id: orderId }); utils.billing.list.invalidate(); },
  });

  if (isLoading || !data?.order) {
    return <OpsLayout title="Order"><p className="text-sm text-charcoal-400">Loading…</p></OpsLayout>;
  }
  const o = data.order;
  const c = data.customer;

  return (
    <OpsLayout title={`Order ${o.orderNumber}`}>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-6">
          {/* Summary */}
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-navy-700">{o.packageName} — {o.totes} totes, {o.dollies} dollies</h2>
                <p className="text-sm text-charcoal-400">{o.rentalType} · {c ? `${c.firstName} ${c.lastName}` : ''} {c?.companyName ? `(${c.companyName})` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={o.status} />
                <select className={selectCls} value={o.status} aria-label="Change order status"
                  onChange={(e) => updateStatus.mutate({ id: o.id, status: e.target.value as never })}>
                  {orderStatuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-mist p-4">
                <p className="text-xs font-bold uppercase text-charcoal-300">Delivery</p>
                <p className="mt-1 text-sm font-semibold text-navy-700">{o.deliveryDate} · {o.deliveryWindow}</p>
                <p className="text-sm text-charcoal-500">{formatAddress(o.deliveryAddress)}</p>
              </div>
              <div className="rounded-xl bg-mist p-4">
                <p className="text-xs font-bold uppercase text-charcoal-300">Pickup</p>
                <p className="mt-1 text-sm font-semibold text-navy-700">{o.pickupDate} · {o.pickupWindow}</p>
                <p className="text-sm text-charcoal-500">{formatAddress(o.pickupAddress)}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div><dt className="text-charcoal-300">Property</dt><dd className="font-semibold">{o.propertyType ?? '—'}</dd></div>
              <div><dt className="text-charcoal-300">Stairs</dt><dd className="font-semibold">{o.stairs ?? '—'}</dd></div>
              <div><dt className="text-charcoal-300">Elevator</dt><dd className="font-semibold">{o.elevator ?? '—'}</dd></div>
              <div><dt className="text-charcoal-300">Contactless</dt><dd className="font-semibold">{o.contactless ? 'Yes' : 'No'}</dd></div>
            </dl>
            {o.accessNotes && <p className="mt-3 rounded-lg bg-gold-50 p-3 text-sm text-gold-800"><strong>Access:</strong> {o.accessNotes}</p>}
            {o.internalNotes && <p className="mt-3 rounded-lg bg-navy-50 p-3 text-sm text-navy-700"><strong>Internal:</strong> {o.internalNotes}</p>}
          </section>

          {/* Financials */}
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-navy-700">Financials</h2>
              {data.invoices.length === 0 && (
                <button className="btn-primary !px-4 !py-2 !text-sm" disabled={createInvoice.isPending}
                  onClick={() => createInvoice.mutate({ orderId: o.id })}>
                  Create invoice
                </button>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              <div><dt className="text-charcoal-300">Subtotal</dt><dd className="font-semibold">{money(o.subtotal)}</dd></div>
              <div><dt className="text-charcoal-300">Zone fee</dt><dd className="font-semibold">{money(o.zoneFee)}</dd></div>
              <div><dt className="text-charcoal-300">Discount</dt><dd className="font-semibold">−{money(o.discount)}{o.promoCode ? ` (${o.promoCode})` : ''}</dd></div>
              <div><dt className="text-charcoal-300">Tax</dt><dd className="font-semibold">{money(o.tax)}</dd></div>
              <div><dt className="text-charcoal-300">Total</dt><dd className="font-extrabold text-navy-700">{money(o.total)}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-charcoal-300">
              Payment: {o.paymentOption} · Agreement {o.agreementSigned ? `signed (${o.signedName ?? 'on file'})` : 'not signed'}
            </p>
            {data.invoices.length > 0 && (
              <ul className="mt-4 grid gap-2">
                {data.invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
                    <Link to={`/ops/billing/${inv.id}`} className="font-semibold text-teal">{inv.invoiceNumber}</Link>
                    <span>{money(inv.amountPaid)} / {money(inv.amount)}</span>
                    <StatusBadge status={inv.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Notes */}
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="font-bold text-navy-700">Add internal note</h2>
            <div className="mt-3 flex gap-2">
              <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Note…" aria-label="Internal note" />
              <button className="btn-primary !px-4 !py-2 !text-sm" disabled={!note || addNote.isPending}
                onClick={() => addNote.mutate({ id: o.id, note })}>
                Save
              </button>
            </div>
          </section>
        </div>

        {/* Dispatch column */}
        <div className="grid content-start gap-6">
          <section className="rounded-2xl border border-border bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-bold text-navy-700">Dispatch stops</h2>
              {data.stops.length === 0 && (
                <button className="btn-primary !px-4 !py-2 !text-sm" disabled={scheduleStops.isPending}
                  onClick={() => scheduleStops.mutate({ orderId: o.id })}>
                  Schedule stops
                </button>
              )}
            </header>
            <ul className="divide-y divide-border">
              {data.stops.length === 0 && (
                <li className="px-5 py-6 text-sm text-charcoal-300">No stops scheduled yet.</li>
              )}
              {data.stops.map((s) => (
                <li key={s.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold capitalize text-navy-700">{s.type} · {s.stopDate}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-charcoal-400">{s.window} · {formatAddress(s.address)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </OpsLayout>
  );
}
