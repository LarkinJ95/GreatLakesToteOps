import { Link } from 'react-router';
import { Check, Info } from 'lucide-react';
import { currentPrice, type RentalPackage } from '@/data/packages';

export function PackageCard({ pkg }: { pkg: RentalPackage }) {
  const price = currentPrice(pkg);
  const launch = pkg.launchPricingActive;

  return (
    <article
      className={`card-lift relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
        pkg.featured ? 'border-2 border-teal ring-4 ring-teal/10' : 'border-border'
      }`}
    >
      {pkg.featured && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gold px-4 py-1 text-xs font-bold uppercase tracking-wide text-navy-900 shadow">
          Most Popular
        </span>
      )}

      <h3 className="text-xl font-bold text-navy-700">{pkg.name}</h3>
      <p className="mt-1 text-sm text-charcoal-400">{pkg.bestFor}</p>

      <div className="mt-5 flex items-end gap-2">
        <span className="text-4xl font-extrabold text-navy-700">${price}</span>
        {launch && (
          <span className="pb-1 text-sm text-charcoal-300 line-through">${pkg.standardPrice}</span>
        )}
      </div>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-teal">
        {launch ? 'Launch price — limited time' : 'Standard rate'}
      </p>

      <ul className="mt-5 grid gap-2.5 text-sm text-charcoal-500">
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-teal" aria-hidden />
          {pkg.totes} reusable totes
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-teal" aria-hidden />
          {pkg.dollies} {pkg.dollies > 1 ? 'dollies' : 'dolly'} included
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-teal" aria-hidden />
          {pkg.rentalDays}-day rental
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-teal" aria-hidden />
          Extra week ${pkg.extraWeekPrice}
        </li>
      </ul>

      <p className="mt-4 flex items-start gap-1.5 text-xs text-charcoal-300">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Zone fees may apply outside the Core Zone — check your address before booking.
      </p>

      <div className="mt-6 grid gap-2">
        <Link to={`/book?package=${pkg.slug}`} className={pkg.featured ? 'btn-gold' : 'btn-primary'}>
          Check Availability
        </Link>
        <Link
          to={`/pricing#${pkg.slug}`}
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-mist"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}
