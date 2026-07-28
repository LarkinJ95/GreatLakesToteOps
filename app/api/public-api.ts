// Public API for the Great Lakes Moving Totes marketing website.
// Implements the contract in TOTEOPS-INTEGRATION.md — backed by the live
// ToteOps database. Unauthenticated, rate-limited, Turnstile-verified when
// TURNSTILE_SECRET_KEY is configured. Never exposes inventory counts, routes,
// orders, schedules, or storage locations.

import { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { z } from "zod";
import { and, desc, eq, gte, lte, ne, or, sql } from "drizzle-orm";
import { getDb } from "./queries/connection";
import {
  addons, auditLog, customers, dispatchStops, inventoryAssets, leads,
  packages, promos, quotes, reservations, zones, zoneZips,
} from "@db/schema";

export const publicApi = new Hono<{ Bindings: HttpBindings }>();

// ---------------------------------------------------------------------------
// Rate limiting (per IP + bucket, in-memory)
// ---------------------------------------------------------------------------

const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, bucket: string, max: number, windowMs: number): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

function clientIp(c: { req: { header: (n: string) => string | undefined } }): string {
  return c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

// ---------------------------------------------------------------------------
// Turnstile verification (skipped when no secret configured)
// ---------------------------------------------------------------------------

async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured — open mode (development)
  if (!token) return false;
  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }),
  });
  const data = (await resp.json()) as { success?: boolean };
  return data.success === true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const noStore = { "Cache-Control": "no-store" };

function ref(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 36).toString(36).toUpperCase()}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type PriceLine = { label: string; amount: number };

function computeQuote(input: {
  pkg: typeof packages.$inferSelect;
  zoneFee: number;
  zoneName: string | null;
  addOnSelections: Record<string, number>;
  addonRows: (typeof addons.$inferSelect)[];
  promo: typeof promos.$inferSelect | null;
}) {
  const { pkg, zoneFee, zoneName, addOnSelections, addonRows, promo } = input;
  const lines: PriceLine[] = [];
  const base = pkg.launchPricingActive ? pkg.launchPrice : pkg.standardPrice;
  lines.push({
    label: `${pkg.name} package — ${pkg.totes} totes, ${pkg.dollies} ${pkg.dollies > 1 ? "dollies" : "dolly"}, ${pkg.rentalDays}-day rental`,
    amount: base,
  });

  let addOnTotal = 0;
  for (const [key, qtyRaw] of Object.entries(addOnSelections)) {
    const qty = Math.max(0, Math.floor(Number(qtyRaw) || 0));
    if (qty <= 0) continue;
    if (key === "addon-extra-week") {
      const amt = pkg.extraWeekPrice * qty;
      addOnTotal += amt;
      lines.push({ label: `Extra rental week × ${qty}`, amount: amt });
      continue;
    }
    const addon = addonRows.find((a) => a.addonKey === key && a.active);
    if (!addon) continue;
    const amt = addon.price * Math.min(qty, addon.maxQty);
    addOnTotal += amt;
    lines.push({ label: `${addon.name} × ${qty}`, amount: amt });
  }

  if (zoneFee > 0 && zoneName) {
    lines.push({ label: `${zoneName} delivery fee`, amount: zoneFee });
  }

  let discount = 0;
  if (promo) {
    discount = round2(((base + addOnTotal) * promo.percentOff) / 100);
    lines.push({ label: `Promo code ${promo.code} (${promo.percentOff}%)`, amount: -discount });
  }

  const subtotal = base + addOnTotal;
  const taxable = subtotal + zoneFee - discount;
  const estimatedTax = round2(taxable * 0.06); // Michigan 6%
  const estimatedTotal = round2(taxable + estimatedTax);
  return { lines, subtotal, zoneFee, discount, estimatedTax, estimatedTotal };
}

async function resolveZoneByZip(zip: string) {
  const db = getDb();
  const [row] = await db
    .select({ zone: zones, zip: zoneZips.zip, cityName: zoneZips.cityName })
    .from(zoneZips)
    .innerJoin(zones, eq(zoneZips.zoneId, zones.id))
    .where(and(eq(zoneZips.zip, zip), eq(zones.active, true)));
  return row ?? null;
}

async function zone3() {
  const db = getDb();
  const [z] = await db.select().from(zones).where(eq(zones.zoneKey, "zone-3"));
  return z ?? null;
}

function zoneJson(z: typeof zones.$inferSelect) {
  return { id: z.zoneKey, name: z.name, fee: z.fee, description: z.description ?? "", active: z.active };
}

