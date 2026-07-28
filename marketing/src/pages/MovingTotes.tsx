import { Link } from 'react-router';
import { AlertTriangle, Ban, Check, Ruler, Sparkles, Weight } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { useSeo } from '@/hooks/useSeo';

const features = [
  { title: 'Attached snap-on lids', body: 'Lids stay connected to the tote — nothing to lose, and contents stay covered from dust and ordinary weather.' },
  { title: 'Built-in handles', body: 'Recessed handles on both ends make loaded totes easier to lift and carry with a partner.' },
  { title: 'Uniform, stackable design', body: 'Every tote is the same size, so stacks stay stable in rooms, garages, vehicles, and storage areas.' },
  { title: 'Durable plastic', body: 'Crush-resistant walls protect contents far better than cardboard and hold up to repeat use.' },
  { title: 'Dolly compatible', body: 'Loaded totes seat securely on our low-profile tote dollies for easy rolling.' },
  { title: 'Label friendly', body: 'Smooth label panels accept our QR label kits so you can inventory every tote.' },
];

const prohibited = [
  'Hazardous materials, chemicals, fuels, or solvents',
  'Wet or damp items that could damage the tote or the next rental',
  'Perishable food',
  'Live animals or plants',
  'Loose sharp objects that could puncture walls or lids',
  'Items over the per-tote weight limit',
];

const safeUse = [
  'Keep individual totes under the posted weight limit — pack books across several totes.',
  'Do not stack more than four loaded totes high.',
  'Never stand on totes or use them as ladders.',
  'Keep totes indoors or under cover; they are not for long-term outdoor storage.',
  'Close and latch lids before stacking or rolling on a dolly.',
];

export function MovingTotes() {
  useSeo({
    title: 'Our Reusable Moving Totes & Equipment',
    description:
      'Durable, stackable, weather-resistant moving totes with attached lids and built-in handles — cleaned and inspected between every rental. Dollies, packing guidance, and safe-use rules.',
  });

  return (
    <main id="main-content">
      <section className="wave-bg bg-mist py-14 lg:py-20">
        <div className="container-site">
          <SectionHeader
            eyebrow="The equipment"
            title="Moving totes built to be used hard"
            lead="The same commercial-grade reusable totes used by professional organizers and restoration crews — cleaned, inspected, and delivered to your door."
          />
        </div>
      </section>

      <section className="bg-white py-14 lg:py-20">
        <div className="container-site">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article key={f.title} className="card-lift rounded-2xl border border-border bg-white p-6 shadow-sm">
                <Check className="h-6 w-6 text-teal" aria-hidden />
                <h2 className="mt-3 text-lg font-bold text-navy-700">{f.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-400">{f.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl bg-navy-700 p-8 text-white">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Ruler className="h-5 w-5 text-gold" aria-hidden /> Approximate dimensions
              </h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-2"><dt>Length</dt><dd className="font-bold">~27 in</dd></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><dt>Width</dt><dd className="font-bold">~17 in</dd></div>
                <div className="flex justify-between border-b border-white/10 pb-2"><dt>Height</dt><dd className="font-bold">~12 in</dd></div>
                <div className="flex justify-between"><dt>Capacity</dt><dd className="font-bold">~2.5 cu ft</dd></div>
              </dl>
              <h2 className="mt-8 flex items-center gap-2 text-xl font-bold">
                <Weight className="h-5 w-5 text-gold" aria-hidden /> Weight limit
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-100">
                Keep each tote under <strong>50 lbs</strong>. Heavy items like books and tools should
                be split across multiple totes. Exact dimensions and limits are listed in your
                rental agreement.
              </p>
            </div>

            <div className="rounded-2xl bg-mist p-8">
              <h2 className="flex items-center gap-2 text-xl font-bold text-navy-700">
                <Sparkles className="h-5 w-5 text-teal" aria-hidden /> Cleaning between rentals
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-500">
                Every tote and dolly is cleaned and inspected between rentals: washed, wiped down,
                and checked for cracks, broken latches, and lid damage. Equipment that fails
                inspection is removed from circulation. Note that totes are weather-resistant, not
                waterproof, and cleaned — not sterilized.
              </p>
              <h2 className="mt-8 flex items-center gap-2 text-xl font-bold text-navy-700">
                <AlertTriangle className="h-5 w-5 text-gold-600" aria-hidden /> Safe-use rules
              </h2>
              <ul className="mt-3 grid gap-2 text-sm text-charcoal-500">
                {safeUse.map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8">
            <h2 className="flex items-center gap-2 text-xl font-bold text-red-800">
              <Ban className="h-5 w-5" aria-hidden /> Prohibited contents
            </h2>
            <ul className="mt-4 grid gap-2 text-sm text-red-900 sm:grid-cols-2">
              {prohibited.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <Ban className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 text-center">
            <Link to="/book" className="btn-gold">Check Availability</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
