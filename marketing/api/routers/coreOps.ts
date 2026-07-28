import { z } from "zod";
import { and, desc, eq, gte, like, or, sql, lte } from "drizzle-orm";
import { authedQuery, createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import {
  auditLog, customers, dispatchStops, invoices, leads, reservations,
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
// Dashboard
// ---------------------------------------------------------------------------

export const dashboardRouter = createRouter({
  kpis: authedQuery.query(async () => {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    const [orderCounts] = await db
      .select({
        active: sql<number>`sum(case when ${reservations.status} = 'active' then 1 else 0 end)`,
        pending: sql<number>`sum(case when ${reservations.status} = 'pending' then 1 else 0 end)`,
        confirmed: sql<number>`sum(case when ${reservations.status} = 'confirmed' then 1 else 0 end)`,
        total: sql<number>`count(*)`,
      })
      .from(reservations);

    const [newLeads] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.status, "new"));

    const [revenue] = await db
      .select({
        collected: sql<string>`coalesce(sum(${invoices.amountPaid}), 0)`,
        outstanding: sql<string>`coalesce(sum(case when ${invoices.status} in ('sent','overdue') then ${invoices.amount} - ${invoices.amountPaid} else 0 end), 0)`,
      })
      .from(invoices);

    const todaysStops = await db
      .select()
      .from(dispatchStops)
      .where(gte(dispatchStops.stopDate, today))
      .orderBy(dispatchStops.stopDate, dispatchStops.sequence)
      .limit(10);

    const recentOrders = await db
      .select({
        order: reservations,
        customerFirst: customers.firstName,
        customerLast: customers.lastName,
      })
      .from(reservations)
      .leftJoin(customers, eq(reservations.customerId, customers.id))
      .orderBy(desc(reservations.createdAt))
      .limit(6);

    const recentLeads = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(5);

    return {
      activeRentals: Number(orderCounts?.active ?? 0),
      pendingOrders: Number(orderCounts?.pending ?? 0),
      confirmedOrders: Number(orderCounts?.confirmed ?? 0),
      totalOrders: Number(orderCounts?.total ?? 0),
      newInquiries: Number(newLeads?.count ?? 0),
      collected: Number(revenue?.collected ?? 0),
      outstanding: Number(revenue?.outstanding ?? 0),
      upcomingStops: todaysStops,
      recentOrders,
      recentLeads,
    };
  }),
});

// ---------------------------------------------------------------------------
// Inquiries (leads)
// ---------------------------------------------------------------------------

const leadStatus = z.enum(["new", "contacted", "qualified", "converted", "closed", "spam"]);

export const leadsRouter = createRouter({
  list: authedQuery
    .input(z.object({
      status: leadStatus.optional(),
      type: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conds = [];
      if (input?.status) conds.push(eq(leads.status, input.status));
      if (input?.type) conds.push(eq(leads.type, input.type as never));
      if (input?.search) {
        const q = `%${input.search}%`;
        conds.push(or(like(leads.name, q), like(leads.email, q), like(leads.company, q), like(leads.message, q)));
      }
      return db.select().from(leads)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(leads.createdAt));
    }),

  updateStatus: authedQuery
    .input(z.object({ id: z.number(), status: leadStatus }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(leads).set({ status: input.status }).where(eq(leads.id, input.id));
      await audit(ctx, "lead.status", "lead", String(input.id), { status: input.status });
      return { ok: true };
    }),

  addNote: authedQuery
    .input(z.object({ id: z.number(), note: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(leads).set({ internalNote: input.note }).where(eq(leads.id, input.id));
      await audit(ctx, "lead.note", "lead", String(input.id));
      return { ok: true };
    }),
});

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export const customersRouter = createRouter({
  list: authedQuery
    .input(z.object({ search: z.string().optional(), accountType: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conds = [];
      if (input?.accountType) conds.push(eq(customers.accountType, input.accountType as never));
      if (input?.search) {
        const q = `%${input.search}%`;
        conds.push(or(
          like(customers.firstName, q), like(customers.lastName, q),
          like(customers.email, q), like(customers.companyName, q),
        ));
      }
      const rows = await db.select().from(customers)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(customers.createdAt));

      const orderAgg = await db
        .select({
          customerId: reservations.customerId,
          orders: sql<number>`count(*)`,
          lifetimeValue: sql<string>`coalesce(sum(${reservations.total}), 0)`,
        })
        .from(reservations)
        .groupBy(reservations.customerId);
      const aggMap = new Map(orderAgg.map((a) => [Number(a.customerId), a]));

      return rows.map((c) => ({
        ...c,
        orderCount: Number(aggMap.get(Number(c.id))?.orders ?? 0),
        lifetimeValue: Number(aggMap.get(Number(c.id))?.lifetimeValue ?? 0),
      }));
    }),

  detail: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [customer] = await db.select().from(customers).where(eq(customers.id, input.id));
      const orders = await db.select().from(reservations)
        .where(eq(reservations.customerId, input.id))
        .orderBy(desc(reservations.createdAt));
      const customerInvoices = await db.select().from(invoices)
        .where(eq(invoices.customerId, input.id))
        .orderBy(desc(invoices.createdAt));
      return { customer, orders, invoices: customerInvoices };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      companyName: z.string().optional(),
      accountType: z.enum(["residential", "business"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...fields } = input;
      await db.update(customers).set(fields).where(eq(customers.id, id));
      await audit(ctx, "customer.update", "customer", String(id), fields);
      return { ok: true };
    }),
});