// Availability internals — returns only a status bucket, never counts.
async function availabilityStatus(input: {
  packageSlug: string;
  deliveryDate: string;
  pickupDate: string;
  deliveryZip: string;
}): Promise<{ status: string; availablePackageSlugs: string[] }> {
  const db = getDb();
  const activePkgs = await db.select().from(packages).where(eq(packages.active, true));
  const slugs = activePkgs.map((p) => p.slug);

  if (input.deliveryZip) {
    const zoneRow = await resolveZoneByZip(input.deliveryZip);
    if (!zoneRow) return { status: "outside-area", availablePackageSlugs: [] };
  }

  const pkg = activePkgs.find((p) => p.slug === input.packageSlug);
  if (!pkg) return { status: "custom-review", availablePackageSlugs: slugs };

  // Committed totes across overlapping active pipeline orders
  const overlapping = await db
    .select({ totes: sql<string>`coalesce(sum(${reservations.totes}), 0)` })
    .from(reservations)
    .where(
      and(
        or(eq(reservations.status, "confirmed"), eq(reservations.status, "active"), eq(reservations.status, "pending")),
        lte(reservations.deliveryDate, input.pickupDate),
        gte(reservations.pickupDate, input.deliveryDate),
        ne(reservations.status, "cancelled"),
      )
    );
  const committed = Number(overlapping[0]?.totes ?? 0);

  const [inv] = await db
    .select({ n: sql<number>`count(*)` })
    .from(inventoryAssets)
    .where(and(eq(inventoryAssets.type, "tote"), eq(inventoryAssets.status, "available")));
  const availableTotes = Number(inv?.n ?? 0);

  const free = availableTotes - committed;
  if (free < pkg.totes * 0.5) return { status: "date-adjustment", availablePackageSlugs: slugs };

  // Route capacity for the delivery date (cap 8 stops/day; 6+ = limited)
  const [stops] = await db
    .select({ n: sql<number>`count(*)` })
    .from(dispatchStops)
    .where(and(eq(dispatchStops.stopDate, input.deliveryDate), ne(dispatchStops.status, "skipped")));
  const dayStops = Number(stops?.n ?? 0);
  if (dayStops >= 8) return { status: "date-adjustment", availablePackageSlugs: slugs };
  if (dayStops >= 6 || free < pkg.totes) return { status: "limited", availablePackageSlugs: slugs };

  return { status: "available", availablePackageSlugs: slugs };
}

// ---------------------------------------------------------------------------
// POST /service-area/check
// ---------------------------------------------------------------------------

const serviceAreaSchema = z.object({
  street: z.string().max(255).optional().default(""),
  city: z.string().max(120).optional().default(""),
  zip: z.string().regex(/^\d{5}$/),
});

publicApi.post("/service-area/check", async (c) => {
  if (!rateLimit(clientIp(c), "zone", 30, 10 * 60 * 1000)) {
    return c.json({ error: "Too many requests. Please try again shortly.", code: "RATE_LIMITED" }, 429, noStore);
  }
  const parsed = serviceAreaSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Enter a valid 5-digit ZIP code.", code: "INVALID_INPUT" }, 400, noStore);
  }

  const row = await resolveZoneByZip(parsed.data.zip);
  if (!row) {
    const z3 = await zone3();
    return c.json({
      status: "custom-review",
      zone: z3 ? zoneJson(z3) : null,
      city: null,
      message: "This address may be outside our standard routes. Request a custom quote and we will confirm whether Zone 3 service is available for your addresses.",
    }, 200, noStore);
  }

  return c.json({
    status: "in-zone",
    zone: zoneJson(row.zone),
    city: row.cityName
      ? { name: row.cityName, slug: row.cityName.toLowerCase(), zoneId: row.zone.zoneKey, zips: [row.zip], blurb: "", localTips: [] }
      : null,
    message: row.zone.fee > 0
      ? `This address is inside our ${row.zone.name}. A $${row.zone.fee} zone fee applies.`
      : `This address is inside our ${row.zone.name}. Delivery and pickup are included.`,
  }, 200, noStore);
});

// ---------------------------------------------------------------------------
// POST /availability/check
// ---------------------------------------------------------------------------

const availabilitySchema = z.object({
  packageSlug: z.string().max(60),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deliveryZip: z.string().max(10).optional().default(""),
});

