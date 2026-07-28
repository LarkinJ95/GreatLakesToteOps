import { useState } from 'react';
import { OpsLayout } from '@/components/ops/OpsLayout';
import { StatusBadge, inputCls, selectCls } from '@/components/ops/bits';
import { trpc } from '@/providers/trpc';

const tabs = ['Pricing', 'Zones & Promos', 'Content', 'Audit Log'] as const;

export function OpsAdmin() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Pricing');

  return (
    <OpsLayout title="Admin">
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Admin sections">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === t ? 'bg-navy-700 text-white' : 'bg-white text-charcoal-500 border border-border'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Pricing' && <PricingTab />}
      {tab === 'Zones & Promos' && <ZonesTab />}
      {tab === 'Content' && <ContentTab />}
      {tab === 'Audit Log' && <AuditTab />}
    </OpsLayout>
  );
}

// ---------------------------------------------------------------------------
function PricingTab() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.catalog.get.useQuery();
  const update = trpc.catalog.updatePackage.useMutation({
    onSuccess: () => utils.catalog.get.invalidate(),
  });

  if (isLoading || !data) return <p className="text-sm text-charcoal-400">Loading…</p>;

  return (
    <div className="grid gap-4">
      <p className="rounded-xl bg-gold-50 p-4 text-sm text-gold-800">
        Price changes take effect on the next server quote — no website deploy needed.
        Launch pricing wins while active.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-mist text-navy-700">
              <th className="px-4 py-3 font-bold">Package</th>
              <th className="px-4 py-3 font-bold">Totes/Dollies</th>
              <th className="px-4 py-3 font-bold">Launch $</th>
              <th className="px-4 py-3 font-bold">Standard $</th>
              <th className="px-4 py-3 font-bold">Extra wk $</th>
              <th className="px-4 py-3 font-bold">Launch on</th>
              <th className="px-4 py-3 font-bold">Featured</th>
              <th className="px-4 py-3 font-bold">Active</th>
            </tr>
          </thead>
          <tbody>
            {data.packages.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-semibold text-navy-700">{p.name}</td>
                <td className="px-4 py-3">{p.totes} / {p.dollies}</td>
                {[['launchPrice', p.launchPrice], ['standardPrice', p.standardPrice], ['extraWeekPrice', p.extraWeekPrice]].map(([field, val]) => (
                  <td key={field as string} className="px-4 py-3">
                    <input type="number" min="0" className={`${inputCls} w-24`} defaultValue={val as number}
                      aria-label={`${p.name} ${field}`}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== val) update.mutate({ id: p.id, [field as string]: v } as never);
                      }} />
                  </td>
                ))}
                {[['launchPricingActive', p.launchPricingActive], ['featured', p.featured], ['active', p.active]].map(([field, val]) => (
                  <td key={field as string} className="px-4 py-3 text-center">
                    <input type="checkbox" className="h-5 w-5 rounded border-input text-teal" defaultChecked={val as boolean}
                      aria-label={`${p.name} ${field}`}
                      onChange={(e) => update.mutate({ id: p.id, [field as string]: e.target.checked } as never)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ZonesTab() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.catalog.get.useQuery();
  const updateZone = trpc.catalog.updateZone.useMutation({ onSuccess: () => utils.catalog.get.invalidate() });
  const updatePromo = trpc.catalog.updatePromo.useMutation({ onSuccess: () => utils.catalog.get.invalidate() });

  if (isLoading || !data) return <p className="text-sm text-charcoal-400">Loading…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="font-bold text-navy-700">Service zones</h2>
        <div className="mt-4 grid gap-3">
          {data.zones.map((z) => {
            const zips = data.zips.filter((zp) => zp.zoneId === z.id).map((zp) => zp.zip);
            return (
              <div key={z.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-navy-700">{z.name}</p>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      Fee $
                      <input type="number" min="0" className={`${inputCls} w-20`} defaultValue={z.fee}
                        aria-label={`${z.name} fee`}
                        onBlur={(e) => Number(e.target.value) !== z.fee && updateZone.mutate({ id: z.id, fee: Number(e.target.value) })} />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      Active
                      <input type="checkbox" className="h-5 w-5 rounded border-input text-teal" defaultChecked={z.active}
                        aria-label={`${z.name} active`}
                        onChange={(e) => updateZone.mutate({ id: z.id, active: e.target.checked })} />
                    </label>
                  </div>
                </div>
                <p className="mt-1 text-xs text-charcoal-400">{z.description}</p>
                <p className="mt-1 font-mono text-xs text-charcoal-300">{zips.length > 0 ? zips.join(', ') : 'Custom review only'}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="font-bold text-navy-700">Promotional codes</h2>
        <div className="mt-4 grid gap-3">
          {data.promos.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div>
                <p className="font-mono font-bold text-navy-700">{p.code}</p>
                <p className="text-xs text-charcoal-400">{p.percentOff}% off · used {p.usedCount}{p.usageLimit ? ` / ${p.usageLimit}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  %
                  <input type="number" min="0" max="100" className={`${inputCls} w-20`} defaultValue={p.percentOff}
                    aria-label={`${p.code} percent off`}
                    onBlur={(e) => Number(e.target.value) !== p.percentOff && updatePromo.mutate({ id: p.id, percentOff: Number(e.target.value) })} />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  Active
                  <input type="checkbox" className="h-5 w-5 rounded border-input text-teal" defaultChecked={p.active}
                    aria-label={`${p.code} active`}
                    onChange={(e) => updatePromo.mutate({ id: p.id, active: e.target.checked })} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ContentTab() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.content.get.useQuery();
  const setAnnStatus = trpc.content.setAnnouncementStatus.useMutation({ onSuccess: () => utils.content.get.invalidate() });
  const createAnn = trpc.content.createAnnouncement.useMutation({ onSuccess: () => { utils.content.get.invalidate(); setNewAnn(''); } });
  const setTestStatus = trpc.content.setTestimonialStatus.useMutation({ onSuccess: () => utils.content.get.invalidate() });
  const setFaqStatus = trpc.content.setFaqStatus.useMutation({ onSuccess: () => utils.content.get.invalidate() });
  const [newAnn, setNewAnn] = useState('');

  if (isLoading || !data) return <p className="text-sm text-charcoal-400">Loading…</p>;

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="font-bold text-navy-700">Announcement bar</h2>
        <div className="mt-3 flex gap-2">
          <input className={inputCls} placeholder="New announcement message…" value={newAnn}
            onChange={(e) => setNewAnn(e.target.value)} aria-label="New announcement" />
          <button className="btn-primary !px-4 !py-2 !text-sm" disabled={newAnn.length < 4 || createAnn.isPending}
            onClick={() => createAnn.mutate({ message: newAnn })}>Create draft</button>
        </div>
        <ul className="mt-4 grid gap-2">
          {data.announcements.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <p className="min-w-0 flex-1 text-sm">{a.message}</p>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.status} />
                <select className={selectCls} value={a.status} aria-label="Announcement status"
                  onChange={(e) => setAnnStatus.mutate({ id: a.id, status: e.target.value as never })}>
                  {['draft', 'scheduled', 'published', 'archived'].map((s) => <option key={s} className="capitalize">{s}</option>)}
                </select>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="font-bold text-navy-700">Testimonials</h2>
        <ul className="mt-4 grid gap-2">
          {data.testimonials.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy-700">
                  {t.name} · {t.city} · {'★'.repeat(t.rating)}
                  {t.sample && <span className="ml-2 rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gold-700">Sample — never present as real</span>}
                </p>
                <p className="truncate text-sm text-charcoal-400">{t.reviewText}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold">
                  Featured
                  <input type="checkbox" className="h-4 w-4 rounded border-input text-teal" defaultChecked={t.featured}
                    aria-label="Featured"
                    onChange={(e) => setTestStatus.mutate({ id: t.id, status: t.status, featured: e.target.checked })} />
                </label>
                <StatusBadge status={t.status} />
                <select className={selectCls} value={t.status} aria-label="Testimonial status"
                  onChange={(e) => setTestStatus.mutate({ id: t.id, status: e.target.value as never })}>
                  {['draft', 'published', 'archived'].map((s) => <option key={s} className="capitalize">{s}</option>)}
                </select>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="font-bold text-navy-700">FAQs</h2>
        <ul className="mt-4 grid gap-2">
          {data.faqs.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy-700">{f.question}</p>
                <p className="text-xs text-charcoal-300">{f.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={f.status} />
                <select className={selectCls} value={f.status} aria-label="FAQ status"
                  onChange={(e) => setFaqStatus.mutate({ id: f.id, status: e.target.value as never })}>
                  {['draft', 'published', 'archived'].map((s) => <option key={s} className="capitalize">{s}</option>)}
                </select>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
function AuditTab() {
  const { data, isLoading } = trpc.audit.list.useQuery({ limit: 100 });
  if (isLoading || !data) return <p className="text-sm text-charcoal-400">Loading…</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-mist text-navy-700">
            <th className="px-5 py-3 font-bold">When</th>
            <th className="px-5 py-3 font-bold">Actor</th>
            <th className="px-5 py-3 font-bold">Action</th>
            <th className="px-5 py-3 font-bold">Entity</th>
            <th className="px-5 py-3 font-bold">Ref</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr><td colSpan={5} className="px-5 py-8 text-center text-charcoal-300">No audit entries yet — actions appear here as staff work.</td></tr>
          )}
          {data.map((a) => (
            <tr key={a.id} className="border-b border-border last:border-0">
              <td className="px-5 py-3 text-charcoal-400">{new Date(a.createdAt).toLocaleString()}</td>
              <td className="px-5 py-3">{a.actorName ?? '—'}</td>
              <td className="px-5 py-3 font-mono text-xs">{a.action}</td>
              <td className="px-5 py-3">{a.entity}</td>
              <td className="px-5 py-3 text-charcoal-400">{a.entityRef ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
