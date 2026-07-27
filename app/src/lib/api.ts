// Public API boundary — remote-first against the Great Lakes ToteOps backend
// (Cloudflare Workers + D1), with a local simulation fallback for development
// and preview. Set VITE_TOTEOPS_API_URL to go live; response shapes below are
// the production contract (see TOTEOPS-INTEGRATION.md).
//
// Privacy rules enforced here and server-side:
//  - availability responses never expose exact fleet counts, routes, orders,
//    employee schedules, or warehouse locations
//  - no sensitive customer data is placed in query parameters
//  - pricing is recalculated server-side and snapshotted on quote/order

import { packages, addOns, currentPrice, type RentalPackage } from '@/data/packages';
import { cities, findCityByZip, getZone, type CityInfo, type ServiceZone } from '@/data/zones';
import { apiRequest } from '@/lib/apiClient';
import { isLiveBackend } from '@/lib/config';

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Service-area check — POST /api/public/service-area/check
// ---------------------------------------------------------------------------

export interface ZoneCheckResult {
  status: 'in-zone' | 'custom-review' | 'unknown';
  zone: ServiceZone | null;
  city: CityInfo | null;
  message: string;
}

export async function checkServiceArea(address: {
  street: string;
  city: string;
  zip: string;
}): Promise<ZoneCheckResult> {
  if (isLiveBackend) {
    // Production: server geocodes the exact address and tests it against
    // active zone polygons + mileage rules in D1 — never ZIP-only promises.
    return apiRequest<ZoneCheckResult>('/api/public/service-area/check', {
      method: 'POST',
      body: address,
    });
  }

  await delay(600);
  const zip = address.zip.trim();
  const cityName = address.city.trim().toLowerCase();

  const byZip = findCityByZip(zip);
  const byName = cities.find((c) => c.name.toLowerCase() === cityName);
  const city = byZip || byName || null;

  if (!city) {
    return {
      status: 'custom-review',
      zone: getZone('zone-3') ?? null,
      city: null,
      message:
        'This address may be outside our standard routes. Request a custom quote and we will confirm whether Zone 3 service is available for your addresses.',
    };
  }

  const zone = getZone(city.zoneId) ?? null;
  return {
    status: 'in-zone',
    zone,
    city,
    message: zone
      ? `${city.name} is inside our ${zone.name}. ${zone.fee > 0 ? `A $${zone.fee} zone fee applies.` : 'Delivery and pickup are included.'}`
      : 'Zone information unavailable.',
  };
}

// ---------------------------------------------------------------------------
// Availability check — POST /api/public/availability/check
// ---------------------------------------------------------------------------

export type AvailabilityStatus =
  | 'available'
  | 'limited'
  | 'date-adjustment'
  | 'custom-review'
  | 'outside-area';

export interface AvailabilityResult {
  status: AvailabilityStatus;
  headline: string;
  detail: string;
  availablePackageSlugs: string[];
}

export async function checkAvailability(input: {
  packageSlug: string;
  deliveryDate: string;
  pickupDate: string;
  deliveryZip: string;
}): Promise<AvailabilityResult> {
  if (isLiveBackend) {
    // Production: server checks clean inventory, existing reservations,
    // delivery/pickup route capacity, service zone, and vehicle capacity —
    // returning only a status, never exact counts.
    return apiRequest<AvailabilityResult>('/api/public/availability/check', {
      method: 'POST',
      body: input,
    });
  }

  await delay(800);
  const all = packages.filter((p) => p.active).map((p) => p.slug);

  if (!input.deliveryDate || !input.pickupDate) {
    return {
      status: 'date-adjustment',
      headline: 'Dates required',
      detail: 'Select both a delivery date and a pickup date to check availability.',
      availablePackageSlugs: all,
    };
  }

  const city = findCityByZip(input.deliveryZip.trim());
  if (input.deliveryZip && !city) {
    return {
      status: 'outside-area',
      headline: 'Outside standard service area',
      detail:
        'This address is not on our standard routes. You can still request a custom quote for Zone 3 service.',
      availablePackageSlugs: [],
    };
  }

  const seed = [...(input.deliveryDate + input.packageSlug)].reduce(
    (a, c) => a + c.charCodeAt(0),
    0
  );
  const roll = seed % 10;

  if (roll < 6) {
    return {
      status: 'available',
      headline: 'Available',
      detail:
        'Your dates look good. Complete your reservation to lock them in — availability is not guaranteed until booking and payment are complete.',
      availablePackageSlugs: all,
    };
  }
  if (roll < 8) {
    return {
      status: 'limited',
      headline: 'Limited availability',
      detail:
        'We can likely serve these dates, but delivery windows are filling. Reserving soon is recommended.',
      availablePackageSlugs: all,
    };
  }
  return {
    status: 'date-adjustment',
    headline: 'Date adjustment recommended',
    detail:
      'Capacity is tight on these dates. Shifting delivery by a day or two usually opens up a standard window.',
    availablePackageSlugs: all,
  };
}

