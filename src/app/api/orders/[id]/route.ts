import { requirePermission, requireUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { nowIso, one, q, run } from "@/lib/db";
import {
  NotFoundError,
  ValidationError,
  withErrorHandling,
} from "@/lib/errors";
import { jsonBody, optionalString } from "@/lib/http";
import { audit } from "@/lib/audit";

export const GET = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "orders.view");
    const env = await getEnv(),
      orderId = (await context.params).id;
    const order = await one(
      env.DB,
      `SELECT o.*,p.name AS package_name,p.description AS package_description,p.tote_quantity AS package_tote_quantity,p.dolly_quantity AS package_dolly_quantity,p.included_rental_days AS package_included_rental_days,COALESCE(c.business_name,trim(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,''))) AS customer_name,c.customer_number,c.email,c.primary_phone,da.street delivery_street,da.unit delivery_unit,da.city delivery_city,da.state delivery_state,da.zip delivery_zip,da.delivery_notes delivery_notes,pa.street pickup_street,pa.unit pickup_unit,pa.city pickup_city,pa.state pickup_state,pa.zip pickup_zip,pa.delivery_notes pickup_notes FROM orders o JOIN customers c ON c.id=o.customer_id LEFT JOIN rental_packages p ON p.id=o.package_id LEFT JOIN customer_addresses da ON da.id=o.delivery_address_id LEFT JOIN customer_addresses pa ON pa.id=o.pickup_address_id WHERE o.id=? AND o.deleted_at IS NULL`,
      orderId,
    );
    if (!order) throw new NotFoundError("Order");
    const [
      assignments,
      assets,
      invoices,
      agreements,
      statusHistory,
      cancellation,
      bins,
      binHistory,
      equipmentAvailability,
      assignableAssets,
    ] = await Promise.all([
      q(
        env.DB,
        "SELECT id,assignment_number,assignment_type,scheduled_date,window_start,window_end,status FROM assignments WHERE order_id=? ORDER BY scheduled_date",
        orderId,
      ),
      q(
        env.DB,
        "SELECT a.id,a.asset_number,a.asset_type,a.current_status,a.current_condition,oa.assigned_at,oa.delivered_at,oa.picked_up_at,oa.warehouse_return_at,oa.missing,oa.damaged FROM order_assets oa JOIN assets a ON a.id=oa.asset_id WHERE oa.order_id=? ORDER BY oa.assigned_at DESC",
        orderId,
      ),
      q(
        env.DB,
        "SELECT id,invoice_number,status,due_date,total_cents,balance_due_cents FROM invoices WHERE order_id=? ORDER BY created_at DESC",
        orderId,
      ),
      q(
        env.DB,
        "SELECT id,agreement_number,status,accepted_at,expires_at,verification_code FROM agreements WHERE order_id=? ORDER BY created_at DESC",
        orderId,
      ),
      q(
        env.DB,
        "SELECT from_status,to_status,reason,changed_at FROM order_status_history WHERE order_id=? ORDER BY changed_at DESC",
        orderId,
      ),
      one(
        env.DB,
        "SELECT * FROM cancellation_records WHERE order_id=?",
        orderId,
      ),
      q(
        env.DB,
        "SELECT b.id,b.code,l.code location_code,ba.purpose,ba.notes FROM bin_assignments ba JOIN warehouse_bins b ON b.id=ba.bin_id JOIN storage_locations l ON l.id=b.storage_location_id WHERE ba.order_id=? AND ba.status='active' ORDER BY ba.assigned_at DESC",
        orderId,
      ),
      q(
        env.DB,
        "SELECT b.id,b.code,l.code location_code,ba.status,ba.purpose,ba.notes,ba.assigned_at,ba.released_at FROM bin_assignments ba JOIN warehouse_bins b ON b.id=ba.bin_id JOIN storage_locations l ON l.id=b.storage_location_id WHERE ba.order_id=? ORDER BY ba.assigned_at DESC",
        orderId,
      ),
      q(
        env.DB,
        "SELECT asset_type,COUNT(*) AS total_count,SUM(CASE WHEN current_status='clean_inventory' THEN 1 ELSE 0 END) AS clean_available_count,SUM(CASE WHEN current_order_id=? THEN 1 ELSE 0 END) AS allocated_to_order_count FROM assets WHERE deleted_at IS NULL AND asset_type IN ('tote','dolly') GROUP BY asset_type",
        orderId,
      ),
      q(
        env.DB,
        "SELECT id,asset_number,asset_type,current_status FROM assets WHERE deleted_at IS NULL AND current_status='clean_inventory' AND current_order_id IS NULL ORDER BY asset_type,asset_number LIMIT 300",
      ),
    ]);
    return Response.json({
      order,
      assignments,
      assets,
      invoices,
      agreements,
      statusHistory,
      cancellation,
      bins,
      binHistory,
      equipmentAvailability,
      assignableAssets,
    });
  },
);

