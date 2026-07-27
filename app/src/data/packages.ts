// Packages & add-ons — mirrors the `packages` and `addons` D1 tables.
// Production source of truth: D1 via the ToteOps backend API. Never hard-code
// prices into page components; pages read from this module (the API boundary).

export interface RentalPackage {
  id: string;
  name: string;
  slug: string;
  totes: number;
  dollies: number;
  rentalDays: number;
  launchPrice: number;
  standardPrice: number;
  extraWeekPrice: number;
  bestFor: string;
  featured: boolean;
  active: boolean;
  launchPricingActive: boolean;
}

export const packages: RentalPackage[] = [
  {
    id: 'pkg-quick-pack',
    name: 'Quick Pack',
    slug: 'quick-pack',
    totes: 12,
    dollies: 1,
    rentalDays: 7,
    launchPrice: 69,
    standardPrice: 79,
    extraWeekPrice: 25,
    bestFor: 'Studios, dorm rooms, small projects, and decluttering',
    featured: false,
    active: true,
    launchPricingActive: true,
  },
  {
    id: 'pkg-apartment',
    name: 'Apartment',
    slug: 'apartment',
    totes: 20,
    dollies: 1,
    rentalDays: 14,
    launchPrice: 99,
    standardPrice: 109,
    extraWeekPrice: 35,
    bestFor: 'Studios and one-bedroom moves',
    featured: false,
    active: true,
    launchPricingActive: true,
  },
  {
    id: 'pkg-home',
    name: 'Home',
    slug: 'home',
    totes: 40,
    dollies: 2,
    rentalDays: 14,
    launchPrice: 169,
    standardPrice: 189,
    extraWeekPrice: 55,
    bestFor: 'Many two- and three-bedroom moves',
    featured: true,
    active: true,
    launchPricingActive: true,
  },
  {
    id: 'pkg-large-home',
    name: 'Large Home',
    slug: 'large-home',
    totes: 60,
    dollies: 3,
    rentalDays: 14,
    launchPrice: 219,
    standardPrice: 259,
    extraWeekPrice: 75,
    bestFor: 'Larger homes, families, and extended remodeling projects',
    featured: false,
    active: true,
    launchPricingActive: true,
  },
  {
    id: 'pkg-estate-office',
    name: 'Estate or Office',
    slug: 'estate-office',
    totes: 100,
    dollies: 5,
    rentalDays: 14,
    launchPrice: 349,
    standardPrice: 399,
    extraWeekPrice: 110,
    bestFor: 'Offices, estates, restoration projects, and major transitions',
    featured: false,
    active: true,
    launchPricingActive: true,
  },
];

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  maxQty: number;
  active: boolean;
}

export const addOns: AddOn[] = [
  { id: 'addon-totes-5', name: 'Extra totes (5-pack)', description: 'Five additional totes for your rental.', price: 15, unit: 'per rental', maxQty: 8, active: true },
  { id: 'addon-dolly', name: 'Extra dolly', description: 'Additional low-profile tote dolly.', price: 12, unit: 'per rental', maxQty: 4, active: true },
  { id: 'addon-hand-truck', name: 'Hand truck', description: 'Two-wheel hand truck for heavy stacks.', price: 14, unit: 'per rental', maxQty: 2, active: true },
  { id: 'addon-blankets', name: 'Moving blankets (6-pack)', description: 'Protective blankets for furniture and fragile items.', price: 18, unit: 'per rental', maxQty: 4, active: true },
  { id: 'addon-qr-kit', name: 'QR label kit', description: 'Numbered QR labels to inventory every tote.', price: 9, unit: 'per rental', maxQty: 1, active: true },
  { id: 'addon-extra-week', name: 'Extra rental week', description: 'Extend your rental by seven days.', price: 0, unit: 'per package rate', maxQty: 4, active: true },
];

// Current price a customer pays (launch pricing wins while active).
export function currentPrice(pkg: RentalPackage): number {
  return pkg.launchPricingActive ? pkg.launchPrice : pkg.standardPrice;
}

export function getPackageBySlug(slug: string): RentalPackage | undefined {
  return packages.find((p) => p.slug === slug && p.active);
}
