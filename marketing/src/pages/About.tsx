import { Link } from 'react-router';
import { Star } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { useSeo } from '@/hooks/useSeo';
import { testimonials } from '@/data/content';
import { site } from '@/data/site';

export function About() {
  useSeo({
    title: 'About Us — Locally Owned in the Great Lakes Bay Region',
    description:
      'Great Lakes Moving Totes is a locally owned reusable moving tote rental company serving Midland, Saginaw, Bay City, and the surrounding Great Lakes Bay Region.',
  });

  return (
    <main id="main-content">
      <section className="wave-bg bg-mist py-14 lg:py-20">
        <div className="container-site max-w-3xl">
          <SectionHeader eyebrow="About" title="A local answer to the cardboard box problem" />
          <div className="mt-8 grid gap-5 leading-relaxed text-charcoal-500">
            {/* Editable content placeholders — real company story supplied by the owner before launch */}
            <p>
              {site.legalName} is a locally owned equipment rental company serving Midland,
              Saginaw, Bay City, and the surrounding Great Lakes Bay Region. We rent clean,
              stackable moving totes and dollies — delivered before your move or project and
              picked up when you are done.
            </p>
            <p>
              The idea is simple: cardboard boxes are the worst part of moving. You buy too many,
              tape them together, watch them sag in the rain, and then break them all down and
              figure out how to get rid of them. Reusable totes skip every one of those steps.
            </p>
            <p>
              We keep the company deliberately local. Delivery routes are planned around the
              communities we actually serve, and when you call or email, you reach the people who
              schedule and run those routes.
            </p>
            <p>
              <em>Company story, founding details, and team information will be added here — we
              publish only verified details, never invented history.</em>
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container-site grid gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-bold text-navy-700">Service philosophy</h2>
            <p className="mt-2 text-sm leading-relaxed text-charcoal-500">
              Show up when we say we will, deliver clean equipment, communicate directly, and make
              pickup the easiest part of the whole rental.
            </p>
          </div>
          <div className="rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-bold text-navy-700">Equipment care</h2>
            <p className="mt-2 text-sm leading-relaxed text-charcoal-500">
              Every tote and dolly is cleaned and inspected between rentals. Equipment that fails
              inspection is pulled from circulation.
            </p>
          </div>
          <div className="rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-bold text-navy-700">Service-area commitment</h2>
            <p className="mt-2 text-sm leading-relaxed text-charcoal-500">
              We only take reservations we can serve reliably. If your address is outside our
              routes, we say so upfront instead of over-promising.
            </p>
          </div>
        </div>
      </section>

      <section id="reviews" className="bg-mist py-14">
        <div className="container-site">
          <SectionHeader eyebrow="Reviews" title="Customer reviews" align="center" />
          <p className="mx-auto mt-3 max-w-xl rounded-lg bg-gold-50 px-4 py-2 text-center text-xs font-semibold text-gold-700">
            Sample content shown during pre-launch. Real reviews are published only after they are received from customers.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.id} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="flex gap-1" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < t.rating ? 'fill-gold text-gold' : 'text-border'}`} aria-hidden />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed text-charcoal-500">“{t.text}”</blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-bold text-navy-700">{t.name}</span>
                  <span className="text-charcoal-300"> · {t.city} · {t.source}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 text-center">
        <div className="container-site">
          <h2 className="text-2xl font-bold text-navy-700">Get in touch</h2>
          <p className="mt-2 text-charcoal-500">
            {site.phone} · {site.email} · {site.hours}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/contact" className="btn-primary">Contact Us</Link>
            <Link to="/book" className="btn-gold">Check Availability</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