const AVAILABILITY_COPY: Record<string, { headline: string; detail: string }> = {
  available: {
    headline: "Available",
    detail: "Your dates look good. Complete your reservation to lock them in — availability is not guaranteed until booking and payment are complete.",
  },
  limited: {
    headline: "Limited availability",
    detail: "We can likely serve these dates, but delivery windows are filling. Reserving soon is recommended.",
  },
  "date-adjustment": {
    headline: "Date adjustment recommended",
    detail: "Capacity is tight on these dates. Shifting delivery by a day or two usually opens up a standard window.",
  },
  "custom-review": {
    headline: "Needs review",
    detail: "This request needs a quick review by our team. Submit it and we will confirm by phone or email.",
  },
  "outside-area": {
    headline: "Outside standard service area",
    detail: "This address is not on our standard routes. You can still request a custom quote for Zone 3 service.",
  },
};

publicApi.post("/availability/check", async (c) => {
  if (!rateLimit(clientIp(c), "availability", 30, 10 * 60 * 1000)) {
    return c.json({ error: "Too many requests. Please try again shortly.", code: "RATE_LIMITED" }, 429, noStore);
  }
  const parsed = availabilitySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Dates and package are required.", code: "INVALID_INPUT" }, 400, noStore);
  }
  if (parsed.data.pickupDate < parsed.data.deliveryDate) {
    return c.json({ error: "Pickup date must be on or after the delivery date.", code: "INVALID_INPUT" }, 400, noStore);
  }

  const result = await availabilityStatus(parsed.data);
  const copy = AVAILABILITY_COPY[result.status] ?? AVAILABILITY_COPY["custom-review"];
  return c.json({ status: result.status, ...copy, availablePackageSlugs: result.availablePackageSlugs }, 200, noStore);
});

// ---------------------------------------------------------------------------
// POST /pricing/quote
// ---------------------------------------------------------------------------

const quoteSchema = z.object({
  packageSlug: z.string().max(60),
  zoneId: z.union([z.string(), z.number()]).nullable().optional(),
  addOnSelections: z.record(z.string(), z.number()).optional().default({}),
  promoCode: z.string().max(40).optional(),
  deliveryDate: z.string().optional(),
  pickupDate: z.string().optional(),
});

publicApi.post("/pricing/quote", async (c) => {
  if (!rateLimit(clientIp(c), "quote", 40, 10 * 60 * 1000)) {
    return c.json({ error: "Too many requests. Please try again shortly.", code: "RATE_LIMITED" }, 429, noStore);
  }
  const parsed = quoteSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Invalid quote request.", code: "INVALID_INPUT" }, 400, noStore);
  }
  const db = getDb();

  const [pkg] = await db.select().from(packages)
    .where(and(eq(packages.slug, parsed.data.packageSlug), eq(packages.active, true)));
  if (!pkg) return c.json({ error: "Unknown or inactive package.", code: "UNKNOWN_PACKAGE" }, 400, noStore);

  let zoneRow: typeof zones.$inferSelect | null = null;
  if (parsed.data.zoneId != null) {
    const zoneIdStr = String(parsed.data.zoneId);
    const [z] = await db.select().from(zones).where(
      or(eq(zones.zoneKey, zoneIdStr), sql`${zones.id} = ${Number(zoneIdStr) || -1}`)
    );
    zoneRow = z ?? null;
  }

  const addonRows = await db.select().from(addons).where(eq(addons.active, true));

  let promo: typeof promos.$inferSelect | null = null;
  if (parsed.data.promoCode?.trim()) {
    const code = parsed.data.promoCode.trim().toUpperCase();
    const today = new Date().toISOString().slice(0, 10);
    const [p] = await db.select().from(promos).where(eq(promos.code, code));
    if (p && p.active
      && (!p.startsAt || p.startsAt <= today)
      && (!p.endsAt || p.endsAt >= today)
      && (!p.usageLimit || p.usedCount < p.usageLimit)) {
      promo = p;
    }
  }

  const result = computeQuote({
    pkg,
    zoneFee: zoneRow?.fee ?? 0,
    zoneName: zoneRow?.name ?? null,
    addOnSelections: parsed.data.addOnSelections,
    addonRows,
    promo,
  });

  // Store the pricing snapshot
  const quoteRef = ref("Q");
  await db.insert(quotes).values({
    quoteRef,
    packageSlug: pkg.slug,
    zoneId: zoneRow?.id ?? null,
    addOns: parsed.data.addOnSelections,
    promoCode: promo?.code ?? null,
    lines: result.lines,
    subtotal: result.subtotal.toFixed(2),
    zoneFee: result.zoneFee.toFixed(2),
    discount: result.discount.toFixed(2),
    tax: result.estimatedTax.toFixed(2),
    total: result.estimatedTotal.toFixed(2),
  });

  return c.json({ ...result, quoteId: quoteRef }, 200, noStore);
});

// ---------------------------------------------------------------------------
// POST /leads
// ---------------------------------------------------------------------------

