# ToteOps Backend Integration

How this public website connects to the Great Lakes ToteOps backend
(Cloudflare Workers + D1). The site is **remote-first**: when
`VITE_TOTEOPS_API_URL` is set, every transactional call below hits the live
API; when empty, a local simulation with identical response shapes runs so the
full customer workflow stays exercisable in development.

## Configuration

See `.env.example`. All values are browser-visible by design — secrets live
only in the Workers environment.

| Variable | Purpose |
|---|---|
| `VITE_TOTEOPS_API_URL` | Base URL of the Workers public API |
| `VITE_TOTEOPS_PUBLIC_KEY` | Public key, sent as `X-Api-Key`; scope to public routes only |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile widget on spam-protected forms |
| `VITE_PORTAL_URL` | Customer portal (agreement, payment, account) |

## Endpoints

All requests `POST` JSON unless noted. Spam-protected endpoints also accept
`X-Turnstile-Token` (verified server-side). Errors return
`{ "error": string, "code"?: string }` with a non-2xx status.

### `POST /api/public/service-area/check`

Body: `{ street, city, zip }`
Returns: `ZoneCheckResult` — `{ status: "in-zone" | "custom-review" | "unknown", zone, city, message }`

Server geocodes the exact address and tests it against active zone polygons
plus mileage rules in D1. Never approve service from ZIP alone where distance
or routing rules matter.

### `POST /api/public/availability/check`

Body: `{ packageSlug, deliveryDate, pickupDate, deliveryZip }`
Returns: `AvailabilityResult` — `{ status: "available" | "limited" | "date-adjustment" | "custom-review" | "outside-area", headline, detail, availablePackageSlugs }`

Server checks clean inventory, reservations, delivery/pickup route capacity,
service zone, and vehicle capacity. **Must never expose** exact fleet counts,
route details, customer orders, employee schedules, or warehouse locations.

### `POST /api/public/pricing/quote`

Body: `{ packageSlug, zoneId, addOnSelections, promoCode?, deliveryDate?, pickupDate? }`
Returns: `PriceSummary & { quoteId }` — `{ lines: [{ label, amount }], subtotal, zoneFee, discount, estimatedTax, estimatedTotal, quoteId }`

Server recalculates from D1 (packages, zone fees, add-ons, promo rules) and
stores a **pricing snapshot** with the quote. The UI marks prices as
"Estimate" until a server quote confirms them.

### `POST /api/public/leads`

Body: `{ type, ...payload }` — types: `contact`, `business-account`,
`custom-quote`, `outside-area`, `referral`, `order-support`
Returns: `LeadResult` — `{ ok, reference, message }`

Server-side validation, Turnstile verification, rate limiting, sanitization,
D1 storage, notification queue, consent records.

### `POST /api/public/reservations`

Body: reservation payload from the booking funnel (includes `quoteId` when a
server quote exists). Turnstile-protected.
Returns: `LeadResult` — `reference` is the customer-facing order number.

Creates the customer record and draft order in D1, then hands off to the
secure agreement and payment flow on the portal (`VITE_PORTAL_URL`).

## Content catalog

Packages, add-ons, zones, FAQs, testimonials, and the announcement bar are
mirrored in `src/data/` with the same shapes as the D1 content tables. In the
production Next.js build these are fetched from D1 through the admin-managed
content API; the local files serve as seed content and the offline fallback.
Sample testimonials are flagged `sample: true` — publish real reviews only.

## Caching

Public GET content may be edge-cached. Availability, pricing, lead, and
reservation responses must be `Cache-Control: no-store` — enforced by the API.

## Security notes

- No D1/R2 credentials in browser code — all data access goes through Workers.
- Public API key must be scoped to unauthenticated public routes.
- Never send sensitive form contents via query parameters.
- Analytics events must not contain names, addresses, or order contents.
