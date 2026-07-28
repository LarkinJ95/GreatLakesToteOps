import { useMemo, useState } from 'react';
import { OpsLayout } from '@/components/ops/OpsLayout';
import { EmptyState, StatusBadge, inputCls, selectCls } from '@/components/ops/bits';
import { trpc } from '@/providers/trpc';

const assetTypes = ['tote', 'dolly', 'hand-truck', 'blanket'] as const;
const assetStatuses = ['available', 'cleaning', 'out', 'damaged', 'retired'] as const;

export function OpsInventory() {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [addType, setAddType] = useState<(typeof assetTypes)[number]>('tote');
  const [addQty, setAddQty] = useState('10');

  const utils = trpc.useUtils();
  const { data: overview } = trpc.inventory.overview.useQuery();
  const { data, isLoading } = trpc.inventory.list.useQuery({
    type: type || undefined,
    status: (status || undefined) as never,
    search: search || undefined,
  });
  const updateStatus = trpc.inventory.updateStatus.useMutation({
    onSuccess: () => { utils.inventory.list.invalidate(); utils.inventory.overview.invalidate(); },
  });
  const addAssets = trpc.inventory.addAssets.useMutation({
    onSuccess: () => { utils.inventory.list.invalidate(); utils.inventory.overview.invalidate(); },
  });

  const summary = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const row of overview ?? []) {
      if (!map.has(row.type)) map.set(row.type, new Map());
      map.get(row.type)!.set(row.status, row.count);
    }
    return map;
  }, [overview]);

  return (
    <OpsLayout title="Inventory">
      {/* Overview cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {assetTypes.map((t) => {
          const s = summary.get(t);
          const total = [...(s?.values() ?? [])].reduce((a, b) => a + b, 0);
          const available = s?.get('available') ?? 0;
          return (
            <div key={t} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold capitalize text-charcoal-400">{t}s</p>
              <p className="mt-1 text-3xl font-extrabold text-navy-700">{available}<span className="text-base font-semibold text-charcoal-300"> / {total}</span></p>
              <p className="mt-1 text-xs text-charcoal-300">
                available · {s?.get('out') ?? 0} out · {s?.get('cleaning') ?? 0} cleaning · {s?.get('damaged') ?? 0} damaged
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters + add */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input className={`${inputCls} max-w-xs`} placeholder="Search asset tag…"
          value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search assets" />
        <select className={selectCls} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>
          {assetTypes.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {assetStatuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <select className={selectCls} value={addType} onChange={(e) => setAddType(e.target.value as never)} aria-label="Asset type to add">
            {assetTypes.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
          <input className={`${inputCls} w-20`} type="number" min="1" max="500" value={addQty}
            onChange={(e) => setAddQty(e.target.value)} aria-label="Quantity" />
          <button className="btn-primary !px-4 !py-2.5 !text-sm" disabled={addAssets.isPending}
            onClick={() => addAssets.mutate({ type: addType, quantity: Number(addQty) })}>
            Add assets
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-charcoal-400">Loading…</p>
      ) : !data || data.length === 0 ? (
        <EmptyState message="No assets match these filters." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-mist text-navy-700">
                <th className="px-5 py-3 font-bold">Asset tag</th>
                <th className="px-5 py-3 font-bold">Type</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Current order</th>
                <th className="px-5 py-3 font-bold">Condition</th>
                <th className="px-5 py-3 font-bold">Last inspected</th>
                <th className="px-5 py-3 font-bold">Change status</th>
              </tr>
            </thead>
            <tbody>
              {data.map(({ asset: a, orderNumber }) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-mist/40">
                  <td className="px-5 py-3 font-mono text-sm font-semibold text-navy-700">{a.assetTag}</td>
                  <td className="px-5 py-3 capitalize text-charcoal-500">{a.type}</td>
                  <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-5 py-3 text-charcoal-500">{orderNumber ?? '—'}</td>
                  <td className="px-5 py-3 text-charcoal-400">{a.conditionNote ?? '—'}</td>
                  <td className="px-5 py-3 text-charcoal-400">{a.lastInspectAt ? new Date(a.lastInspectAt).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3">
                    <select className={selectCls} value={a.status} aria-label={`Status for ${a.assetTag}`}
                      onChange={(e) => updateStatus.mutate({ id: a.id, status: e.target.value as never })}>
                      {assetStatuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
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