const leadSchema = z.object({
  type: z.enum(["contact", "business-account", "custom-quote", "outside-area", "referral", "order-support"]),
  name: z.string().min(2).max(255),
  email: z.string().email().max(320),
  phone: z.string().max(40).optional(),
  company: z.string().max(255).optional(),
  message: z.string().min(5).max(5000),
  orderNumber: z.string().max(40).optional(),
  consent: z.boolean().optional(),
});

publicApi.post("/leads", async (c) => {
  if (!rateLimit(clientIp(c), "leads", 10, 10 * 60 * 1000)) {
    return c.json({ error: "Too many submissions. Please call us instead.", code: "RATE_LIMITED" }, 429, noStore);
  }
  const token = c.req.header("x-turnstile-token");
  if (!(await verifyTurnstile(token))) {
    return c.json({ error: "Spam check failed. Please try again.", code: "TURNSTILE_FAILED" }, 403, noStore);
  }
  const parsed = leadSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Please complete all required fields.", code: "INVALID_INPUT" }, 400, noStore);
  }

  const db = getDb();
  const reference = ref("LEAD");
  await db.insert(leads).values({
    reference,
    type: parsed.data.type,
    name: parsed.data.name.slice(0, 255),
    email: parsed.data.email.toLowerCase(),
    phone: parsed.data.phone ?? null,
    company: parsed.data.company ?? null,
    message: parsed.data.message,
    orderNumber: parsed.data.orderNumber ?? null,
    payload: { consent: parsed.data.consent ?? false },
    status: "new",
  });
  await db.insert(auditLog).values({
    actorName: "website",
    action: "public.lead",
    entity: "lead",
    entityRef: reference,
    detail: { type: parsed.data.type },
  });

  return c.json({ ok: true, reference, message: "Thanks — we received your request and will follow up shortly." }, 200, noStore);
});

// ---------------------------------------------------------------------------
// POST /reservations
// ---------------------------------------------------------------------------

const addressSchema = z.object({
  street: z.string().min(2).max(255),
  city: z.string().min(1).max(120),
  zip: z.string().regex(/^\d{5}$/),
  state: z.string().max(4).optional(),
});