export const PATCH = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request);
    requirePermission(ctx, "orders.edit");
    const env = await getEnv(),
      orderId = (await context.params).id,
      body = await jsonBody<Record<string, unknown>>(request);
    const order = await one<{
      id: string;
      delivery_address_id: string | null;
      pickup_address_id: string | null;
    }>(
      env.DB,
      "SELECT id,delivery_address_id,pickup_address_id FROM orders WHERE id=? AND deleted_at IS NULL",
      orderId,
    );
    if (!order) throw new NotFoundError("Order");
    const deliveryDate = optionalString(body.deliveryDate, "deliveryDate", 10),
      pickupDate = optionalString(body.pickupDate, "pickupDate", 10),
      notes = optionalString(body.customerNotes, "customerNotes", 4000),
      preferredDeliveryWindow = optionalString(body.preferredDeliveryWindow, "preferredDeliveryWindow", 100),
      preferredPickupWindow = optionalString(body.preferredPickupWindow, "preferredPickupWindow", 100),
      confirmedDeliveryWindowStart = optionalString(body.confirmedDeliveryWindowStart, "confirmedDeliveryWindowStart", 20),
      confirmedDeliveryWindowEnd = optionalString(body.confirmedDeliveryWindowEnd, "confirmedDeliveryWindowEnd", 20),
      confirmedPickupWindowStart = optionalString(body.confirmedPickupWindowStart, "confirmedPickupWindowStart", 20),
      confirmedPickupWindowEnd = optionalString(body.confirmedPickupWindowEnd, "confirmedPickupWindowEnd", 20);
    if (deliveryDate && pickupDate && pickupDate < deliveryDate)
      throw new ValidationError(
        "Pickup date must be on or after delivery date",
      );
    await run(
      env.DB,
      "UPDATE orders SET scheduled_delivery_date=COALESCE(?,scheduled_delivery_date),scheduled_pickup_date=COALESCE(?,scheduled_pickup_date),customer_notes=COALESCE(?,customer_notes),preferred_delivery_window=COALESCE(?,preferred_delivery_window),preferred_pickup_window=COALESCE(?,preferred_pickup_window),confirmed_delivery_window_start=COALESCE(?,confirmed_delivery_window_start),confirmed_delivery_window_end=COALESCE(?,confirmed_delivery_window_end),confirmed_pickup_window_start=COALESCE(?,confirmed_pickup_window_start),confirmed_pickup_window_end=COALESCE(?,confirmed_pickup_window_end),updated_at=?,version=version+1 WHERE id=?",
      deliveryDate,
      pickupDate,
      notes,
      preferredDeliveryWindow,
      preferredPickupWindow,
      confirmedDeliveryWindowStart,
      confirmedDeliveryWindowEnd,
      confirmedPickupWindowStart,
      confirmedPickupWindowEnd,
      nowIso(),
      orderId,
    );
    for (const [prefix, addressId] of [
      ["delivery", order.delivery_address_id],
      ["pickup", order.pickup_address_id],
    ] as const) {
      if (!addressId) continue;
      const street = optionalString(
          body[`${prefix}Street`],
          `${prefix} street`,
          200,
        ),
        city = optionalString(body[`${prefix}City`], `${prefix} city`, 100),
        state = optionalString(body[`${prefix}State`], `${prefix} state`, 10),
        zip = optionalString(body[`${prefix}Zip`], `${prefix} ZIP`, 20);
      if (street || city || state || zip)
        await run(
          env.DB,
          "UPDATE customer_addresses SET street=COALESCE(?,street),city=COALESCE(?,city),state=COALESCE(?,state),zip=COALESCE(?,zip),updated_at=? WHERE id=?",
          street,
          city,
          state,
          zip,
          nowIso(),
          addressId,
        );
    }
    await audit(env.DB, {
      actorUserId: ctx.user.id,
      action: "order.schedule_updated",
      entityType: "order",
      entityId: orderId,
      detail: { deliveryDate, pickupDate, preferredDeliveryWindow, preferredPickupWindow, confirmedDeliveryWindowStart, confirmedDeliveryWindowEnd, confirmedPickupWindowStart, confirmedPickupWindowEnd },
      ip: ctx.ip,
    });
    return Response.json({ ok: true });
  },
);

/** Soft-delete only uncommitted orders; operational and billing records are never erased. */
export const DELETE = withErrorHandling<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const ctx = await requireUser(request); requirePermission(ctx, "orders.edit");
    const env = await getEnv(), orderId = (await context.params).id;
    const order = await one<{ id: string; order_number: string }>(env.DB, "SELECT id,order_number FROM orders WHERE id=? AND deleted_at IS NULL", orderId);
    if (!order) throw new NotFoundError("Order");
    const usage = await one<{ n: number }>(env.DB, "SELECT (SELECT COUNT(*) FROM invoices WHERE order_id=?) + (SELECT COUNT(*) FROM agreements WHERE order_id=?) + (SELECT COUNT(*) FROM payments WHERE order_id=?) + (SELECT COUNT(*) FROM order_assets WHERE order_id=?) AS n", orderId, orderId, orderId, orderId);
    if ((usage?.n ?? 0) > 0) throw new ValidationError("Orders with billing, agreements, payments, or assigned equipment cannot be deleted. Cancel the order to retain its audit history.");
    await run(env.DB, "UPDATE orders SET deleted_at=?,updated_at=?,version=version+1 WHERE id=?", nowIso(), nowIso(), orderId);
    await audit(env.DB, { actorUserId: ctx.user.id, action: "order.deleted", entityType: "order", entityId: orderId, detail: { orderNumber: order.order_number }, ip: ctx.ip });
    return Response.json({ ok: true });
  },
);
