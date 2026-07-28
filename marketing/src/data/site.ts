// Site settings — mirrors the `site_settings` D1 table.
// Editable via the ToteOps admin dashboard in production.

export const site = {
  name: 'Great Lakes Moving Totes',
  legalName: 'Great Lakes Moving Totes LLC',
  tagline: 'Pack. Stack. Move. Done.',
  serviceStatement:
    'Reusable moving totes delivered before your move and picked up when you are done.',
  phone: '(989) 555-0142',
  phoneHref: 'tel:+19895550142',
  email: 'hello@greatlakesmovingtotes.com',
  emailHref: 'mailto:hello@greatlakesmovingtotes.com',
  hours: 'Mon–Sat, 8:00 AM – 6:00 PM ET',
  portalUrl: '/portal',
  region: 'Great Lakes Bay Region, Michigan',
} as const;

// Announcement bar — mirrors the `announcement_bars` D1 table.
// status: draft | scheduled | published | archived
export const announcement = {
  id: 'ann-001',
  status: 'published' as const,
  message: 'Founding customer pricing available for a limited time — now booking moves in Midland, Saginaw, and Bay City',
};

export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Service Areas', href: '/service-areas' },
  { label: 'Moving Totes', href: '/moving-totes' },
  { label: 'Remodeling & Storage', href: '/remodeling-storage' },
  { label: 'Business Accounts', href: '/business-accounts' },
  { label: 'FAQ', href: '/faq' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const;
