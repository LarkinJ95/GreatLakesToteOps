// Order lifecycle: creation, pricing snapshots, validated state transitions.
import { audit } from "../audit";
import { id, nowIso, one, q, run, type Db } from "../db";
import {
  ForbiddenError,
  InvalidTransitionError,
  NotFoundError,
  StateConflictError,
  ValidationError,
} from "../errors";
import { addDays } from "../money";
import { nextDocumentNumber } from "../numbering";
import type { AuthContext, OrderRow, OrderStatus, PackageRow } from "../types";
import { reserveAssets } from "./assetService";

/** Allowed order transitions. See docs/09. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // Website reservations can be signed in one request and therefore enter the
  // payment queue directly instead of remaining an inquiry.
  inquiry: ["quote", "awaiting_payment", "cancelled"],
  quote: ["awaiting_customer_approval", "cancelled"],
  awaiting_customer_approval: ["awaiting_agreement", "cancelled"],
  awaiting_agreement: [
    "awaiting_payment",
    "agreement_declined",
    "agreement_expired",
    "cancelled",
  ],
  awaiting_payment: ["confirmed", "payment_dispute", "cancelled"],
  confirmed: ["equipment_reserved", "rescheduled", "cancelled"],
  equipment_reserved: ["staged", "rescheduled", "cancelled"],
  staged: ["delivery_assigned", "rescheduled", "cancelled"],
  delivery_assigned: ["out_for_delivery", "rescheduled"],
  out_for_delivery: ["delivered", "delivery_failed"],
  delivered: ["active_rental"],
  active_rental: ["pickup_scheduled", "late_rental"],
  pickup_scheduled: ["pickup_assigned", "late_rental", "rescheduled"],
  pickup_assigned: ["picked_up", "pickup_failed", "rescheduled"],
  picked_up: ["equipment_reconciliation"],
  equipment_reconciliation: ["cleaning", "missing_equipment", "damage_review"],
  cleaning: ["final_invoice_review", "damage_review"],
  final_invoice_review: ["completed", "payment_dispute"],
  completed: ["closed"],
  closed: [],
  cancelled: [],
  rescheduled: [
    "confirmed",
    "delivery_assigned",
    "pickup_assigned",
    "cancelled",
  ],
  delivery_failed: ["delivery_assigned", "cancelled"],
  pickup_failed: ["pickup_assigned", "final_invoice_review"],
  late_rental: ["pickup_scheduled", "picked_up", "final_invoice_review"],
  missing_equipment: ["cleaning", "final_invoice_review"],
  damage_review: ["cleaning", "final_invoice_review"],
  agreement_declined: ["quote", "cancelled"],
  agreement_expired: ["awaiting_agreement", "cancelled"],
  payment_dispute: ["awaiting_payment", "final_invoice_review"],
};

export async function getOrder(db: Db, orderId: string): Promise<OrderRow> {
  const order = await one<OrderRow>(
    db,
    `SELECT * FROM orders WHERE id = ? AND deleted_at IS NULL`,
    orderId,
  );
  if (!order) throw new NotFoundError("Order");
  return order;
}

export interface PriceQuote {
  baseRentalCents: number;
  zoneFeeCents: number;
  accessFeeCents: number;
  addOnCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  taxRatePercent: number;
  snapshot: Record<string, unknown>;
}

/** Server-side price calculation from package + zone + tax tables. Never trusts the client. */
export async function calculateOrderPrice(
  db: Db,
  input: {
    packageId: string;
    rentalDays?: number;
    deliveryCity?: string;
    customBaseCents?: number;
    accessFeeCents?: number;
    addOnCents?: number;
    discountCents?: number;
    taxExempt?: boolean;
  },
): Promise<PriceQuote> {
  const pkg = await one<PackageRow>(
    db,
    `SELECT * FROM rental_packages WHERE id = ? AND active = 1`,
    input.packageId,
  );
  if (!pkg) throw new ValidationError("Unknown or inactive rental package");

  const days = input.rentalDays ?? pkg.included_rental_days;
  let baseRental = pkg.is_custom
    ? (input.customBaseCents ?? 0)
    : pkg.launch_price_cents;

  // Extra time beyond included days: weekly rate first, then daily
  const extraDays = Math.max(0, days - pkg.included_rental_days);
  const extraWeeks = Math.floor(extraDays / 7);
  const extraRemainderDays = extraDays % 7;
  const extraTimeCents =
    extraWeeks * pkg.extra_week_price_cents +
    extraRemainderDays * pkg.extra_day_price_cents;

  let zoneFee = 0;
  let zoneName: string | null = null;
  if (input.deliveryCity) {
    const zones = await q<{
      id: string;
      name: string;
      cities: string;
      zone_fee_cents: number;
    }>(db, `SELECT * FROM service_zones WHERE active = 1`);
    const city = input.deliveryCity.trim().toLowerCase();
    const zone = zones.find((z) =>
      z.cities
        .toLowerCase()
        .split(",")
        .map((c) => c.trim())
        .includes(city),
    );
    if (zone) {
      zoneFee = zone.zone_fee_cents;
      zoneName = zone.name;
    }
  }

  const accessFee = input.accessFeeCents ?? 0;
  const addOns = (input.addOnCents ?? 0) + extraTimeCents;
  const discount = Math.min(
    input.discountCents ?? 0,
    baseRental + zoneFee + accessFee + addOns,
  );

  const taxableSubtotal = baseRental + zoneFee + accessFee + addOns - discount;
  let taxRate = 0;
  if (!input.taxExempt) {
    const jurisdiction = await one<{ rate_percent: number }>(
      db,
      `SELECT rate_percent FROM tax_jurisdictions WHERE active = 1 ORDER BY created_at LIMIT 1`,
    );
    taxRate = jurisdiction?.rate_percent ?? 0;
  }
  const tax = Math.round((taxableSubtotal * taxRate) / 100);
  const total = taxableSubtotal + tax;

  return {
    baseRentalCents: baseRental,
    zoneFeeCents: zoneFee,
    accessFeeCents: accessFee,
    addOnCents: addOns,
    discountCents: discount,
    taxCents: tax,
    totalCents: total,
    taxRatePercent: taxRate,
    snapshot: {
      packageId: pkg.id,
      packageName: pkg.name,
      toteQuantity: pkg.tote_quantity,
      dollyQuantity: pkg.dolly_quantity,
      includedRentalDays: pkg.included_rental_days,
      rentalDays: days,
      launchPriceCents: pkg.launch_price_cents,
      standardPriceCents: pkg.standard_price_cents,
      extraDayPriceCents: pkg.extra_day_price_cents,
      extraWeekPriceCents: pkg.extra_week_price_cents,
      extraDays,
      extraWeeks,
      extraRemainderDays,
      extraTimeCents,
      zoneName,
      zoneFeeCents: zoneFee,
      accessFeeCents: accessFee,
      addOnCents: addOns,
      discountCents: discount,
      taxRatePercent: taxRate,
      taxCents: tax,
      totalCents: total,
      calculatedAt: nowIso(),
    },
  };
}

