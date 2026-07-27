import { Link } from 'react-router';
import {
  Archive, Armchair, BadgeCheck, Building2, CalendarClock, Church, CloudRain, Hammer, Hand,
  HeartHandshake, Home as HomeIcon, Layers, Lock, MapPin, Paintbrush, Recycle, Scissors,
  ShieldAlert, Sparkles, Star, Truck, Waves,
} from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { PackageCard } from '@/components/PackageCard';
import { ComparisonTable } from '@/components/ComparisonTable';
import { FaqAccordion } from '@/components/FaqAccordion';
import { ZoneChecker } from '@/components/ZoneChecker';
import { useSeo, defaultOrgJsonLd } from '@/hooks/useSeo';
import { packages } from '@/data/packages';
import {
  benefits, businessAudiences, faqs, homepageFaqIds, howItWorksSteps, testimonials,
  trustItems, useCases,
} from '@/data/content';
import { site } from '@/data/site';
import heroImg from '@/assets/img/hero.jpg';
import twoAddressImg from '@/assets/img/two-address.jpg';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Scissors, Layers, CloudRain, Hand, Recycle, Truck, MapPin, Waves, BadgeCheck, Lock,
  CalendarClock, Building2, Home: HomeIcon, Hammer, Paintbrush, Sparkles, Armchair,
  HeartHandshake, Archive, Briefcase: Building2, Church, ShieldAlert,
};

function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = iconMap[name] ?? Sparkles;
  return <Cmp className={className} />;
}

