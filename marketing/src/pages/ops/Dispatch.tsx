import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { OpsLayout } from '@/components/ops/OpsLayout';
import { EmptyState, StatusBadge, formatAddress, inputCls, selectCls } from '@/components/ops/bits';
import { trpc } from '@/providers/trpc';

const stopStatuses = ['scheduled', 'en-route', 'completed', 'issue', 'skipped'] as const;

export function OpsDispatch() {
  const today = new Date().toISOString().slice(0, 10);
  const plus14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(plus14);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.dispatch.board.useQuery({ from, to });
  const updateStop = trpc.dispatch.updateStop.useMutation({
    onSuccess: () => utils.dispatch.board.invalidate(),
  });
  const addVehicle = trpc.dispatch.addVehicle.useMutation({ onSuccess: () => utils.dispatch.board.invalidate() });
  const addDriver = trpc.dispatch.addDriver.useMutation({ onSuccess: () => utils.dispatch.board.invalidate() });

  const byDate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>['stops']>();
    for (const s of data?.stops ?? []) {
      const list = map.get(s.stop.stopDate) ?? [];
      list.push(s);
      map.set(s.stop.stopDate, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  return (
    <OpsLayout title="Dispatch">
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="d-from" className="mb-1 block text-xs font-bold uppercase text-charcoal-300">From</label>
          <input id="d-from" type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="d-to" className="mb-1 block text-xs font-bold uppercase text-charcoal-300">To</label>
          <input id="d-to" type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <FleetManager
          vehicles={data?.vehicles ?? []}
          drivers={data?.drivers ?? []}
          onAddVehicle={(name, cap) => addVehicle.mutate({ name, capacityTotes: cap })}
          onAddDriver={(name, phone) => addDriver.mutate({ name, phone })}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-charcoal-400">Loading…</p>
      ) : byDate.length === 0 ? (
        <EmptyState message="No stops in this window." />
      ) : (
        <div className="grid gap-5">
          {byDate.map(([date, stops]) => {
            const totalTotes = stops.reduce((sum, s) => sum + (s.totes ?? 0), 0);
            return (
              <section key={date} className="rounded-2xl border border-border bg-white shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
                  <h2 className="font-bold text-navy-700">
                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h2>
                  <p className="text-xs font-semibold text-charcoal-400">{stops.length} stops · {totalTotes} totes moving</p>
                </header>
                <ul className="divide-y divide-border">
                  {stops.map((s) => (
                    <li key={s.stop.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-700">
                          <span className="capitalize">{s.stop.type}</span> ·{' '}
                          <Link to={`/ops/orders/${s.stop.orderId}`} className="text-teal">{s.orderNumber}</Link>{' '}
                          — {s.customerFirst} {s.customerLast}
                        </p>
                        <p className="text-xs text-charcoal-400">
                          {formatAddress(s.stop.address)} · {s.stop.window} · {s.packageName} ({s.totes} totes)
                        </p>
                      </div>
                      <select className={selectCls} value={s.stop.driverId ?? ''} aria-label="Assign driver"
                        onChange={(e) => updateStop.mutate({ id: s.stop.id, driverId: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">No driver</option>
                        {(data?.drivers ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <select className={selectCls} value={s.stop.vehicleId ?? ''} aria-label="Assign vehicle"
                        onChange={(e) => updateStop.mutate({ id: s.stop.id, vehicleId: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">No vehicle</option>
                        {(data?.vehicles ?? []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={s.stop.status} />
                        <select className={selectCls} value={s.stop.status} aria-label="Stop status"
                          onChange={(e) => updateStop.mutate({ id: s.stop.id, status: e.target.value as never })}>
                          {stopStatuses.map((st) => <option key={st} value={st} className="capitalize">{st}</option>)}
                        </select>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </OpsLayout>
  );
}

function FleetManager({
  vehicles, drivers, onAddVehicle, onAddDriver,
}: {
  vehicles: { id: number; name: string; capacityTotes: number }[];
  drivers: { id: number; name: string }[];
  onAddVehicle: (name: string, cap: number) => void;
  onAddDriver: (name: string, phone: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [vName, setVName] = useState('');
  const [vCap, setVCap] = useState('60');
  const [dName, setDName] = useState('');
  const [dPhone, setDPhone] = useState('');

  return (
    <div className="ml-auto">
      <button className="btn-outline !px-4 !py-2.5 !text-sm" onClick={() => setOpen(!open)} aria-expanded={open}>
        Fleet & drivers ({vehicles.length} vehicles · {drivers.length} drivers)
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-80 rounded-2xl border border-border bg-white p-4 shadow-xl">
          <p className="text-xs font-bold uppercase text-charcoal-300">Vehicles</p>
          <ul className="mt-1 text-sm">{vehicles.map((v) => <li key={v.id}>{v.name} ({v.capacityTotes} totes)</li>)}</ul>
          <div className="mt-2 flex gap-2">
            <input className={inputCls} placeholder="Vehicle name" value={vName} onChange={(e) => setVName(e.target.value)} aria-label="Vehicle name" />
            <input className={`${inputCls} w-20`} type="number" value={vCap} onChange={(e) => setVCap(e.target.value)} aria-label="Capacity" />
          </div>
          <button className="btn-primary mt-2 w-full !py-2 !text-sm" disabled={!vName}
            onClick={() => { onAddVehicle(vName, Number(vCap)); setVName(''); }}>Add vehicle</button>
          <p className="mt-4 text-xs font-bold uppercase text-charcoal-300">Drivers</p>
          <ul className="mt-1 text-sm">{drivers.map((d) => <li key={d.id}>{d.name}</li>)}</ul>
          <div className="mt-2 flex gap-2">
            <input className={inputCls} placeholder="Driver name" value={dName} onChange={(e) => setDName(e.target.value)} aria-label="Driver name" />
            <input className={inputCls} placeholder="Phone" value={dPhone} onChange={(e) => setDPhone(e.target.value)} aria-label="Driver phone" />
          </div>
          <button className="btn-primary mt-2 w-full !py-2 !text-sm" disabled={!dName}
            onClick={() => { onAddDriver(dName, dPhone); setDName(''); setDPhone(''); }}>Add driver</button>
        </div>
      )}
    </div>
  );
}
