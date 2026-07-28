import { getEnv } from "@/lib/cloudflare";
import { id, nowIso, one, q, run } from "@/lib/db";
import { createOrder } from "@/lib/services/orderService";

type Ctx = { params: Promise<{ endpoint: string[] }> };
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
const error = (message: string, code = "INVALID_INPUT", status = 400) =>
  json({ error: message, code }, status);
const cents = (amount: number) => Math.round(amount * 100);
const dollars = (amount: number) => Math.round(amount) / 100;
async function body(request: Request) {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
async function authorize(request: Request) {
  const env = await getEnv();
  return (
    !env.PUBLIC_API_KEY ||
    request.headers.get("x-api-key") === env.PUBLIC_API_KEY
  );
}
const zone = (
  row: {
    id: string;
    name: string;
    zone_fee_cents: number;
    active: number;
  } | null,
) =>
  row
    ? {
        id: row.id,
        name: row.name,
        fee: row.zone_fee_cents / 100,
        description: `${row.name} delivery area.`,
        active: !!row.active,
      }
    : null;

export async function POST(request: Request, context: Ctx) {
  if (!(await authorize(request)))
    return error("Unauthorized public API request", "UNAUTHORIZED", 401);
  const path = (await context.params).endpoint.join("/");
  const input = await body(request);
  if (!input) return error("Request body must be a JSON object");
  const env = await getEnv();
  if (path === "service-area/check") {
    const zip = typeof input.zip === "string" ? input.zip.trim() : "",
      cityName = typeof input.city === "string" ? input.city.trim() : "";
    if (!/^\d{5}$/.test(zip) || !cityName)
      return error("Enter a street, city, and valid ZIP code");
    const match = await one<{
      id: string;
      name: string;
      zone_fee_cents: number;
      active: number;
      city_name: string;
      city_slug: string;
      zip: string;
      blurb: string;
      local_tips_json: string;
    }>(
      env.DB,
      "SELECT z.id,z.name,z.zone_fee_cents,z.active,s.city_name,s.city_slug,s.zip,s.blurb,s.local_tips_json FROM service_zone_zips s JOIN service_zones z ON z.id=s.zone_id WHERE s.zip=? AND s.active=1 AND z.active=1",
      zip,
    );
    if (!match || match.city_name.toLowerCase() !== cityName.toLowerCase()) {
      const z3 = await one<{
        id: string;
        name: string;
        zone_fee_cents: number;
        active: number;
      }>(
        env.DB,
        "SELECT id,name,zone_fee_cents,active FROM service_zones WHERE name LIKE '%Zone 3%' AND active=1 LIMIT 1",
      );
      return json({
        status: "custom-review",
        zone: zone(z3),
        city: null,
        message: "We’ll review this address for custom-route availability.",
      });
    }
    return json({
      status: "in-zone",
      zone: zone(match),
      city: {
        name: match.city_name,
        slug: match.city_slug,
        zoneId: match.id,
        zips: [match.zip],
        blurb: match.blurb,
        localTips: JSON.parse(match.local_tips_json || "[]"),
      },
      message: `${match.city_name} is inside our ${match.name}.`,
    });
  }
  if (path === "availability/check") {
    const packageSlug =
        typeof input.packageSlug === "string" ? input.packageSlug : "",
      deliveryDate =
        typeof input.deliveryDate === "string" ? input.deliveryDate : "",
      pickupDate = typeof input.pickupDate === "string" ? input.pickupDate : "",
      deliveryZip =
        typeof input.deliveryZip === "string" ? input.deliveryZip : "";
    const packages = await q<{ id: string; name: string }>(
      env.DB,
      "SELECT id,name FROM rental_packages WHERE active=1 AND is_custom=0 ORDER BY tote_quantity",
    );
    const slugs = packages.map((p) =>
      p.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    );
    const area = await one<{ id: string }>(
      env.DB,
      "SELECT s.id FROM service_zone_zips s JOIN service_zones z ON z.id=s.zone_id WHERE s.zip=? AND s.active=1 AND z.active=1",
      deliveryZip,
    );
    const status = !area
      ? "outside-area"
      : !deliveryDate || !pickupDate || pickupDate < deliveryDate
        ? "date-adjustment"
        : "custom-review";
    await run(
      env.DB,
      "INSERT INTO availability_inquiries (id,package_slug,delivery_date,pickup_date,delivery_zip,result_status,created_at) VALUES (?,?,?,?,?,?,?)",
      id("avi"),
      packageSlug,
      deliveryDate || null,
      pickupDate || null,
      deliveryZip || null,
      status,
      nowIso(),
    );
    const copy: Record<string, [string, string]> = {
      "outside-area": [
        "Outside standard service area",
        "Request a custom quote and our team will review your route.",
      ],
      "date-adjustment": [
        "Date adjustment needed",
        "Choose valid delivery and pickup dates to continue.",
      ],
      "custom-review": [
        "Availability review required",
        "We’ll confirm equipment and route capacity before accepting a reservation.",
      ],
    };
    return json({
      status,
      headline: copy[status][0],
      detail: copy[status][1],
      availablePackageSlugs: status === "outside-area" ? [] : slugs,
    });
  }
  if (path === "pricing/quote") {
    const packageSlug =
      typeof input.packageSlug === "string" ? input.packageSlug : "";
    const pkg = (
      await q<{
        id: string;
        name: string;
        launch_price_cents: number;
        standard_price_cents: number;
        effective_date: string;
        expiration_date: string | null;
        extra_week_price_cents: number;
      }>(env.DB, "SELECT * FROM rental_packages WHERE active=1 AND is_custom=0")
    ).find(
      (p) =>
        p.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") === packageSlug,
    );
    if (!pkg)
      return error("Package is unavailable", "PACKAGE_UNAVAILABLE", 404);
    const z =
      typeof input.zoneId === "string"
        ? await one<{ id: string; name: string; zone_fee_cents: number }>(
            env.DB,
            "SELECT id,name,zone_fee_cents FROM service_zones WHERE id=? AND active=1",
            input.zoneId,
          )
        : null;
    const base =
      pkg.effective_date <= new Date().toISOString().slice(0, 10) &&
      (!pkg.expiration_date ||
        pkg.expiration_date >= new Date().toISOString().slice(0, 10))
        ? pkg.launch_price_cents
        : pkg.standard_price_cents;
    let subtotal = base;
    const lines = [{ label: `${pkg.name} package`, amount: base / 100 }];
    const promo =
      typeof input.promoCode === "string"
        ? await one<{
            id: string;
            discount_type: string;
            discount_value: number;
          }>(
            env.DB,
            "SELECT id,discount_type,discount_value FROM promotional_codes WHERE code=? AND active=1 AND (starts_at IS NULL OR starts_at<=?) AND (ends_at IS NULL OR ends_at>=?)",
            input.promoCode.trim().toUpperCase(),
            nowIso(),
            nowIso(),
          )
        : null;
    const discount = promo
      ? promo.discount_type === "percent"
        ? Math.round((subtotal * promo.discount_value) / 100)
        : promo.discount_value
      : 0;
    const zoneFee = z?.zone_fee_cents ?? 0,
      tax = Math.round((subtotal + zoneFee - discount) * 0.06),
      total = subtotal + zoneFee - discount + tax,
      quoteId = id("pqt");
    await run(
      env.DB,
      "INSERT INTO public_quote_snapshots (id,package_id,zone_id,promo_code_id,subtotal_cents,zone_fee_cents,discount_cents,tax_cents,total_cents,snapshot_json,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      quoteId,
      pkg.id,
      z?.id ?? null,
      promo?.id ?? null,
      subtotal,
      zoneFee,
      discount,
      tax,
      total,
      JSON.stringify({ lines }),
      new Date(Date.now() + 86400000).toISOString(),
      nowIso(),
    );
    if (z && zoneFee)
      lines.push({ label: `${z.name} delivery fee`, amount: zoneFee / 100 });
    if (discount) lines.push({ label: "Promotion", amount: -discount / 100 });
    return json({
      lines,
      subtotal: dollars(subtotal),
      zoneFee: dollars(zoneFee),
      discount: dollars(discount),
      estimatedTax: dollars(tax),
      estimatedTotal: dollars(total),
      quoteId,
    });
  }
  if (path === "leads" || path === "reservations") {
    const type =
      path === "reservations"
        ? "reservation"
        : typeof input.type === "string"
          ? input.type
          : "";
    if (
      !new Set([
        "contact",
        "business-account",
        "custom-quote",
        "outside-area",
        "referral",
        "order-support",
        "reservation",
      ]).has(type)
    )
      return error("Unsupported submission type");
    const reference = `${type === "reservation" ? "GLT" : "LEAD"}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    const now = nowIso();
    await run(
      env.DB,
      "INSERT INTO public_leads (id,reference,lead_type,pipeline_status,payload_json,consent,source_page,ip_hash,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      id("lead"),
      reference,
      type,
      type === "business-account" ? "business-account-review" : "new",
      JSON.stringify(input),
      input.consent === true ? 1 : 0,
      typeof input.sourcePage === "string" ? input.sourcePage : null,
      null,
      now,
      now,
    );
    if (type !== "reservation")
      return json(
        { ok: true, reference, message: "Thanks — we received your request." },
        201,
      );
    const customer = input.customer as Record<string, unknown> | undefined,
      delivery = input.delivery as Record<string, unknown> | undefined,
      pickup = input.pickup as Record<string, unknown> | undefined;
    const email =
      typeof customer?.email === "string"
        ? customer.email.trim().toLowerCase()
        : "";
    const deliveryDate =
        typeof input.deliveryDate === "string" ? input.deliveryDate : "",
      pickupDate = typeof input.pickupDate === "string" ? input.pickupDate : "",
      packageSlug =
        typeof input.packageSlug === "string" ? input.packageSlug : "";
    if (
      !email ||
      !delivery?.street ||
      !delivery?.city ||
      !delivery?.zip ||
      !pickup?.street ||
      !pickup?.city ||
      !pickup?.zip ||
      !deliveryDate ||
      !pickupDate
    )
      return error(
        "Reservation is missing contact, address, or schedule details",
      );
    const pkg = (
      await q<{ id: string; name: string }>(
        env.DB,
        "SELECT id,name FROM rental_packages WHERE active=1",
      )
    ).find(
      (p) =>
        p.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") === packageSlug,
    );
    if (!pkg)
      return error(
        "Selected package is unavailable",
        "PACKAGE_UNAVAILABLE",
        404,
      );
    let c = await one<{ id: string }>(
      env.DB,
      "SELECT id FROM customers WHERE lower(email)=? AND deleted_at IS NULL LIMIT 1",
      email,
    );
    if (!c) {
      const cid = id("cus"),
        first =
          typeof customer?.firstName === "string"
            ? customer.firstName
            : typeof customer?.name === "string"
              ? customer.name.split(" ")[0]
              : "Customer",
        last =
          typeof customer?.lastName === "string"
            ? customer.lastName
            : typeof customer?.name === "string"
              ? customer.name.split(" ").slice(1).join(" ") || "Customer"
              : "Customer";
      await run(
        env.DB,
        "INSERT INTO customers (id,customer_number,customer_type,first_name,last_name,primary_phone,email,marketing_consent,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        cid,
        `GLMT-CUS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        "residential",
        first,
        last,
        typeof customer?.phone === "string" ? customer.phone : null,
        email,
        0,
        now,
        now,
      );
      c = { id: cid };
    }
    const address = async (label: string, a: Record<string, unknown>) => {
      const aid = id("addr");
      await run(
        env.DB,
        "INSERT INTO customer_addresses (id,customer_id,label,street,unit,city,state,zip,stair_info,elevator_info,delivery_notes,contactless_allowed,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        aid,
        c!.id,
        label,
        String(a.street),
        typeof a.unit === "string" ? a.unit : null,
        String(a.city),
        typeof a.state === "string" ? a.state : "MI",
        String(a.zip),
        typeof input.stairs === "string" ? input.stairs : null,
        input.elevator ? "yes" : null,
        typeof input.access === "string" ? input.access : null,
        input.contactless ? 1 : 0,
        now,
        now,
      );
      return aid;
    };
    const deliveryId = await address("Delivery", delivery),
      pickupId = await address("Pickup", pickup);
    const order = await createOrder(env.DB, null, {
      customerId: c.id,
      packageId: pkg.id,
      rentalStartDate: deliveryDate,
      scheduledDeliveryDate: deliveryDate,
      scheduledPickupDate: pickupDate,
      deliveryAddressId: deliveryId,
      pickupAddressId: pickupId,
      salesChannel: "website",
      preferredDeliveryWindow:
        typeof input.deliveryWindow === "string" ? input.deliveryWindow : null,
      preferredPickupWindow:
        typeof input.pickupWindow === "string" ? input.pickupWindow : null,
      customerNotes: `Preferred delivery window: ${String(input.deliveryWindow ?? "")}; preferred pickup window: ${String(input.pickupWindow ?? "")}; ${String(input.access ?? "")}`,
    });
    let template = await one<{ id: string; version: number }>(
      env.DB,
      "SELECT t.id,v.version FROM agreement_templates t JOIN agreement_template_versions v ON v.template_id=t.id AND v.status='active' WHERE t.active=1 AND t.template_type='standard_residential' LIMIT 1",
    );
    if (!template) {
      const templateId = id("agt"),
        versionId = id("agv");
      await run(
        env.DB,
        "INSERT INTO agreement_templates (id,name,description,template_type,customer_type,active,created_at,updated_at) VALUES (?,?,?,'standard_residential','residential',1,?,?)",
        templateId,
        "Website residential rental agreement",
        "Standard electronically signed reservation agreement",
        now,
        now,
      );
      await run(
        env.DB,
        "INSERT INTO agreement_template_versions (id,template_id,version,status,effective_date,html_body,created_at,approved_at) VALUES (?,?,1,'active',date('now'),?,?,?)",
        versionId,
        templateId,
        "Great Lakes Moving Totes rental agreement",
        now,
        now,
      );
      template = { id: templateId, version: 1 };
    }
    if (template) {
      const agreementId = id("agr"),
        number = `GLMT-AGR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        signature =
          typeof input.signature === "string"
            ? input.signature
            : typeof customer?.name === "string"
              ? customer.name
              : "Customer",
        html = `<h1>Great Lakes Moving Totes Rental Agreement</h1><p>Order ${order.order_number}</p><p>Delivery: ${deliveryDate} ${String(input.deliveryWindow ?? "")}</p><p>Pickup: ${pickupDate} ${String(input.pickupWindow ?? "")}</p><p>Signed electronically by ${signature} on ${now}</p>`;
      await run(
        env.DB,
        "INSERT INTO agreements (id,agreement_number,order_id,customer_id,template_id,template_version,status,snapshot_json,rendered_html,html_checksum,accepted_at,acceptance_ip,acceptance_device_info,verification_code,created_at,updated_at) VALUES (?,?,?,?,?,?,'accepted',?,?,?,?,?,?,?,?,?,?)",
        agreementId,
        number,
        order.id,
        c.id,
        template.id,
        template.version,
        JSON.stringify({
          order,
          delivery,
          pickup,
          deliveryWindow: input.deliveryWindow,
          pickupWindow: input.pickupWindow,
        }),
        html,
        crypto.randomUUID(),
        now,
        request.headers.get("cf-connecting-ip"),
        request.headers.get("user-agent"),
        crypto.randomUUID().replace(/-/g, "").slice(0, 16),
        now,
        now,
      );
      await run(
        env.DB,
        "UPDATE orders SET agreement_status='accepted',current_agreement_id=? WHERE id=?",
        agreementId,
        order.id,
      );
    }
    const invoiceId = id("inv"),
      invoiceNumber = `GLMT-INV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      total = order.total_cents;
    await run(
      env.DB,
      "INSERT INTO invoices (id,invoice_number,invoice_type,customer_id,order_id,status,issue_date,due_date,service_date,subtotal_cents,tax_total_cents,total_cents,balance_due_cents,customer_billing_snapshot_json,company_snapshot_json,notes,verification_code,created_at,updated_at) VALUES (?,?,?,?,?,'finalized',date('now'),date('now','+30 days'),?,?,?,?,?,?,?,?,?,?,?,?)",
      invoiceId,
      invoiceNumber,
      "standard",
      c.id,
      order.id,
      deliveryDate,
      Math.max(0, total - order.tax_cents),
      order.tax_cents,
      total,
      total,
      JSON.stringify({ email }),
      JSON.stringify({ name: "Great Lakes Moving Totes" }),
      "Website reservation",
      crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      now,
      now,
    );
    await run(
      env.DB,
      "UPDATE orders SET balance_due_cents=?,agreement_status=CASE WHEN current_agreement_id IS NULL THEN agreement_status ELSE 'accepted' END WHERE id=?",
      total,
      order.id,
    );
    await run(
      env.DB,
      "INSERT INTO invoice_line_items (id,invoice_id,line_order,item_type,description,service_date,quantity,unit,unit_price_cents,taxable,tax_rate_percent,tax_cents,line_subtotal_cents,line_total_cents) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id("ili"),
      invoiceId,
      1,
      "package_rental",
      `Website reservation ${order.order_number}`,
      deliveryDate,
      1,
      "rental",
      Math.max(0, total - order.tax_cents),
      1,
      0,
      order.tax_cents,
      Math.max(0, total - order.tax_cents),
      total,
    );
    return json(
      {
        ok: true,
        reference: order.order_number,
        message:
          "Reservation created. Your order, invoice, and signed agreement are available in the customer portal.",
      },
      201,
    );
  }
  return error("Unknown public endpoint", "NOT_FOUND", 404);
}
