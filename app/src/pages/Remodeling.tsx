import { Link } from 'react-router';
import { Hammer, Layers, Paintbrush, Armchair, Archive, Sparkles } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { useSeo } from '@/hooks/useSeo';
import { packages } from '@/data/packages';

const uses = [
  {
    icon: Layers,
    title: 'Flooring projects',
    body: 'Installers need completely empty rooms. Pack everything into totes a few days before the crew arrives, stack them in the garage, and move back in once the floors are done.',
    pkg: 'home',
  },
  {
    icon: Paintbrush,
    title: 'Painting projects',
    body: 'Clear walls, shelves, and closets so painters can move fast. Lidded totes keep dust and overspray off your belongings.',
    pkg: 'quick-pack',
  },
  {
    icon: Hammer,
    title: 'Kitchen remodeling',
    body: 'Empty every cabinet and drawer into labeled totes. A QR label kit makes it easy to find the coffee maker on day three of the demo.',
    pkg: 'large-home',
  },
  {
    icon: Archive,
    title: 'Basement organization',
    body: 'Sort years of accumulated storage into uniform, stackable totes — and keep only what earns its space.',
    pkg: 'apartment',
  },
  {
    icon: Armchair,
    title: 'Home staging',
    body: 'Realtors and sellers clear personal items so listings photograph clean. Totes come back out when the home sells.',
    pkg: 'apartment',
  },
  {
    icon: Sparkles,
    title: 'Decluttering',
    body: 'Work room by room at your own pace. Totes keep keep, donate, and store piles organized without a house full of half-built boxes.',
    pkg: 'quick-pack',
  },
];

export function Remodeling() {
  useSeo({
    title: 'Tote Rentals for Remodeling & Short-Term Storage',
    description:
      'Clear rooms fast for flooring, painting, and kitchen remodels. Reusable totes stack out of the work area — delivered before your project and picked up when it wraps.',
  });

  return (
    <main id="main-content">
      <section className="wave-bg bg-mist py-14 lg:py-20">
        <div className="container-site">
          <SectionHeader
            eyebrow="Remodeling & storage"
            title="Clear the room. Keep your sanity."
            lead="Renovation projects live or die by how fast you can empty a space. Totes turn a weekend of box-building into an afternoon of packing."
          />
        </div>
      </section>

      <section className="bg-white py-14 lg:py-20">
        <div className="container-site">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {uses.map((u) => {
              const pkg = packages.find((p) => p.slug === u.pkg);
              return (
                <article key={u.title} className="card-lift flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
                    <u.icon className="h-6 w-6 text-teal" aria-hidden />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-navy-700">{u.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-charcoal-400">{u.body}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-teal">
                    Recommended: {pkg?.name}
                  </p>
                  <Link to={`/book?package=${u.pkg}`} className="btn-outline mt-4 !py-2.5 !text-sm">
                    Check Availability
                  </Link>
                </article>
              );
            })}
          </div>

          <div className="mt-12 rounded-2xl bg-gold-50 p-6 text-sm leading-relaxed text-gold-800">
            <strong>Note:</strong> Totes are designed for moves and short-term projects, indoors or
            under cover. They are not intended for long-term outdoor storage.
          </div>
        </div>
      </section>
    </main>
  );
}
