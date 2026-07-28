import { Link } from 'react-router';
import { MapPin } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { ZoneChecker } from '@/components/ZoneChecker';
import { useSeo } from '@/hooks/useSeo';
import { cities, zones, getZone } from '@/data/zones';

export function ServiceAreas() {
  useSeo({
    title: 'Service Areas — Midland, Saginaw, Bay City & Beyond',
    description:
      'Moving tote delivery and pickup across the Great Lakes Bay Region: Midland, Auburn, Freeland, Saginaw, Bay City, Sanford, Coleman, and Zone 3 custom routes. Check your address.',
  });

  return (
    <main id="main-content">
      <section className="wave-bg bg-mist py-14 lg:py-20">
        <div className="container-site">
          <SectionHeader
            eyebrow="Service areas"
            title="Where we deliver"
            lead="Routes are planned around Midland, Saginaw, and Bay City, with Core Zone delivery included in every package."
          />
          <div className="mt-10">
            <ZoneChecker />
          </div>
        </div>
      </section>

      <section className="bg-white py-14 lg:py-20">
        <div className="container-site">
          <h2 className="text-2xl font-bold text-navy-700">Zones at a glance</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {zones.map((z) => (
              <div key={z.id} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-navy-700">{z.name}</h3>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-bold text-teal">
                    {z.fee === 0 ? 'Included' : `$${z.fee} fee`}
                  </span>
                </div>
                <p className="mt-2 text-sm text-charcoal-400">{z.description}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-14 text-2xl font-bold text-navy-700">Communities we serve</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {cities.map((c) => {
              const zone = getZone(c.zoneId);
              return (
                <article key={c.slug} className="card-lift rounded-2xl border border-border bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-xl font-bold text-navy-700">
                      <MapPin className="h-5 w-5 text-teal" aria-hidden />
                      {c.name}
                    </h3>
                    <span className="rounded-full bg-mist px-3 py-1 text-xs font-bold text-navy-700">
                      {zone?.name}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-charcoal-500">{c.blurb}</p>
                  <ul className="mt-4 grid gap-2">
                    {c.localTips.map((t) => (
                      <li key={t} className="flex items-start gap-2 text-sm text-charcoal-400">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <Link to="/book" className="btn-outline mt-5 !py-2.5 !text-sm">
                    Check Availability in {c.name}
                  </Link>
                </article>
              );
            })}
          </div>

          <p className="mt-10 rounded-xl bg-navy-50 p-5 text-sm text-charcoal-500">
            We never publish our storage or warehouse locations. All deliveries are scheduled
            routes — enter your exact address during booking for a final eligibility confirmation.
          </p>
        </div>
      </section>
    </main>
  );
}