// ---------------------------------------------------------------------------
// Pricing — local calculator (fallback) + POST /api/public/pricing/quote
// ---------------------------------------------------------------------------

export interface PriceLineItem {
  label: string;
  amount: number;
}

export interface PriceSummary {
  lines: PriceLineItem[];
  subtotal: number;
  zoneFee: number;
  discount: number;
  estimatedTax: number;
  estimatedTotal: number;
}

export function calculatePrice(input: {
  pkg: RentalPackage;
  zoneId: string | null;
  addOnSelections: Record<string, number>; // addOnId -> qty
  promoCode?: string;
}): PriceSummary {
  const lines: PriceLineItem[] = [];
  const base = currentPrice(input.pkg);
  lines.push({
    label: `${input.pkg.name} package — ${input.pkg.totes} totes, ${input.pkg.dollies} ${input.pkg.dollies > 1 ? 'dollies' : 'dolly'}, ${input.pkg.rentalDays}-day rental`,
    amount: base,
  });

  let addOnTotal = 0;
  for (const [addOnId, qty] of Object.entries(input.addOnSelections)) {
    if (qty <= 0) continue;
    if (addOnId === 'addon-extra-week') {
      const amt = input.pkg.extraWeekPrice * qty;
      addOnTotal += amt;
      lines.push({ label: `Extra rental week × ${qty}`, amount: amt });
      continue;
    }
    const addOn = addOns.find((a) => a.id === addOnId);
    if (!addOn) continue;
    const amt = addOn.price * qty;
    addOnTotal += amt;
    lines.push({ label: `${addOn.name} × ${qty}`, amount: amt });
  }

  const zone = input.zoneId ? getZone(input.zoneId) : null;
  const zoneFee = zone?.fee ?? 0;
  if (zone && zoneFee > 0) {
    lines.push({ label: `${zone.name} delivery fee`, amount: zoneFee });
  }

  let discount = 0;
  if (input.promoCode?.trim().toUpperCase() === 'FOUNDING10') {
    discount = Math.round((base + addOnTotal) * 0.1);
    lines.push({ label: 'Promo code FOUNDING10 (10%)', amount: -discount });
  }

  const subtotal = base + addOnTotal;
  const taxable = subtotal + zoneFee - discount;
  const estimatedTax = Math.round(taxable * 0.06 * 100) / 100; // MI 6%
  const estimatedTotal = Math.round((taxable + estimatedTax) * 100) / 100;

  return { lines, subtotal, zoneFee, discount, estimatedTax, estimatedTotal };
}

/**
 * Server-side quote — the authoritative price. In production the API
 * recalculates from D1 (packages, zones, add-ons, promo rules), stores a
 * pricing snapshot, and returns the same PriceSummary shape. Falls back to
 * the local estimate when offline or in development; the fallback is always
 * labeled an estimate in the UI.
 */
export async function quotePrice(input: {
  packageSlug: string;
  zoneId: string | null;
  addOnSelections: Record<string, number>;
  promoCode?: string;
  deliveryDate?: string;
  pickupDate?: string;
}): Promise<PriceSummary & { quoteId?: string }> {
  if (isLiveBackend) {
    return apiRequest<PriceSummary & { quoteId: string }>('/api/public/pricing/quote', {
      method: 'POST',
      body: input,
    });
  }
  const pkg = packages.find((p) => p.slug === input.packageSlug) ?? packages[0];
  return calculatePrice({
    pkg,
    zoneId: input.zoneId,
    addOnSelections: input.addOnSelections,
    promoCode: input.promoCode,
  });
}

// ---------------------------------------------------------------------------
// Leads & reservations — POST /api/public/leads, /api/public/reservations
// ---------------------------------------------------------------------------

export interface LeadSubmission {
  type:
    | 'contact'
    | 'availability'
    | 'business-account'
    | 'custom-quote'
    | 'outside-area'
    | 'referral'
    | 'order-support'
    | 'reservation';
  payload: Record<string, unknown>;
  turnstileToken?: string;
}

export interface LeadResult {
  ok: boolean;
  reference: string;
  message: string;
}

export async function submitLead(lead: LeadSubmission): Promise<LeadResult> {
  if (isLiveBackend) {
    // Production: server-side validation, Turnstile verification, rate
    // limiting, sanitization, D1 storage, notification queue, consent records.
    const path = lead.type === 'reservation' ? '/api/public/reservations' : '/api/public/leads';
    return apiRequest<LeadResult>(path, {
      method: 'POST',
      body: { type: lead.type, ...lead.payload },
      turnstileToken: lead.turnstileToken,
    });
  }

  await delay(700);
  const reference =
    lead.type === 'reservation'
      ? `GLT-${Date.now().toString(36).toUpperCase()}`
      : `LEAD-${Date.now().toString(36).toUpperCase()}`;
  return {
    ok: true,
    reference,
    message:
      lead.type === 'reservation'
        ? 'Reservation request received.'
        : 'Thanks — we received your request and will follow up shortly.',
  };
}
