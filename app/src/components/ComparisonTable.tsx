import { Link } from 'react-router';
import { packages, currentPrice } from '@/data/packages';

// Responsive: table on desktop, stacked cards on mobile.
export function ComparisonTable() {
  const active = packages.filter((p) => p.active);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Package comparison</caption>
          <thead>
            <tr className="border-b border-border bg-mist text-navy-700">
              <th scope="col" className="px-5 py-4 font-bold">Package</th>
              <th scope="col" className="px-5 py-4 font-bold">Totes</th>
              <th scope="col" className="px-5 py-4 font-bold">Dollies</th>
              <th scope="col" className="px-5 py-4 font-bold">Rental</th>
              <th scope="col" className="px-5 py-4 font-bold">Launch Price</th>
              <th scope="col" className="px-5 py-4 font-bold">Standard</th>
              <th scope="col" className="px-5 py-4 font-bold">Extra Week</th>
              <th scope="col" className="px-5 py-4 font-bold">Recommended Use</th>
            </tr>
          </thead>
          <tbody>
            {active.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-mist/50">
                <th scope="row" className="px-5 py-4 font-bold text-navy-700">
                  {p.name}
                  {p.featured && (
                    <span className="ml-2 rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gold-700">
                      Popular
                    </span>
                  )}
                </th>
                <td className="px-5 py-4">{p.totes}</td>
                <td className="px-5 py-4">{p.dollies}</td>
                <td className="px-5 py-4">{p.rentalDays} days</td>
                <td className="px-5 py-4 font-semibold text-teal">
                  {p.launchPricingActive ? `$${p.launchPrice}` : '—'}
                </td>
                <td className="px-5 py-4">${p.standardPrice}</td>
                <td className="px-5 py-4">${p.extraWeekPrice}</td>
                <td className="max-w-xs px-5 py-4 text-charcoal-400">{p.bestFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="grid gap-4 md:hidden">
        {active.map((p) => (
          <article key={p.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-700">{p.name}</h3>
              {p.featured && (
                <span className="rounded-full bg-gold-100 px-2.5 py-1 text-[10px] font-bold uppercase text-gold-700">
                  Popular
                </span>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div><dt className="text-charcoal-300">Totes</dt><dd className="font-semibold">{p.totes}</dd></div>
              <div><dt className="text-charcoal-300">Dollies</dt><dd className="font-semibold">{p.dollies}</dd></div>
              <div><dt className="text-charcoal-300">Rental</dt><dd className="font-semibold">{p.rentalDays} days</dd></div>
              <div><dt className="text-charcoal-300">Extra week</dt><dd className="font-semibold">${p.extraWeekPrice}</dd></div>
              <div>
                <dt className="text-charcoal-300">Launch</dt>
                <dd className="font-semibold text-teal">{p.launchPricingActive ? `$${p.launchPrice}` : '—'}</dd>
              </div>
              <div><dt className="text-charcoal-300">Standard</dt><dd className="font-semibold">${p.standardPrice}</dd></div>
            </dl>
            <p className="mt-3 text-sm text-charcoal-400">{p.bestFor}</p>
            <Link to={`/book?package=${p.slug}`} className="btn-primary mt-4 w-full !py-2.5 !text-sm">
              Check Availability — ${currentPrice(p)}
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