const reservationSchema = z.object({
  rentalType: z.string().max(60),
  delivery: addressSchema,
  pickup: addressSchema,
  propertyType: z.string().max(60).optional(),
  stairs: z.string().max(60).optional(),
  elevator: z.string().max(20).optional(),
  access: z.string().max(2000).optional(),
  contactless: z.boolean().optional(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deliveryWindow: z.string().max(60).optional(),
  pickupWindow: z.string().max(60).optional(),
  packageSlug: z.string().max(60),
  addOns: z.record(z.string(), z.number()).optional().default({}),
  customer: z.object({
    firstName: z.string().min(1).max(120),
    lastName: z.string().min(1).max(120),
    email: z.string().email().max(320),
    phone: z.string().min(7).max(40),
    businessName: z.string().max(255).optional(),
    referral: z.string().max(120).optional(),
    promo: z.string().max(40).optional(),
  }),
  paymentOption: z.enum(["deposit", "full", "terms"]),
  estimatedTotal: z.number().optional(),
  quoteId: z.string().max(40).optional(),
});

publicApi.post("/reservations", async (c) => {
  if (!rateLimit(clientIp(c), "reservations", 6, 10 * 60 * 1000)) {
    return c.json({ error: "Too many submissions. Please call us to complete your reservation.", code: "RATE_LIMITED" }, 429, noStore);
  }
  const token = c.req.header("x-turnstile-token");
  if (!(await verifyTurnstile(token))) {
    return c.json({ error: "Spam check failed. Please try again.", code: "TURNSTILE_FAILED" }, 403, noStore);
  }
  const parsed = reservationSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "Some reservation details are missing or invalid. Please go back and review.", code: "INVALID_INPUT" }, 400, noStore);
  }
  const input = parsed.data;
  if (input.pickupDate < input.deliveryDate) {
    return c.json({ error: "Pickup date must be on or after the delivery date.", code: "INVALID_INPUT" }, 400, noStore);
  }

  const db = getDb();

  // Zone must be serviceable
  const zoneRow = await resolveZoneByZip(input.delivery.zip);
  if (!zoneRow) {
    return c.json({
      error: "This address appears to be outside our standard service area. Please request a custom quote instead.",
      code: "OUTSIDE_AREA",
    }, 400, noStore);
  }

  // Package
  const [pkg] = await db.select().from(packages)
    .where(and(eq(packages.slug, input.packageSlug), eq(packages.active, true)));
  if (!pkg) return c.json({ error: "Unknown or inactive package.", code: "UNKNOWN_PACKAGE" }, 400, noStore);

  // Re-verify quote snapshot when provided; otherwise compute fresh
  let snapshot: typeof quotes.$inferSelect | null = null;
  if (input.quoteId) {
    const [q] = await db.select().from(quotes).where(eq(quotes.quoteRef, input.quoteId));
    snapshot = q ?? null;
  }

  const addonRows = await db.select().from(addons).where(eq(addons.active, true));
  let promo: typeof promos.$inferSelect | null = null;
  if (input.customer.promo?.trim()) {
    const [p] = await db.select().from(promos).where(eq(promos.code, input.customer.promo.trim().toUpperCase()));
    if (p?.active) promo = p;
  }
  const fresh = computeQuote({
    pkg,
    zoneFee: zoneRow.zone.fee,
    zoneName: zoneRow.zone.name,
    addOnSelections: input.addOns,
    addonRows,
    promo,
  });

  const serverTotal = snapshot ? Number(snapshot.total) : fresh.estimatedTotal;
  const clientTotal = input.estimatedTotal ?? serverTotal;
  const discrepancy = Math.abs(serverTotal - clientTotal) > 0.02;

  // Re-run availability — accept as pending either way, flagged if tight
  const avail = await availabilityStatus({
    packageSlug: input.packageSlug,
    deliveryDate: input.deliveryDate,
    pickupDate: input.pickupDate,
    deliveryZip: input.delivery.zip,
  });

  // Find or create customer
  const email = input.customer.email.toLowerCase();
  const [existing] = await db.select().from(customers).where(eq(customers.email, email));
  let customerId: number;
  if (existing) {
    customerId = Number(existing.id);
    await db.update(customers).set({
      phone: input.customer.phone,
      companyName: input.customer.businessName || existing.companyName,
    }).where(eq(customers.id, customerId));
  } else {
    const [inserted] = await db.insert(customers).values({
      firstName: input.customer.firstName,
      lastName: input.customer.lastName,
      email,
      phone: input.customer.phone,
      companyName: input.customer.businessName || null,
      accountType: input.customer.businessName ? "business" : "residential",
      referralSource: input.customer.referral || null,
    }).$returningId();
    customerId = inserted.id;
  }

  const orderNumber = ref("GLT");
  const flags: string[] = [];
  if (discrepancy) flags.push(`Price discrepancy: client ${clientTotal.toFixed(2)} vs server ${serverTotal.toFixed(2)} — server total used.`);
  if (avail.status !== "available") flags.push(`Availability at submission: ${avail.status} — review capacity before confirming.`);

  const [order] = await db.insert(reservations).values({
    orderNumber,
    customerId,
    quoteId: snapshot ? Number(snapshot.id) : null,
    rentalType: input.rentalType,
    packageSlug: pkg.slug,
    packageName: pkg.name,
    totes: pkg.totes,
    dollies: pkg.dollies,
    status: "pending",
    deliveryDate: input.deliveryDate,
    pickupDate: input.pickupDate,
    deliveryWindow: input.deliveryWindow ?? null,
    pickupWindow: input.pickupWindow ?? null,
    deliveryAddress: input.delivery,
    pickupAddress: input.pickup,
    propertyType: input.propertyType ?? null,
    stairs: input.stairs ?? null,
    elevator: input.elevator ?? null,
    accessNotes: input.access ?? null,
    contactless: input.contactless ?? false,
    zoneKey: zoneRow.zone.zoneKey,
    zoneFee: (snapshot ? Number(snapshot.zoneFee) : fresh.zoneFee).toFixed(2),
    addOns: input.addOns,
    promoCode: promo?.code ?? null,
    subtotal: (snapshot ? Number(snapshot.subtotal) : fresh.subtotal).toFixed(2),
    discount: (snapshot ? Number(snapshot.discount) : fresh.discount).toFixed(2),
    tax: (snapshot ? Number(snapshot.tax) : fresh.estimatedTax).toFixed(2),
    total: serverTotal.toFixed(2),
    paymentOption: input.paymentOption,
    agreementSigned: false,
    internalNotes: flags.length > 0 ? flags.join(" ") : null,
  }).$returningId();

  if (promo) {
    await db.update(promos).set({ usedCount: promo.usedCount + 1 }).where(eq(promos.id, promo.id));
  }

  await db.insert(auditLog).values({
    actorName: "website",
    action: "public.reservation",
    entity: "order",
    entityRef: orderNumber,
    detail: { orderId: order.id, packageSlug: pkg.slug, total: serverTotal, discrepancy },
  });

  return c.json({ ok: true, reference: orderNumber, message: "Reservation request received." }, 200, noStore);
});
