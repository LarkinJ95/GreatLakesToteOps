import { Link } from 'react-router';
import { Check } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { useSeo } from '@/hooks/useSeo';
import { businessAudiences, businessBenefits } from '@/data/content';
import businessImg from '@/assets/img/business.jpg';

export function BusinessAccounts() {
  useSeo({
    title: 'Business Accounts — Volume Tote Rentals',
    description:
      'Reusable tote rentals for realtors, property managers, restoration companies, and offices — volume pricing, recurring rentals, purchase orders, and monthly invoicing.',
  });

  return (
    <main id="main-content">
      <section className="bg-navy-700 py-14 lg:py-20">
        <div className="container-site grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow !text-gold">Business accounts</p>
            <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              Reusable tote rentals for teams and recurring projects.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-navy-100">
              If your organization moves people, contents, or offices more than once a year, a
              business account pays for itself in time saved alone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/contact?type=business" className="btn-gold">Request a Business Account</Link>
            </div>
          </div>
          <img src={businessImg}
            alt="Uniform reusable moving totes stacked in a bright modern office"
            className="w-full rounded-2xl shadow-xl" loading="lazy" />
        </div>
      </section>

      <section className="bg-white py-14 lg:py-20">
        <div className="container-site">
          <SectionHeader eyebrow="Who we serve" title="Built for organizations like yours" />
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {businessAudiences.map((a) => (
              <li key={a} className="rounded-xl border border-border bg-mist px-4 py-3 text-center text-sm font-semibold text-navy-700">
                {a}
              </li>
            ))}
          </ul>

          <div className="mt-14 grid gap-10 lg:grid-cols-2">
            <div>
              <SectionHeader eyebrow="Account benefits" title="What an account includes" />
              <ul className="mt-8 grid gap-3">
                {businessBenefits.map((b) => (
                  <li key={b} className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm">
                    <Check className="h-5 w-5 shrink-0 text-teal" aria-hidden />
                    <span className="font-semibold text-navy-700">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-navy-700 p-8 text-white">
              <h2 className="text-2xl font-bold text-gold">How volume pricing works</h2>
              <p className="mt-4 leading-relaxed text-navy-100">
                Business accounts are priced around your actual usage — tote counts, rental
                frequency, locations, and route distance. Recurring rentals (staging rotations,
                restoration pack-outs, apartment turnovers) qualify for negotiated rates.
              </p>
              <ul className="mt-6 grid gap-3 text-sm text-navy-100">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden /> Purchase orders accepted from approved accounts</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden /> One monthly invoice across all active rentals</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden /> QR and numbered asset tracking so every tote is accounted for</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden /> Statements for clean bookkeeping</li>
              </ul>
              <div className="mt-8">
                <Link to="/contact?type=business" className="btn-gold">Request a Business Account</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
