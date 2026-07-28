import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Faq } from '@/data/content';

export function FaqAccordion({ items }: { items: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
      {items.map((faq) => {
        const open = openId === faq.id;
        return (
          <div key={faq.id} className="rounded-xl border border-border bg-white shadow-sm">
            <button
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              onClick={() => setOpenId(open ? null : faq.id)}
              aria-expanded={open}
              aria-controls={`${faq.id}-panel`}
            >
              <span className="font-semibold text-navy-700">{faq.question}</span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-teal transition-transform ${open ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {open && (
              <div id={`${faq.id}-panel`} className="border-t border-border px-5 py-4 text-sm leading-relaxed text-charcoal-500">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
