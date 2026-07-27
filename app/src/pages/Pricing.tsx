import { Link } from 'react-router';
import { Info } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { PackageCard } from '@/components/PackageCard';
import { ComparisonTable } from '@/components/ComparisonTable';
import { FaqAccordion } from '@/components/FaqAccordion';
import { useSeo } from '@/hooks/useSeo';
import { packages, addOns } from '@/data/packages';
import { faqs, replacementFees } from '@/data/content';
import { zones } from '@/data/zones';

export function Pricing() {
  useSeo({
    title: 'Moving Tote Rental Packages & Pricing',
    description:
      'Compare reusable moving tote rental packages — from 12-tote Quick Pack to 100-tote Estate or Office. Launch pricing, add-ons, zone fees, and extension rates, all upfront.',
  });

  const pricingFaqs = faqs.filter((f) => f.category === 'Pricing');

  return (
    <main id="main-content">
      <section className="wave-bg bg-mist py-14 lg:py-20">
        <div className="container-site">
          <SectionHeader
            eyebrow="Pricing"
            title="Packages & honest pricing"
            lead="Every fee is listed on this page — packages, add-ons, zone fees, extensions, and replacement charges. No calling for a quote, no surprises at checkout."
          />
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container-site">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {packages.filter((p) => p.active).map((pkg) => (
              <div key={pkg.id} id={pkg.slug} className="scroll-mt-28">
                <PackageCard pkg={pkg} />
              </div>
            ))}
          </div>

          <div className="mt-16">
            <h2 className="text-2xl font-bold text-navy-700">Package comparison</h2>
            <div className="mt-6">
              <ComparisonTable />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-mist py-14">
        <div className="container-site grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-navy-700">Add-ons</h2>
            <div className="mt-6 grid gap-4">
              {addOns.filter((a) => a.active && a.id !== 'addon-extra-week').map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-white p-4">
                  <div>
                    <p className="font-semibold text-navy-700">{a.name}</p>
                    <p className="text-sm text-charcoal-400">{a.description}</p>
                  </div>
                  <p className="whitespace-nowrap font-bold text-teal">
                    ${a.price} <span className="text-xs font-medium text-charcoal-300">{a.unit}</span>
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-white p-4">
                <div>
                  <p className="font-semibold text-navy-700">Extra rental week</p>
                  <p className="text-sm text-charcoal-400">Extend any package by seven days.</p>
                </div>
                <p className="whitespace-nowrap font-bold text-teal">package rate</p>
              </div>
            </div>
          </div>

          <div className="grid gap-8">
            <div>
              <h2 className="text-2xl font-bold text-navy-700">Service-zone fees</h2>
              <div className="mt-6 grid gap-4">
                {zones.map((z) => (
                  <div key={z.id} className="rounded-xl border border-border bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-navy-700">{z.name}</p>
                      <p className="font-bold text-teal">{z.fee === 0 ? 'Included' : `$${z.fee}`}</p>
                    </div>
                    <p className="mt-1 text-sm text-charcoal-400">{z.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-navy-700">Damage & replacement fees</h2>
              <p className="mt-2 text-sm text-charcoal-400">
                Normal wear is never charged. These fees apply only to equipment damaged beyond
                normal use or not returned, per the rental agreement.
              </p>
              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {replacementFees.map((r) => (
                      <tr key={r.item} className="border-b border-border last:border-0">
                        <th scope="row" className="px-4 py-3 font-medium text-charcoal-500">{r.item}</th>
                        <td className="px-4 py-3 text-right font-bold text-navy-700">${r.fee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHeader eyebrow="Pricing FAQ" title="Pricing questions" />
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-mist p-4 text-sm text-charcoal-500">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />
              Michigan sales tax (6%) is estimated at checkout and shown before you confirm.
            </p>
          </div>
          <FaqAccordion items={pricingFaqs} />
        </div>
      </section>

      <section className="bg-teal py-14">
        <div className="container-site text-center">
          <h2 className="text-3xl font-extrabold text-white">Ready to check your dates?</h2>
          <div className="mt-6">
            <Link to="/book" className="btn-gold">Check Availability</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
