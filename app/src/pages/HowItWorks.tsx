import { Link } from 'react-router';
import { BadgeCheck, CalendarCheck, PackageOpen, Sparkles, Truck } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { useSeo } from '@/hooks/useSeo';

const timeline = [
  {
    icon: CalendarCheck,
    title: 'Reserve',
    body: 'Choose your package, dates, and delivery and pickup addresses. Check availability online, review your estimated total, sign the rental agreement, and complete payment to confirm.',
  },
  {
    icon: Truck,
    title: 'We deliver',
    body: 'Clean totes and dollies arrive at your delivery address before your move or project. Contactless drop-off is available — tell us where to leave the equipment during booking.',
  },
  {
    icon: PackageOpen,
    title: 'You pack and move',
    body: 'Pack the totes at your pace and move your belongings using your own vehicle or the moving company of your choice. Totes stack uniformly and roll on the included dollies.',
  },
  {
    icon: Truck,
    title: 'We pick up',
    body: 'Empty the totes and we collect the equipment — from your original address or your new one, as long as both are inside our service area. Changes after confirmation require approval.',
  },
  {
    icon: Sparkles,
    title: 'We clean and inspect',
    body: 'Every tote is washed, wiped, and inspected before its next rental. Equipment that fails inspection is pulled from circulation.',
  },
];

export function HowItWorks() {
  useSeo({
    title: 'How Moving Tote Rental Works',
    description:
      'Reserve online, we deliver clean totes and dollies, you pack and move, and we pick up the empty equipment from your original or new address.',
  });

  return (
    <main id="main-content">
      <section className="wave-bg bg-mist py-14 lg:py-20">
        <div className="container-site">
          <SectionHeader
            eyebrow="How it works"
            title="The whole process, start to finish"
            lead="Renting moving totes is simpler than a cardboard run. Here is exactly what happens from reservation to pickup."
          />
        </div>
      </section>

      <section className="bg-white py-14 lg:py-20">
        <div className="container-site">
          <ol className="relative mx-auto max-w-3xl">
            <div className="absolute bottom-8 left-6 top-8 w-0.5 bg-teal-100" aria-hidden />
            {timeline.map((t, i) => (
              <li key={t.title} className="relative flex gap-6 pb-10 last:pb-0">
                <div className="z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal text-white shadow">
                  <t.icon className="h-6 w-6" aria-hidden />
                </div>
                <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-teal">Step {i + 1}</p>
                  <h2 className="mt-1 text-xl font-bold text-navy-700">{t.title}</h2>
                  <p className="mt-2 leading-relaxed text-charcoal-500">{t.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mx-auto mt-12 max-w-3xl rounded-2xl bg-navy-50 p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-navy-700">
              <BadgeCheck className="h-5 w-5 text-teal" aria-hidden />
              What we are — and what we are not
            </h2>
            <p className="mt-3 leading-relaxed text-charcoal-500">
              Great Lakes Moving Totes is an equipment rental company. We rent, deliver, and pick up
              reusable moving totes and dollies. We are <strong>not a moving carrier</strong> — we
              never pack, load, or transport your belongings. That part stays in your hands (or your
              mover's).
            </p>
          </div>

          <div className="mt-12 text-center">
            <Link to="/book" className="btn-gold">Check Availability</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