export function Home() {
  useSeo({
    title: 'Moving Tote Rental in Midland, Saginaw & Bay City',
    description:
      'Rent clean, stackable moving totes delivered to your door in Midland, Saginaw, Bay City, and surrounding communities. We drop them off. You pack and move. We pick them up.',
    jsonLd: [
      defaultOrgJsonLd(),
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: site.name,
        url: '/',
      },
    ],
  });

  const homeFaqs = faqs.filter((f) => homepageFaqIds.includes(f.id));
  const featuredTestimonials = testimonials.filter((t) => t.featured);
  const homepageUseCases = useCases.slice(0, 6);

  return (
    <main id="main-content">
      {/* 2. Hero */}
      <section className="wave-bg bg-white pb-24 pt-12 lg:pt-20">
        <div className="container-site grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">{site.tagline}</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight text-navy-700 sm:text-5xl lg:text-6xl">
              Moving without the cardboard mess.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-charcoal-500">
              Rent clean, stackable moving totes delivered to your door in Midland, Saginaw, Bay
              City, and surrounding communities. We drop them off. You pack and move. We pick them
              up when you are done.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/book" className="btn-gold">Check Availability</Link>
              <Link to="/pricing" className="btn-outline">View Packages</Link>
            </div>
            <ul className="mt-8 grid max-w-lg grid-cols-1 gap-2 text-sm font-medium text-charcoal-500 sm:grid-cols-2">
              {[
                'Delivery and pickup available',
                'Same-address or new-address pickup',
                'Dollies available',
                'Cleaned and inspected between rentals',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-teal" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <img
              src={heroImg}
              alt="Matching navy reusable moving totes with attached lids stacked beside a low-profile dolly in a bright home entryway"
              className="w-full rounded-2xl shadow-xl"
              width={1536}
              height={1024}
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* 3. Trust strip */}
      <section className="border-y border-border bg-mist py-6">
        <div className="container-site">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {trustItems.map((item) => (
              <li key={item.label} className="flex flex-col items-center gap-2 text-center">
                <Icon name={item.icon} className="h-6 w-6 text-teal" />
                <span className="text-xs font-semibold text-navy-700">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. How it works */}
      <section className="bg-white py-16 lg:py-24">
        <div className="container-site">
          <SectionHeader
            eyebrow="How it works"
            title="Four steps. No cardboard."
            align="center"
          />
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorksSteps.map((s) => (
              <li key={s.step} className="relative rounded-2xl border border-border bg-white p-6 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal text-lg font-extrabold text-white">
                  {s.step}
                </span>
                <h3 className="mt-4 text-lg font-bold text-navy-700">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-400">{s.description}</p>
              </li>
            ))}
          </ol>
          <p className="mx-auto mt-8 max-w-2xl rounded-xl bg-navy-50 px-5 py-4 text-center text-sm font-semibold text-navy-700">
            Great Lakes Moving Totes rents and delivers equipment. We do not transport customer
            belongings.
          </p>
          <div className="mt-6 text-center">
            <Link to="/how-it-works" className="font-semibold text-teal hover:text-teal-600">
              See the full process →
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Why customers choose totes */}
      <section className="tote-pattern bg-mist py-16 lg:py-24">
        <div className="container-site">
          <SectionHeader
            eyebrow="Why totes"
            title="Why customers choose totes over cardboard"
            lead="No tape, no assembly, no soggy boxes on moving day — and nothing to break down and drag to the curb afterward."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <article key={b.id} className="card-lift rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
                  <Icon name={b.icon} className="h-6 w-6 text-teal" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-navy-700">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-400">{b.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Package pricing */}
      <section className="bg-white py-16 lg:py-24" id="packages">
        <div className="container-site">
          <SectionHeader
            eyebrow="Packages & pricing"
            title="Pick a package. Know the price."
            lead="Every package includes cleaned and inspected totes, dollies, and delivery and pickup inside the Core Zone. Launch pricing is live for founding customers."
            align="center"
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {packages.filter((p) => p.active).map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>

          {/* 7. Comparison table */}
          <div className="mt-16">
            <h3 className="text-center text-2xl font-bold text-navy-700">Compare every package</h3>
            <div className="mt-8">
              <ComparisonTable />
            </div>
          </div>
        </div>
      </section>

      {/* 8. Use cases */}
      <section className="bg-mist py-16 lg:py-24">
        <div className="container-site">
          <SectionHeader
            eyebrow="Uses"
            title="Built for more than moving day"
            lead="Remodels, flooring projects, downsizing, office transitions — if you need rooms packed and out of the way, totes fit the job."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {homepageUseCases.map((uc) => {
              const pkg = packages.find((p) => p.slug === uc.recommendedPackageSlug);
              return (
                <article key={uc.id} className="card-lift flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50">
                    <Icon name={uc.icon} className="h-6 w-6 text-navy-700" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-navy-700">{uc.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-charcoal-400">{uc.description}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-teal">
                    Recommended: {pkg?.name}
                  </p>
                  <Link to={`/book?package=${uc.recommendedPackageSlug}`} className="btn-outline mt-4 !py-2.5 !text-sm">
                    Check Availability
                  </Link>
                </article>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link to="/remodeling-storage" className="font-semibold text-teal hover:text-teal-600">
              Explore remodeling & storage uses →
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Two-address service */}
      <section className="bg-navy-700 py-16 lg:py-24">
        <div className="container-site grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow !text-gold">Two-address service</p>
            <h2 className="section-title !text-white">
              We deliver to your current address and pick up from your new one.
            </h2>
            <p className="section-lead !text-navy-100">
              Moving means two addresses — your rental should understand that. Drop-off happens
              where you are, pickup happens where you land.
            </p>
            <ul className="mt-6 grid gap-3 text-sm text-navy-100">
              {[
                'Both addresses must be within the approved service area.',
                'Additional zone charges may apply — shown before you confirm.',
                'You provide both addresses during booking.',
                'Pickup-location changes after confirmation require approval so we can adjust routing.',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link to="/book" className="btn-gold">Start a Reservation</Link>
            </div>
          </div>
          <img
            src={twoAddressImg}
            alt="Uniform reusable moving totes stacked beside the front porch of a Michigan home"
            className="w-full rounded-2xl shadow-xl"
            loading="lazy"
          />
        </div>
      </section>

      {/* 10. Service area checker */}
      <section className="bg-white py-16 lg:py-24">
        <div className="container-site">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
            <div>
              <SectionHeader
                eyebrow="Service area"
                title="Check your address"
                lead="Enter your address to see your service zone and any zone fee before you book. Outside our standard routes? Request a custom quote for Zone 3 service."
              />
              <ul className="mt-6 grid gap-2 text-sm text-charcoal-500">
                <li><strong className="text-navy-700">Core Zone:</strong> Midland, Auburn, Freeland — delivery included</li>
                <li><strong className="text-navy-700">Zone 2:</strong> Saginaw, Bay City, Sanford, Coleman — $25 zone fee</li>
                <li><strong className="text-navy-700">Zone 3:</strong> Outer Great Lakes Bay Region — custom routes</li>
              </ul>
              <div className="mt-6">
                <Link to="/service-areas" className="font-semibold text-teal hover:text-teal-600">
                  See all service areas →
                </Link>
              </div>
            </div>
            <ZoneChecker />
          </div>
        </div>
      </section>

      {/* 11. Availability CTA band */}
      <section className="tote-pattern bg-teal-50 py-16">
        <div className="container-site text-center">
          <h2 className="text-3xl font-extrabold text-navy-700">Check real availability for your dates</h2>
          <p className="mx-auto mt-3 max-w-2xl text-charcoal-500">
            Tell us your package, dates, and addresses. We check clean inventory, route capacity,
            and your service zone — then you decide. No account required to browse or check.
          </p>
          <div className="mt-6">
            <Link to="/book" className="btn-gold">Check Availability</Link>
          </div>
        </div>
      </section>

      {/* 12. Reviews */}
      <section className="bg-white py-16 lg:py-24">
        <div className="container-site">
          <SectionHeader
            eyebrow="Reviews"
            title="What customers say"
            align="center"
          />
          <p className="mx-auto mt-3 max-w-xl rounded-lg bg-gold-50 px-4 py-2 text-center text-xs font-semibold text-gold-700">
            Pre-launch: reviews below are clearly marked sample content. Real customer reviews are
            published only after they are received.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featuredTestimonials.map((t) => (
              <figure key={t.id} className="card-lift flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="flex gap-1" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < t.rating ? 'fill-gold text-gold' : 'text-border'}`}
                      aria-hidden
                    />
                  ))}
                </div>
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-charcoal-500">
                  “{t.text}”
                </blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-bold text-navy-700">{t.name}</span>
                  <span className="text-charcoal-300"> · {t.city}</span>
                  {t.sample && (
                    <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[10px] font-bold uppercase text-charcoal-400">
                      Sample
                    </span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/about#reviews" className="btn-outline">Read More Reviews</Link>
          </div>
        </div>
      </section>

      {/* 13. Business accounts */}
      <section className="bg-navy-700 py-16 lg:py-24">
        <div className="container-site grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow !text-gold">Business accounts</p>
            <h2 className="section-title !text-white">
              Reusable tote rentals for teams and recurring projects.
            </h2>
            <p className="section-lead !text-navy-100">
              Volume packages, monthly invoicing, purchase-order support, and asset tracking for
              organizations across the Great Lakes Bay Region.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/contact?type=business" className="btn-gold">Request a Business Account</Link>
              <Link to="/business-accounts" className="btn-outline-light">View Business Services</Link>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {businessAudiences.map((a) => (
              <li key={a} className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white">
                {a}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 14. Local service */}
      <section className="wave-bg bg-mist py-16 lg:py-24">
        <div className="container-site mx-auto max-w-3xl text-center">
          <p className="eyebrow">Locally owned</p>
          <h2 className="section-title">Built for moves in the Great Lakes Bay Region.</h2>
          <p className="section-lead mx-auto">
            We are locally operated, and our delivery routes are planned around Midland, Saginaw,
            and Bay City. You get direct communication from the people actually delivering your
            totes — and equipment that stands up to Michigan weather better than a cardboard box
            on a wet driveway.
          </p>
        </div>
      </section>

      {/* 15. FAQ preview */}
      <section className="bg-white py-16 lg:py-24">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHeader
              eyebrow="FAQ"
              title="Common questions"
              lead="Straight answers about how rentals work, what we do and don't do, and what to expect on delivery day."
            />
            <div className="mt-6">
              <Link to="/faq" className="btn-outline">View Full FAQ</Link>
            </div>
          </div>
          <FaqAccordion items={homeFaqs} />
        </div>
      </section>

      {/* 16. Final CTA */}
      <section className="bg-teal py-16 lg:py-20">
        <div className="container-site text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to move without the cardboard?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-teal-100">
            Choose your dates, select a package, and let us handle the containers.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/book" className="btn-gold">Check Availability</Link>
            <a href={site.phoneHref} className="btn-outline-light">
              Call {site.name}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
