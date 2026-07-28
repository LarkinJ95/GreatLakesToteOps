import { useState } from 'react';
import { SectionHeader } from '@/components/SectionHeader';
import { FaqAccordion } from '@/components/FaqAccordion';
import { useSeo } from '@/hooks/useSeo';
import { faqCategories, faqs } from '@/data/content';

export function FaqPage() {
  const [category, setCategory] = useState<string>('All');

  const visible = category === 'All' ? faqs : faqs.filter((f) => f.category === category);

  useSeo({
    title: 'Frequently Asked Questions',
    description:
      'Answers about moving tote rentals: how many totes you need, two-address delivery and pickup, cleaning, extensions, damage fees, service areas, and business accounts.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    },
  });

  return (
    <main id="main-content">
      <section className="wave-bg bg-mist py-14 lg:py-20">
        <div className="container-site">
          <SectionHeader
            eyebrow="FAQ"
            title="Frequently asked questions"
            lead="Everything about reservations, delivery, equipment, cleaning, pricing, and business accounts — in plain language."
          />
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container-site max-w-4xl">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="FAQ categories">
            {['All', ...faqCategories].map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={category === c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  category === c
                    ? 'bg-navy-700 text-white'
                    : 'bg-mist text-charcoal-500 hover:bg-teal-50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-8">
            <FaqAccordion items={visible} />
          </div>
        </div>
      </section>
    </main>
  );
}
