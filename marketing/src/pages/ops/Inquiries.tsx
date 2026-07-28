import { useState } from 'react';
import { OpsLayout } from '@/components/ops/OpsLayout';
import { EmptyState, StatusBadge, inputCls, selectCls } from '@/components/ops/bits';
import { trpc } from '@/providers/trpc';

const statuses = ['new', 'contacted', 'qualified', 'converted', 'closed', 'spam'] as const;
const types = ['contact', 'business-account', 'custom-quote', 'outside-area', 'referral', 'order-support'];

export function OpsInquiries() {
  const [status, setStatus] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.leads.list.useQuery({
    status: (status || undefined) as never,
    type: type || undefined,
    search: search || undefined,
  });
  const updateStatus = trpc.leads.updateStatus.useMutation({
    onSuccess: () => utils.leads.list.invalidate(),
  });
  const addNote = trpc.leads.addNote.useMutation({
    onSuccess: () => { utils.leads.list.invalidate(); setNote(''); },
  });

  return (
    <OpsLayout title="Inquiries">
      <div className="mb-5 flex flex-wrap gap-3">
        <input className={`${inputCls} max-w-xs`} placeholder="Search name, email, company…"
          value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search inquiries" />
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <select className={selectCls} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-charcoal-400">Loading…</p>
      ) : !data || data.length === 0 ? (
        <EmptyState message="No inquiries match these filters." />
      ) : (
        <div className="grid gap-3">
          {data.map((lead) => (
            <article key={lead.id} className="rounded-2xl border border-border bg-white shadow-sm">
              <button
                className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
                onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                aria-expanded={expanded === lead.id}
              >
                <div className="min-w-0">
                  <p className="font-bold text-navy-700">
                    {lead.name}
                    <span className="ml-2 text-sm font-normal text-charcoal-300">{lead.reference} · {lead.type}</span>
                    {lead.company && <span className="ml-2 text-sm font-normal text-charcoal-300">· {lead.company}</span>}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-charcoal-400">{lead.message}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-charcoal-300">{new Date(lead.createdAt).toLocaleDateString()}</span>
                  <StatusBadge status={lead.status} />
                </div>
              </button>

              {expanded === lead.id && (
                <div className="grid gap-4 border-t border-border px-5 py-4 sm:grid-cols-2">
                  <div className="grid gap-1 text-sm">
                    <p><span className="font-semibold text-navy-700">Email:</span> <a className="text-teal" href={`mailto:${lead.email}`}>{lead.email}</a></p>
                    {lead.phone && <p><span className="font-semibold text-navy-700">Phone:</span> {lead.phone}</p>}
                    {lead.orderNumber && <p><span className="font-semibold text-navy-700">Order:</span> {lead.orderNumber}</p>}
                    <p className="mt-2 whitespace-pre-wrap text-charcoal-500">{lead.message}</p>
                    {lead.internalNote && (
                      <p className="mt-2 rounded-lg bg-gold-50 p-3 text-xs text-gold-800"><strong>Internal note:</strong> {lead.internalNote}</p>
                    )}
                  </div>
                  <div className="grid content-start gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-charcoal-300" htmlFor={`st-${lead.id}`}>Pipeline status</label>
                      <select id={`st-${lead.id}`} className={selectCls} value={lead.status}
                        onChange={(e) => updateStatus.mutate({ id: lead.id, status: e.target.value as never })}>
                        {statuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input className={inputCls} placeholder="Add internal note…" value={note}
                        onChange={(e) => setNote(e.target.value)} aria-label="Internal note" />
                      <button className="btn-primary !px-4 !py-2 !text-sm"
                        disabled={!note || addNote.isPending}
                        onClick={() => addNote.mutate({ id: lead.id, note })}>
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </OpsLayout>
  );
}
