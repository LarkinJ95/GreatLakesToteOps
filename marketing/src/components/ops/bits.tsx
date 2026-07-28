import type { ReactNode } from 'react';

export function money(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `$${v.toFixed(2)}`;
}

const statusStyles: Record<string, string> = {
  // orders
  draft: 'bg-charcoal-100 text-charcoal-500',
  pending: 'bg-gold-100 text-gold-700',
  confirmed: 'bg-teal-50 text-teal-700',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-navy-50 text-navy-600',
  cancelled: 'bg-red-100 text-red-700',
  // leads
  new: 'bg-gold-100 text-gold-700',
  contacted: 'bg-teal-50 text-teal-700',
  qualified: 'bg-navy-50 text-navy-600',
  converted: 'bg-green-100 text-green-800',
  closed: 'bg-charcoal-100 text-charcoal-500',
  spam: 'bg-red-100 text-red-700',
  // dispatch
  scheduled: 'bg-navy-50 text-navy-600',
  'en-route': 'bg-gold-100 text-gold-700',
  issue: 'bg-red-100 text-red-700',
  skipped: 'bg-charcoal-100 text-charcoal-500',
  // invoices
  sent: 'bg-teal-50 text-teal-700',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-charcoal-100 text-charcoal-500',
  // inventory
  available: 'bg-green-100 text-green-800',
  cleaning: 'bg-teal-50 text-teal-700',
  out: 'bg-gold-100 text-gold-700',
  damaged: 'bg-red-100 text-red-700',
  retired: 'bg-charcoal-100 text-charcoal-500',
  // content
  published: 'bg-green-100 text-green-800',
  archived: 'bg-charcoal-100 text-charcoal-500',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${statusStyles[status] ?? 'bg-charcoal-100 text-charcoal-500'}`}>
      {status}
    </span>
  );
}

export function KpiCard({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-charcoal-400">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-extrabold text-navy-700">{value}</p>
      {sub && <p className="mt-1 text-xs text-charcoal-300">{sub}</p>}
    </div>
  );
}

export const inputCls = 'w-full rounded-lg border border-input bg-white px-3.5 py-2.5 text-sm';
export const selectCls = 'rounded-lg border border-input bg-white px-3.5 py-2.5 text-sm font-semibold text-navy-700';

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center text-sm text-charcoal-300">
      {message}
    </div>
  );
}

export interface AddressShape {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export function formatAddress(a: unknown): string {
  if (!a || typeof a !== 'object') return '—';
  const addr = a as AddressShape;
  return [addr.street, [addr.city, addr.state].filter(Boolean).join(', '), addr.zip]
    .filter(Boolean)
    .join(' · ');
}