export interface CreateOrderInput {
  customerId: string;
  businessAccountId?: string | null;
  packageId: string;
  rentalStartDate: string;
  scheduledDeliveryDate: string;
  scheduledPickupDate: string;
  deliveryAddressId?: string | null;
  pickupAddressId?: string | null;
  salesChannel?: string;
  referralCode?: string | null;
  purchaseOrderNumber?: string | null;
  customBaseCents?: number;
  accessFeeCents?: number;
  addOnCents?: number;
  discountCents?: number;
  internalNotes?: string;
  customerNotes?: string;
  fromQuoteId?: string | null;
  preferredDeliveryWindow?: string | null;
  preferredPickupWindow?: string | null;
  priceOverride?: PriceQuote | null; // from an approved quote's frozen snapshot
}

export async function createOrder(
  db: Db,
  ctx: AuthContext | null,
  input: CreateOrderInput,
): Promise<OrderRow> {
  const customer = await one<{ id: string; tax_exempt: number }>(
    db,
    `SELECT id, tax_exempt FROM customers WHERE id = ? AND deleted_at IS NULL`,
    input.customerId,
  );
  if (!customer) throw new ValidationError("Unknown customer");

  let price: PriceQuote;
  if (input.priceOverride) {
    price = input.priceOverride; // frozen quote pricing — never recalculated
  } else {
    const address = input.deliveryAddressId
      ? await one<{ city: string }>(
          db,
          `SELECT city FROM customer_addresses WHERE id = ?`,
          input.deliveryAddressId,
        )
      : null;
    price = await calculateOrderPrice(db, {
      packageId: input.packageId,
      deliveryCity: address?.city,
      customBaseCents: input.customBaseCents,
      accessFeeCents: input.accessFeeCents,
      addOnCents: input.addOnCents,
      discountCents: input.discountCents,
      taxExempt: customer.tax_exempt === 1,
      rentalDays: daysBetween(
        input.scheduledDeliveryDate,
        input.scheduledPickupDate,
      ),
    });
  }

  const orderId = id("ord");
  const orderNumber = await nextDocumentNumber(db, "order");
  await run(
    db,
    `INSERT INTO orders (id, order_number, customer_id, business_account_id, order_status, package_id,
       rental_start_date, scheduled_delivery_date, scheduled_pickup_date, delivery_address_id, pickup_address_id,
       sales_channel, referral_code, purchase_order_number,
       base_rental_cents, zone_fee_cents, access_fee_cents, add_on_cents, discount_cents, tax_cents,
       total_cents, balance_due_cents, pricing_snapshot_json, internal_notes, customer_notes, preferred_delivery_window, preferred_pickup_window,
       created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'inquiry', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    orderId,
    orderNumber,
    input.customerId,
    input.businessAccountId ?? null,
    input.packageId,
    input.rentalStartDate,
    input.scheduledDeliveryDate,
    input.scheduledPickupDate,
    input.deliveryAddressId ?? null,
    input.pickupAddressId ?? input.deliveryAddressId ?? null,
    input.salesChannel ?? "office",
    input.referralCode ?? null,
    input.purchaseOrderNumber ?? null,
    price.baseRentalCents,
    price.zoneFeeCents,
    price.accessFeeCents,
    price.addOnCents,
    price.discountCents,
    price.taxCents,
    price.totalCents,
    price.totalCents,
    JSON.stringify({
      ...price.snapshot,
      fromQuoteId: input.fromQuoteId ?? null,
    }),
    input.internalNotes ?? null,
    input.customerNotes ?? null,
    input.preferredDeliveryWindow ?? null,
    input.preferredPickupWindow ?? null,
    ctx?.user.id ?? null,
    nowIso(),
    nowIso(),
  );
  await recordStatus(
    db,
    orderId,
    null,
    "inquiry",
    ctx?.user.id ?? null,
    input.fromQuoteId
      ? `Created from quote ${input.fromQuoteId}`
      : "Order created",
  );
  await audit(db, {
    actorUserId: ctx?.user.id ?? null,
    action: "order.created",
    entityType: "order",
    entityId: orderId,
    detail: { orderNumber, totalCents: price.totalCents },
    ip: ctx?.ip,
  });
  return getOrder(db, orderId);
}

function daysBetween(a: string, b: string): number {
  return Math.max(
    1,
    Math.round(
      (new Date(b + "T00:00:00Z").getTime() -
        new Date(a + "T00:00:00Z").getTime()) /
        86_400_000,
    ),
  );
}

async function recordStatus(
  db: Db,
  orderId: string,
  from: string | null,
  to: string,
  userId: string | null,
  reason: string | null,
  overrideBy?: string | null,
): Promise<void> {
  await run(
    db,
    `INSERT INTO order_status_history (id, order_id, from_status, to_status, reason, override_by, changed_by, changed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id("osh"),
    orderId,
    from,
    to,
    reason,
    overrideBy ?? null,
    userId,
    nowIso(),
  );
}

export interface TransitionOpts {
  reason?: string;
  overrideAgreement?: boolean;
}

/** Run a validated order transition with its guards. */
export async function transitionOrder(
  db: Db,
  ctx: AuthContext | null,
  orderId: string,
  toStatus: OrderStatus,
  opts: TransitionOpts = {},
): Promise<OrderRow> {
  const order = await getOrder(db, orderId);
  const from = order.order_status;
  if (from === toStatus) return order;
  const allowed = ORDER_TRANSITIONS[from] ?? [];
  if (!allowed.includes(toStatus))
    throw new InvalidTransitionError(from, toStatus);

  // ---- Guards ----
  if (toStatus === "awaiting_payment") {
    const agreement = await one<{ status: string }>(
      db,
      `SELECT status FROM agreements WHERE order_id = ? AND status = 'accepted' ORDER BY created_at DESC LIMIT 1`,
      orderId,
    );
    if (order.requires_agreement && !agreement) {
      throw new StateConflictError(
        "An accepted agreement is required before payment",
      );
    }
  }
  if (toStatus === "equipment_reserved") {
    const pkg = order.package_id
      ? await one<PackageRow>(
          db,
          `SELECT * FROM rental_packages WHERE id = ?`,
          order.package_id,
        )
      : null;
    const result = await reserveAssets(db, orderId, {
      tote: pkg?.tote_quantity ?? 0,
      dolly: pkg?.dolly_quantity ?? 0,
    });
    if (Object.keys(result.shortages).length > 0) {
      throw new StateConflictError(
        `Insufficient clean inventory: ${JSON.stringify(result.shortages)}`,
      );
    }
  }
  if (toStatus === "staged") {
    const unstaged = await one<{ n: number }>(db,
      "SELECT COUNT(*) AS n FROM order_assets oa JOIN assets a ON a.id=oa.asset_id WHERE oa.order_id=? AND oa.missing=0 AND a.current_status!='staged'", orderId);
    if ((unstaged?.n ?? 0) > 0)
      throw new StateConflictError(`${unstaged!.n} allocated asset(s) must be staged before the order can be staged`);
  }
  if (toStatus === "out_for_delivery") {
    const unloaded = await one<{ n: number }>(db,
      "SELECT COUNT(*) AS n FROM order_assets oa JOIN assets a ON a.id=oa.asset_id WHERE oa.order_id=? AND oa.missing=0 AND a.current_status!='loaded'", orderId);
    if ((unloaded?.n ?? 0) > 0)
      throw new StateConflictError(`${unloaded!.n} allocated asset(s) must be loaded before dispatch`);
    const staffed = await one<{ n: number }>(db,
      "SELECT COUNT(*) AS n FROM assignments WHERE order_id=? AND assignment_type='delivery' AND status NOT IN ('cancelled','failed') AND assigned_employee_id IS NOT NULL AND vehicle_id IS NOT NULL", orderId);
    if ((staffed?.n ?? 0) === 0)
      throw new StateConflictError("Assign a driver and vehicle to a delivery assignment before dispatch");
  }
  if (toStatus === "delivered") {
    const undelivered = await one<{ n: number }>(
      db,
      `SELECT COUNT(*) AS n FROM order_assets WHERE order_id = ? AND delivered_at IS NULL AND missing = 0`,
      orderId,
    );
    if ((undelivered?.n ?? 0) > 0) {
      throw new StateConflictError(
        `${undelivered!.n} asset(s) have not been scanned as delivered`,
      );
    }
    if (order.requires_agreement && order.agreement_status !== "accepted") {
      if (!opts.overrideAgreement || !ctx?.permissions.has("orders.edit")) {
        throw new StateConflictError(
          "Accepted agreement required to complete delivery (manager override with reason required)",
        );
      }
      if (!opts.reason)
        throw new ValidationError("An override reason is required");
    }
  }
  if (toStatus === "picked_up") {
    const pending = await one<{ n: number }>(db,
      "SELECT COUNT(*) AS n FROM order_assets WHERE order_id=? AND picked_up_at IS NULL AND missing=0", orderId);
    if ((pending?.n ?? 0) > 0)
      throw new StateConflictError(`${pending!.n} asset(s) have not been scanned as picked up`);
  }
  if (toStatus === "equipment_reconciliation") {
    const pending = await one<{ n: number }>(db,
      "SELECT COUNT(*) AS n FROM order_assets WHERE order_id=? AND warehouse_return_at IS NULL AND missing=0", orderId);
    if ((pending?.n ?? 0) > 0)
      throw new StateConflictError(`${pending!.n} asset(s) have not been scanned back into the warehouse`);
  }
  if (toStatus === "final_invoice_review") {
    const pending = await one<{ n: number }>(db,
      "SELECT COUNT(*) AS n FROM order_assets oa JOIN assets a ON a.id=oa.asset_id WHERE oa.order_id=? AND oa.missing=0 AND a.current_status IN ('picked_up','dirty_return','cleaning','inspection_required')", orderId);
    if ((pending?.n ?? 0) > 0)
      throw new StateConflictError(`${pending!.n} asset(s) still need warehouse cleaning or inspection`);
  }
  if (
    toStatus === "completed" &&
    order.balance_due_cents > 0 &&
    order.payment_status !== "terms"
  ) {
    throw new StateConflictError(
      "Order has an open balance; record payment or approved account terms first",
    );
  }

  const now = nowIso();
  const sets: Record<string, unknown> = { order_status: toStatus };
  if (toStatus === "delivered") sets.actual_delivery_at = now;
  if (toStatus === "picked_up") sets.actual_pickup_at = now;

  const res = await run(
    db,
    `UPDATE orders SET order_status = ?, actual_delivery_at = COALESCE(?, actual_delivery_at),
       actual_pickup_at = COALESCE(?, actual_pickup_at), version = version + 1, updated_at = ?
     WHERE id = ? AND version = ? AND order_status = ?`,
    toStatus,
    sets.actual_delivery_at ?? null,
    sets.actual_pickup_at ?? null,
    now,
    orderId,
    order.version,
    from,
  );
  if ((res.meta.changes ?? 0) === 0) {
    throw new StateConflictError(
      "Order changed concurrently; reload and retry",
    );
  }

  await recordStatus(
    db,
    orderId,
    from,
    toStatus,
    ctx?.user.id ?? null,
    opts.reason ?? null,
    opts.overrideAgreement ? (ctx?.user.id ?? null) : null,
  );
  await audit(db, {
    actorUserId: ctx?.user.id ?? null,
    action: "order.transition",
    entityType: "order",
    entityId: orderId,
    detail: {
      from,
      to: toStatus,
      reason: opts.reason ?? null,
      override: !!opts.overrideAgreement,
    },
    ip: ctx?.ip ?? null,
  });
  return getOrder(db, orderId);
}

/** Release reservations when an order is cancelled before staging. */
export async function releaseOrderAssets(
  db: Db,
  orderId: string,
): Promise<void> {
  const now = nowIso();
  const assets = await q<{ id: string }>(
    db,
    `SELECT id FROM assets WHERE current_order_id = ? AND current_status IN ('reserved','staged')`,
    orderId,
  );
  for (const a of assets) {
    await run(
      db,
      `UPDATE assets SET current_status = 'clean_inventory', current_order_id = NULL, version = version + 1, updated_at = ? WHERE id = ?`,
      now,
      a.id,
    );
    await run(
      db,
      `INSERT INTO asset_status_history (id, asset_id, from_status, to_status, changed_at, notes) VALUES (?, ?, 'reserved', 'clean_inventory', ?, 'Order cancelled — reservation released')`,
      id("ash"),
      a.id,
      now,
    );
  }
  await run(
    db,
    `DELETE FROM order_assets WHERE order_id = ? AND delivered_at IS NULL`,
    orderId,
  );
}