// ---------------------------------------------------------------------------
// Order desk (reservations)
// ---------------------------------------------------------------------------

const orderStatus = z.enum(["draft", "pending", "confirmed", "active", "completed", "cancelled"]);

export const ordersRouter = createRouter({
  list: authedQuery
    .input(z.object({
      status: orderStatus.optional(),
      search: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conds = [];
      if (input?.status) conds.push(eq(reservations.status, input.status));
      if (input?.from) conds.push(gte(reservations.deliveryDate, input.from));
      if (input?.to) conds.push(lte(reservations.deliveryDate, input.to));
      if (input?.search) {
        const q = `%${input.search}%`;
        conds.push(or(
          like(reservations.orderNumber, q),
          like(customers.firstName, q),
          like(customers.lastName, q),
        ));
      }
      return db
        .select({
          order: reservations,
          customerFirst: customers.firstName,
          customerLast: customers.lastName,
          customerEmail: customers.email,
        })
        .from(reservations)
        .leftJoin(customers, eq(reservations.customerId, customers.id))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(reservations.createdAt));
    }),

  detail: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [row] = await db
        .select({ order: reservations, customer: customers })
        .from(reservations)
        .leftJoin(customers, eq(reservations.customerId, customers.id))
        .where(eq(reservations.id, input.id));
      const stops = await db.select().from(dispatchStops)
        .where(eq(dispatchStops.orderId, input.id))
        .orderBy(dispatchStops.stopDate);
      const orderInvoices = await db.select().from(invoices)
        .where(eq(invoices.orderId, input.id));
      return { ...row, stops, invoices: orderInvoices };
    }),

  updateStatus: authedQuery
    .input(z.object({ id: z.number(), status: orderStatus }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(reservations).set({ status: input.status }).where(eq(reservations.id, input.id));
      await audit(ctx, "order.status", "order", String(input.id), { status: input.status });
      return { ok: true };
    }),

  addNote: authedQuery
    .input(z.object({ id: z.number(), note: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(reservations).set({ internalNotes: input.note }).where(eq(reservations.id, input.id));
      await audit(ctx, "order.note", "order", String(input.id));
      return { ok: true };
    }),

  scheduleStops: authedQuery
    .input(z.object({
      orderId: z.number(),
      driverId: z.number().optional(),
      vehicleId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [order] = await db.select().from(reservations).where(eq(reservations.id, input.orderId));
      if (!order) throw new Error("Order not found");
      // Create delivery + pickup stops if not already scheduled
      const existing = await db.select().from(dispatchStops).where(eq(dispatchStops.orderId, input.orderId));
      const hasDelivery = existing.some((s) => s.type === "delivery");
      const hasPickup = existing.some((s) => s.type === "pickup");
      if (!hasDelivery) {
        await db.insert(dispatchStops).values({
          orderId: input.orderId, type: "delivery", stopDate: order.deliveryDate,
          window: order.deliveryWindow, address: order.deliveryAddress,
          driverId: input.driverId ?? null, vehicleId: input.vehicleId ?? null,
        });
      }
      if (!hasPickup) {
        await db.insert(dispatchStops).values({
          orderId: input.orderId, type: "pickup", stopDate: order.pickupDate,
          window: order.pickupWindow, address: order.pickupAddress,
          driverId: input.driverId ?? null, vehicleId: input.vehicleId ?? null,
        });
      }
      await audit(ctx, "order.scheduleStops", "order", order.orderNumber);
      return { ok: true };
    }),
});
