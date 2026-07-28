import { z } from "zod";
import { and, desc, eq, gte, lte, like, or, sql } from "drizzle-orm";
import { authedQuery, createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import {
  addons, announcements, auditLog, customers, dispatchStops, drivers, faqs,
  inventoryAssets, invoices, packages, payments, promos, reservations,
  testimonials, vehicles, zones, zoneZips,
} from "@db/schema";
import type { TrpcContext } from "../context";

function audit(ctx: TrpcContext, action: string, entity: string, entityRef?: string, detail?: unknown) {
  const db = getDb();
  return db.insert(auditLog).values({
    actorUserId: ctx.user?.id ? Number(ctx.user.id) : null,
    actorName: ctx.user?.name ?? null,
    action, entity, entityRef: entityRef ?? null,
    detail: detail === undefined ? null : (detail as Record<string, unknown>),
  });
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

const stopStatus = z.enum(["scheduled", "en-route", "completed", "issue", "skipped"]);

export const dispatchRouter = createRouter({
  board: authedQuery
    .input(z.object({ from: z.string().optional(), to: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conds = [];
      if (input?.from) conds.push(gte(dispatchStops.stopDate, input.from));
      if (input?.to) conds.push(lte(dispatchStops.stopDate, input.to));
      const stops = await db
        .select({
          stop: dispatchStops,
          orderNumber: reservations.orderNumber,
          packageName: reservations.packageName,
          totes: reservations.totes,
          customerFirst: customers.firstName,
          customerLast: customers.lastName,
          driverName: drivers.name,
          vehicleName: vehicles.name,
        })
        .from(dispatchStops)
        .leftJoin(reservations, eq(dispatchStops.orderId, reservations.id))
        .leftJoin(customers, eq(reservations.customerId, customers.id))
        .leftJoin(drivers, eq(dispatchStops.driverId, drivers.id))
        .leftJoin(vehicles, eq(dispatchStops.vehicleId, vehicles.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(dispatchStops.stopDate, dispatchStops.sequence);

      const [vehicleRows, driverRows] = await Promise.all([
        db.select().from(vehicles).where(eq(vehicles.active, true)),
        db.select().from(drivers).where(eq(drivers.active, true)),
      ]);
      return { stops, vehicles: vehicleRows, drivers: driverRows };
    }),

  updateStop: authedQuery
    .input(z.object({
      id: z.number(),
      status: stopStatus.optional(),
      driverId: z.number().nullable().optional(),
      vehicleId: z.number().nullable().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...fields } = input;
      const updates: Record<string, unknown> = {};
      if (fields.status !== undefined) {
        updates.status = fields.status;
        if (fields.status === "completed") updates.completedAt = new Date();
      }
      if (fields.driverId !== undefined) updates.driverId = fields.driverId;
      if (fields.vehicleId !== undefined) updates.vehicleId = fields.vehicleId;
      if (fields.notes !== undefined) updates.notes = fields.notes;
      await db.update(dispatchStops).set(updates).where(eq(dispatchStops.id, id));
      await audit(ctx, "dispatch.stop", "dispatch_stop", String(id), fields);
      return { ok: true };
    }),

  addVehicle: authedQuery
    .input(z.object({ name: z.string(), capacityTotes: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.insert(vehicles).values({ name: input.name, capacityTotes: input.capacityTotes, active: true });
      await audit(ctx, "dispatch.addVehicle", "vehicle", input.name);
      return { ok: true };
    }),

  addDriver: authedQuery
    .input(z.object({ name: z.string(), phone: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.insert(drivers).values({ name: input.name, phone: input.phone ?? null, active: true });
      await audit(ctx, "dispatch.addDriver", "driver", input.name);
      return { ok: true };
    }),
});

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export const billingRouter = createRouter({
  list: authedQuery
    .input(z.object({ status: z.string().optional(), search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conds = [];
      if (input?.status) conds.push(eq(invoices.status, input.status as never));
      if (input?.search) {
        const q = `%${input.search}%`;
        conds.push(or(
          like(invoices.invoiceNumber, q),
          like(reservations.orderNumber, q),
          like(customers.firstName, q),
          like(customers.lastName, q),
        ));
      }
      return db
        .select({
          invoice: invoices,
          orderNumber: reservations.orderNumber,
          customerFirst: customers.firstName,
          customerLast: customers.lastName,
          customerEmail: customers.email,
        })
        .from(invoices)
        .leftJoin(reservations, eq(invoices.orderId, reservations.id))
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(invoices.createdAt));
    }),

  detail: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [row] = await db
        .select({ invoice: invoices, order: reservations, customer: customers })
        .from(invoices)
        .leftJoin(reservations, eq(invoices.orderId, reservations.id))
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(eq(invoices.id, input.id));
      const paymentRows = await db.select().from(payments)
        .where(eq(payments.invoiceId, input.id))
        .orderBy(desc(payments.paidAt));
      return { ...row, payments: paymentRows };
    }),

  createFromOrder: authedQuery
    .input(z.object({ orderId: z.number(), terms: z.enum(["card", "deposit", "business-terms"]).optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [order] = await db.select().from(reservations).where(eq(reservations.id, input.orderId));
      if (!order) throw new Error("Order not found");
      const existing = await db.select().from(invoices).where(eq(invoices.orderId, input.orderId));
      if (existing.length > 0) return { ok: true, invoiceId: existing[0].id, alreadyExisted: true };

      const count = await db.select({ n: sql<number>`count(*)` }).from(invoices);
      const invoiceNumber = `INV-${String(2001 + Number(count[0]?.n ?? 0)).padStart(5, "0")}`;
      const terms = input.terms ?? (order.paymentOption === "terms" ? "business-terms" : order.paymentOption === "deposit" ? "deposit" : "card");
      const [inserted] = await db.insert(invoices).values({
        invoiceNumber,
        orderId: order.id,
        customerId: order.customerId,
        status: terms === "business-terms" ? "sent" : "draft",
        terms,
        amount: order.total,
        amountPaid: "0",
        dueDate: terms === "business-terms"
          ? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
          : order.deliveryDate,
        lineItems: [{ label: `${order.packageName} package rental`, amount: Number(order.subtotal) }],
      }).$returningId();
      await audit(ctx, "billing.createInvoice", "invoice", invoiceNumber, { order: order.orderNumber });
      return { ok: true, invoiceId: inserted.id, alreadyExisted: false };
    }),

  recordPayment: authedQuery
    .input(z.object({
      invoiceId: z.number(),
      amount: z.number().positive(),
      method: z.string(),
      note: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, input.invoiceId));
      if (!inv) throw new Error("Invoice not found");
      const newPaid = Number(inv.amountPaid) + input.amount;
      const fullyPaid = newPaid >= Number(inv.amount) - 0.005;
      await db.insert(payments).values({
        invoiceId: input.invoiceId,
        amount: input.amount.toFixed(2),
        method: input.method,
        note: input.note ?? null,
      });
      await db.update(invoices).set({
        amountPaid: newPaid.toFixed(2),
        status: fullyPaid ? "paid" : inv.status === "draft" ? "sent" : inv.status,
        paidAt: fullyPaid ? new Date() : null,
      }).where(eq(invoices.id, input.invoiceId));
      await audit(ctx, "billing.payment", "invoice", inv.invoiceNumber, { amount: input.amount, method: input.method });
      return { ok: true, fullyPaid };
    }),

  updateStatus: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(["draft", "sent", "paid", "overdue", "void"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(invoices).set({ status: input.status }).where(eq(invoices.id, input.id));
      await audit(ctx, "billing.status", "invoice", String(input.id), { status: input.status });
      return { ok: true };
    }),
});

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

const assetStatus = z.enum(["available", "cleaning", "out", "damaged", "retired"]);

export const inventoryRouter = createRouter({
  overview: authedQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({
        type: inventoryAssets.type,
        status: inventoryAssets.status,
        count: sql<number>`count(*)`,
      })
      .from(inventoryAssets)
      .groupBy(inventoryAssets.type, inventoryAssets.status);
    return rows.map((r) => ({ ...r, count: Number(r.count) }));
  }),

  list: authedQuery
    .input(z.object({
      type: z.string().optional(),
      status: assetStatus.optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conds = [];
      if (input?.type) conds.push(eq(inventoryAssets.type, input.type as never));
      if (input?.status) conds.push(eq(inventoryAssets.status, input.status));
      if (input?.search) conds.push(like(inventoryAssets.assetTag, `%${input.search}%`));
      return db.select({
        asset: inventoryAssets,
        orderNumber: reservations.orderNumber,
      })
        .from(inventoryAssets)
        .leftJoin(reservations, eq(inventoryAssets.currentOrderId, reservations.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(inventoryAssets.assetTag)
        .limit(500);
    }),

  updateStatus: authedQuery
    .input(z.object({
      id: z.number(),
      status: assetStatus,
      conditionNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(inventoryAssets).set({
        status: input.status,
        conditionNote: input.conditionNote ?? null,
        currentOrderId: input.status === "out" ? undefined : null,
        lastInspectAt: input.status === "available" ? new Date() : undefined,
      }).where(eq(inventoryAssets.id, input.id));
      await audit(ctx, "inventory.status", "asset", String(input.id), { status: input.status });
      return { ok: true };
    }),

  addAssets: authedQuery
    .input(z.object({
      type: z.enum(["tote", "dolly", "hand-truck", "blanket"]),
      quantity: z.number().int().min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const prefix = { tote: "TOTE", dolly: "DOLLY", "hand-truck": "HT", blanket: "BLK" }[input.type];
      const existing = await db.select({ tag: inventoryAssets.assetTag })
        .from(inventoryAssets)
        .where(eq(inventoryAssets.type, input.type));
      let max = 0;
      for (const row of existing) {
        const num = parseInt(row.tag.split("-")[1] ?? "0", 10);
        if (!isNaN(num) && num > max) max = num;
      }
      const pad = input.type === "tote" ? 4 : 3;
      for (let i = 1; i <= input.quantity; i++) {
        await db.insert(inventoryAssets).values({
          assetTag: `${prefix}-${String(max + i).padStart(pad, "0")}`,
          type: input.type,
          status: "available",
        });
      }
      await audit(ctx, "inventory.add", "asset", input.type, { quantity: input.quantity });
      return { ok: true };
    }),
});

// ---------------------------------------------------------------------------
// Catalog (packages, add-ons, zones, promos) & content
// ---------------------------------------------------------------------------

export const catalogRouter = createRouter({
  get: authedQuery.query(async () => {
    const db = getDb();
    const [pkgRows, addonRows, zoneRows, zipRows, promoRows] = await Promise.all([
      db.select().from(packages),
      db.select().from(addons),
      db.select().from(zones),
      db.select().from(zoneZips),
      db.select().from(promos),
    ]);
    return { packages: pkgRows, addons: addonRows, zones: zoneRows, zips: zipRows, promos: promoRows };
  }),

  updatePackage: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      totes: z.number().optional(),
      dollies: z.number().optional(),
      rentalDays: z.number().optional(),
      launchPrice: z.number().optional(),
      standardPrice: z.number().optional(),
      extraWeekPrice: z.number().optional(),
      bestFor: z.string().optional(),
      featured: z.boolean().optional(),
      active: z.boolean().optional(),
      launchPricingActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...fields } = input;
      if (fields.featured) await db.update(packages).set({ featured: false });
      await db.update(packages).set(fields).where(eq(packages.id, id));
      await audit(ctx, "catalog.package", "package", String(id), fields);
      return { ok: true };
    }),

  updateZone: authedQuery
    .input(z.object({ id: z.number(), fee: z.number().optional(), active: z.boolean().optional(), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...fields } = input;
      await db.update(zones).set(fields).where(eq(zones.id, id));
      await audit(ctx, "catalog.zone", "zone", String(id), fields);
      return { ok: true };
    }),

  updatePromo: authedQuery
    .input(z.object({ id: z.number(), active: z.boolean().optional(), percentOff: z.number().optional(), usageLimit: z.number().nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...fields } = input;
      await db.update(promos).set(fields).where(eq(promos.id, id));
      await audit(ctx, "catalog.promo", "promo", String(id), fields);
      return { ok: true };
    }),
});

export const contentRouter = createRouter({
  get: authedQuery.query(async () => {
    const db = getDb();
    const [announcementRows, faqRows, testimonialRows] = await Promise.all([
      db.select().from(announcements).orderBy(desc(announcements.createdAt)),
      db.select().from(faqs).orderBy(faqs.sortOrder),
      db.select().from(testimonials).orderBy(desc(testimonials.id)),
    ]);
    return { announcements: announcementRows, faqs: faqRows, testimonials: testimonialRows };
  }),

  setAnnouncementStatus: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(["draft", "scheduled", "published", "archived"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      if (input.status === "published") {
        await db.update(announcements).set({ status: "archived" }).where(eq(announcements.status, "published"));
      }
      await db.update(announcements).set({ status: input.status }).where(eq(announcements.id, input.id));
      await audit(ctx, "content.announcement", "announcement", String(input.id), { status: input.status });
      return { ok: true };
    }),

  createAnnouncement: authedQuery
    .input(z.object({ message: z.string().min(4) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.insert(announcements).values({ message: input.message, status: "draft" });
      await audit(ctx, "content.announcement.create", "announcement");
      return { ok: true };
    }),

  setTestimonialStatus: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(["draft", "published", "archived"]), featured: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, status, featured } = input;
      await db.update(testimonials).set({
        status,
        ...(featured !== undefined ? { featured } : {}),
      }).where(eq(testimonials.id, id));
      await audit(ctx, "content.testimonial", "testimonial", String(id), { status });
      return { ok: true };
    }),

  setFaqStatus: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(["draft", "published", "archived"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(faqs).set({ status: input.status }).where(eq(faqs.id, input.id));
      await audit(ctx, "content.faq", "faq", String(input.id), { status: input.status });
      return { ok: true };
    }),
});

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export const auditRouter = createRouter({
  list: authedQuery
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(input?.limit ?? 100);
    }),
});
