import { useEffect } from 'react';
import { site } from '@/data/site';

interface SeoInput {
  title: string;
  description: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

// Per-page metadata + JSON-LD. In the production Next.js build this maps to
// generateMetadata + structured-data components; here it manages the document
// head at runtime so every route still ships complete SEO data.
export function useSeo({ title, description, jsonLd }: SeoInput) {
  useEffect(() => {
    document.title = `${title} | ${site.name}`;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;

    const og: Record<string, string> = {
      'og:title': `${title} | ${site.name}`,
      'og:description': description,
      'og:type': 'website',
    };
    for (const [property, content] of Object.entries(og)) {
      let tag = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.content = content;
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seo = 'page';
    script.text = JSON.stringify(jsonLd ?? defaultOrgJsonLd());
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [title, description, jsonLd]);
}

export function defaultOrgJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.legalName,
    description: site.serviceStatement,
    telephone: site.phone,
    email: site.email,
    areaServed: [
      'Midland MI',
      'Saginaw MI',
      'Bay City MI',
      'Auburn MI',
      'Freeland MI',
      'Sanford MI',
      'Coleman MI',
      'Great Lakes Bay Region',
    ],
  };
}
