import { getDb } from "../api/queries/connection";
import * as s from "./schema";

// Seed ToteOps with launch catalog + realistic demo operations data.
const db = getDb();

const today = new Date();
function d(offset: number): string {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().slice(0, 10);
}
function ref(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(5, "0")}`;
}

async function seed() {
  console.log("Seeding ToteOps database...");

  // --- Catalog ---
  await db.insert(s.packages).values([
    { slug: "quick-pack", name: "Quick Pack", totes: 12, dollies: 1, rentalDays: 7, launchPrice: 69, standardPrice: 79, extraWeekPrice: 25, bestFor: "Studios, dorm rooms, small projects, and decluttering", featured: false, active: true, launchPricingActive: true },
    { slug: "apartment", name: "Apartment", totes: 20, dollies: 1, rentalDays: 14, launchPrice: 99, standardPrice: 109, extraWeekPrice: 35, bestFor: "Studios and one-bedroom moves", featured: false, active: true, launchPricingActive: true },
    { slug: "home", name: "Home", totes: 40, dollies: 2, rentalDays: 14, launchPrice: 169, standardPrice: 189, extraWeekPrice: 55, bestFor: "Many two- and three-bedroom moves", featured: true, active: true, launchPricingActive: true },
    { slug: "large-home", name: "Large Home", totes: 60, dollies: 3, rentalDays: 14, launchPrice: 219, standardPrice: 259, extraWeekPrice: 75, bestFor: "Larger homes, families, and extended remodeling projects", featured: false, active: true, launchPricingActive: true },
    { slug: "estate-office", name: "Estate or Office", totes: 100, dollies: 5, rentalDays: 14, launchPrice: 349, standardPrice: 399, extraWeekPrice: 110, bestFor: "Offices, estates, restoration projects, and major transitions", featured: false, active: true, launchPricingActive: true },
  ]);

  await db.insert(s.addons).values([
    { addonKey: "addon-totes-5", name: "Extra totes (5-pack)", description: "Five additional totes for your rental.", price: 15, unit: "per rental", maxQty: 8, active: true },
    { addonKey: "addon-dolly", name: "Extra dolly", description: "Additional low-profile tote dolly.", price: 12, unit: "per rental", maxQty: 4, active: true },
    { addonKey: "addon-hand-truck", name: "Hand truck", description: "Two-wheel hand truck for heavy stacks.", price: 14, unit: "per rental", maxQty: 2, active: true },
    { addonKey: "addon-blankets", name: "Moving blankets (6-pack)", description: "Protective blankets for furniture and fragile items.", price: 18, unit: "per rental", maxQty: 4, active: true },
    { addonKey: "addon-qr-kit", name: "QR label kit", description: "Numbered QR labels to inventory every tote.", price: 9, unit: "per rental", maxQty: 1, active: true },
  ]);

  await db.insert(s.zones).values([
    { zoneKey: "zone-core", name: "Core Zone", fee: 0, description: "Midland, Auburn, Freeland — delivery included.", active: true },
    { zoneKey: "zone-2", name: "Zone 2", fee: 25, description: "Saginaw, Bay City, Sanford, Coleman — zone fee applies.", active: true },
    { zoneKey: "zone-3", name: "Zone 3", fee: 49, description: "Outer Great Lakes Bay Region — custom routes.", active: true },
  ]);
  const zoneRows = await db.select().from(s.zones);
  const zoneId = (key: string) => zoneRows.find((z) => z.zoneKey === key)!.id;
  const zipMap: Record<string, string[]> = {
    "zone-core": ["48640", "48641", "48642", "48611", "48623"],
    "zone-2": ["48601", "48602", "48603", "48604", "48607", "48609", "48638", "48706", "48708", "48657", "48618"],
    "zone-3": [],
  };
  for (const [key, zips] of Object.entries(zipMap)) {
    for (const zip of zips) {
      await db.insert(s.zoneZips).values({ zoneId: zoneId(key), zip });
    }
  }

  await db.insert(s.promos).values([
    { code: "FOUNDING10", percentOff: 10, active: true, usageLimit: 200, usedCount: 7 },
  ]);

  // --- Fleet & staff ---
  await db.insert(s.vehicles).values([
    { name: "Van 1 — Transit", capacityTotes: 60, active: true },
    { name: "Trailer 1 — 6x12", capacityTotes: 120, active: true },
  ]);
  await db.insert(s.drivers).values([
    { name: "Jason L.", phone: "(989) 555-0142", active: true },
    { name: "Mike R.", phone: "(989) 555-0177", active: true },
  ]);

  // --- Customers ---
  const customerSeed = [
    { firstName: "Sarah", lastName: "Connell", email: "sarah.connell@example.com", phone: "(989) 555-0101", accountType: "residential" as const, referralSource: "Google search" },
    { firstName: "Dan", lastName: "Miller", email: "dan.miller@example.com", phone: "(989) 555-0102", accountType: "residential" as const, referralSource: "Friend or family" },
    { firstName: "Priya", lastName: "Nair", email: "priya.nair@example.com", phone: "(989) 555-0103", accountType: "residential" as const, referralSource: "Realtor" },
    { firstName: "Tom", lastName: "Beaudoin", email: "tom@beaudoinproperties.com", phone: "(989) 555-0104", companyName: "Beaudoin Properties", accountType: "business" as const, referralSource: "Google search" },
    { firstName: "Alicia", lastName: "Gomez", email: "alicia.gomez@example.com", phone: "(989) 555-0105", accountType: "residential" as const, referralSource: "Social media" },
    { firstName: "Ken", lastName: "Ostrander", email: "ken.ostrander@example.com", phone: "(989) 555-0106", accountType: "residential" as const, referralSource: "Drove by / saw totes" },
    { firstName: "Melissa", lastName: "Hart", email: "melissa@hartrealty.com", phone: "(989) 555-0107", companyName: "Hart Realty Group", accountType: "business" as const, referralSource: "Realtor" },
    { firstName: "George", lastName: "Pappas", email: "george.pappas@example.com", phone: "(989) 555-0108", accountType: "residential" as const, referralSource: "Friend or family" },
  ];
  await db.insert(s.customers).values(customerSeed);
  const custRows = await db.select().from(s.customers);
  const custId = (email: string) => custRows.find((c) => c.email === email)!.id;

  // --- Reservations across the pipeline ---
  const addr = (street: string, city: string, zip: string) => ({ street, city, state: "MI", zip });
  const orderSeed = [
    { n: 1, cust: "sarah.connell@example.com", rentalType: "Moving", pkg: "Home", totes: 40, dollies: 2, status: "active" as const, del: d(-5), pick: d(9), dAddr: addr("412 Dartmouth Dr", "Midland", "48640"), pAddr: addr("2980 N Saginaw Rd", "Midland", "48640"), zoneKey: "zone-core", zoneFee: "0.00", subtotal: "169.00", discount: "16.90", tax: "9.13", total: "161.23", promo: "FOUNDING10", paymentOption: "full" as const, signed: true },
    { n: 2, cust: "dan.miller@example.com", rentalType: "Moving", pkg: "Apartment", totes: 20, dollies: 1, status: "active" as const, del: d(-2), pick: d(12), dAddr: addr("1500 Bayliss St Apt 3", "Midland", "48640"), pAddr: addr("1500 Bayliss St Apt 3", "Midland", "48640"), zoneKey: "zone-core", zoneFee: "0.00", subtotal: "99.00", discount: "0.00", tax: "5.94", total: "104.94", promo: null, paymentOption: "full" as const, signed: true },
    { n: 3, cust: "priya.nair@example.com", rentalType: "Moving", pkg: "Home", totes: 40, dollies: 2, status: "confirmed" as const, del: d(1), pick: d(15), dAddr: addr("720 E Main St", "Midland", "48640"), pAddr: addr("44 Wildwood Dr", "Freeland", "48623"), zoneKey: "zone-core", zoneFee: "0.00", subtotal: "184.00", discount: "0.00", tax: "11.04", total: "195.04", promo: null, paymentOption: "deposit" as const, signed: true },
    { n: 4, cust: "tom@beaudoinproperties.com", rentalType: "Office", pkg: "Estate or Office", totes: 100, dollies: 5, status: "confirmed" as const, del: d(3), pick: d(17), dAddr: addr("301 E Genesee Ave", "Saginaw", "48607"), pAddr: addr("301 E Genesee Ave", "Saginaw", "48607"), zoneKey: "zone-2", zoneFee: "25.00", subtotal: "349.00", discount: "0.00", tax: "22.44", total: "396.44", promo: null, paymentOption: "terms" as const, signed: true },
    { n: 5, cust: "alicia.gomez@example.com", rentalType: "Remodeling", pkg: "Large Home", totes: 60, dollies: 3, status: "pending" as const, del: d(4), pick: d(18), dAddr: addr("805 Washington St", "Bay City", "48708"), pAddr: addr("805 Washington St", "Bay City", "48708"), zoneKey: "zone-2", zoneFee: "25.00", subtotal: "219.00", discount: "21.90", tax: "13.33", total: "235.43", promo: "FOUNDING10", paymentOption: "full" as const, signed: false },
    { n: 6, cust: "ken.ostrander@example.com", rentalType: "Downsizing", pkg: "Home", totes: 40, dollies: 2, status: "pending" as const, del: d(6), pick: d(20), dAddr: addr("2290 S Poseyville Rd", "Midland", "48640"), pAddr: addr("510 Chippewa Trl", "Sanford", "48657"), zoneKey: "zone-2", zoneFee: "25.00", subtotal: "169.00", discount: "0.00", tax: "11.64", total: "205.64", promo: null, paymentOption: "deposit" as const, signed: false },
    { n: 7, cust: "melissa@hartrealty.com", rentalType: "Moving", pkg: "Apartment", totes: 20, dollies: 1, status: "confirmed" as const, del: d(2), pick: d(16), dAddr: addr("930 S Washington Ave", "Saginaw", "48601"), pAddr: addr("2210 Midland Rd", "Saginaw", "48603"), zoneKey: "zone-2", zoneFee: "25.00", subtotal: "99.00", discount: "0.00", tax: "7.44", total: "131.44", promo: null, paymentOption: "terms" as const, signed: true },
    { n: 8, cust: "george.pappas@example.com", rentalType: "Decluttering", pkg: "Quick Pack", totes: 12, dollies: 1, status: "completed" as const, del: d(-19), pick: d(-12), dAddr: addr("3101 Swede Ave", "Midland", "48642"), pAddr: addr("3101 Swede Ave", "Midland", "48642"), zoneKey: "zone-core", zoneFee: "0.00", subtotal: "69.00", discount: "0.00", tax: "4.14", total: "73.14", promo: null, paymentOption: "full" as const, signed: true },
    { n: 9, cust: "sarah.connell@example.com", rentalType: "Estate", pkg: "Estate or Office", totes: 100, dollies: 5, status: "completed" as const, del: d(-30), pick: d(-16), dAddr: addr("612 Wackerly St", "Midland", "48640"), pAddr: addr("612 Wackerly St", "Midland", "48640"), zoneKey: "zone-core", zoneFee: "0.00", subtotal: "349.00", discount: "34.90", tax: "18.85", total: "332.95", promo: "FOUNDING10", paymentOption: "full" as const, signed: true },
    { n: 10, cust: "dan.miller@example.com", rentalType: "Other", pkg: "Quick Pack", totes: 12, dollies: 1, status: "draft" as const, del: d(9), pick: d(16), dAddr: addr("1500 Bayliss St Apt 3", "Midland", "48640"), pAddr: addr("1500 Bayliss St Apt 3", "Midland", "48640"), zoneKey: "zone-core", zoneFee: "0.00", subtotal: "69.00", discount: "0.00", tax: "4.14", total: "73.14", promo: null, paymentOption: "full" as const, signed: false },
  ];

  for (const o of orderSeed) {
    await db.insert(s.reservations).values({
      orderNumber: ref("GLT", 1000 + o.n),
      customerId: custId(o.cust),
      rentalType: o.rentalType,
      packageSlug: o.pkg.toLowerCase().replace(/ /g, "-"),
      packageName: o.pkg,
      totes: o.totes,
      dollies: o.dollies,
      status: o.status,
      deliveryDate: o.del,
      pickupDate: o.pick,
      deliveryWindow: "Morning (8–11 AM)",
      pickupWindow: "Afternoon (2–5 PM)",
      deliveryAddress: o.dAddr,
      pickupAddress: o.pAddr,
      propertyType: "House",
      stairs: "No",
      elevator: "N/A",
      contactless: false,
      zoneKey: o.zoneKey,
      zoneFee: o.zoneFee,
      addOns: {},
      promoCode: o.promo ?? undefined,
      subtotal: o.subtotal,
      discount: o.discount,
      tax: o.tax,
      total: o.total,
      paymentOption: o.paymentOption,
      agreementSigned: o.signed,
      signedName: o.signed ? "On file" : null,
    });
  }
  const orderRows = await db.select().from(s.reservations);
  const orderId = (n: number) => orderRows.find((r) => r.orderNumber === ref("GLT", 1000 + n))!.id;

  // --- Dispatch stops for confirmed/active orders ---
  const vehicleRows = await db.select().from(s.vehicles);
  const driverRows = await db.select().from(s.drivers);
  const stopSeed = [
    { order: 3, type: "delivery" as const, date: d(1), window: "Morning (8–11 AM)", seq: 1 },
    { order: 7, type: "delivery" as const, date: d(2), window: "Morning (8–11 AM)", seq: 1 },
    { order: 4, type: "delivery" as const, date: d(3), window: "Morning (8–11 AM)", seq: 2 },
    { order: 5, type: "delivery" as const, date: d(4), window: "Midday (11 AM–2 PM)", seq: 3 },
    { order: 6, type: "delivery" as const, date: d(6), window: "Morning (8–11 AM)", seq: 1 },
    { order: 1, type: "pickup" as const, date: d(9), window: "Afternoon (2–5 PM)", seq: 1 },
    { order: 2, type: "pickup" as const, date: d(12), window: "Afternoon (2–5 PM)", seq: 2 },
  ];
  for (const st of stopSeed) {
    const order = orderRows.find((r) => r.id === orderId(st.order))!;
    await db.insert(s.dispatchStops).values({
      orderId: order.id,
      type: st.type,
      stopDate: st.date,
      window: st.window,
      address: st.type === "delivery" ? order.deliveryAddress : order.pickupAddress,
      status: "scheduled",
      driverId: driverRows[st.seq % driverRows.length].id,
      vehicleId: vehicleRows[st.seq % vehicleRows.length].id,
      sequence: st.seq,
    });
  }

  // --- Billing ---
  const invoiceSeed = [
    { n: 1, order: 8, status: "paid" as const, paid: "73.14", due: d(-19), paidAt: true },
    { n: 2, order: 9, status: "paid" as const, paid: "332.95", due: d(-30), paidAt: true },
    { n: 3, order: 1, status: "paid" as const, paid: "161.23", due: d(-5), paidAt: true },
    { n: 4, order: 2, status: "sent" as const, paid: "0.00", due: d(3), paidAt: false },
    { n: 5, order: 3, status: "sent" as const, paid: "48.76", due: d(1), paidAt: false },
    { n: 6, order: 4, status: "draft" as const, paid: "0.00", due: d(31), paidAt: false },
  ];
  for (const inv of invoiceSeed) {
    const order = orderRows.find((r) => r.id === orderId(inv.order))!;
    const [invoice] = await db.insert(s.invoices).values({
      invoiceNumber: ref("INV", 2000 + inv.n),
      orderId: order.id,
      customerId: order.customerId,
      status: inv.status,
      terms: order.paymentOption === "terms" ? "business-terms" as const : order.paymentOption === "deposit" ? "deposit" as const : "card" as const,
      amount: order.total,
      amountPaid: inv.paid,
      dueDate: inv.due,
      lineItems: [{ label: `${order.packageName} package rental`, amount: Number(order.subtotal) }],
    }).$returningId();
    if (Number(inv.paid) > 0) {
      await db.insert(s.payments).values({
        invoiceId: invoice.id,
        amount: inv.paid,
        method: inv.status === "paid" ? "card" : "card (deposit)",
        note: inv.status === "paid" ? "Paid in full" : "Deposit collected",
      });
    }
  }

  // --- Inventory assets ---
  const assets: s.InventoryAsset[] = [];
  const mk = (tag: string, type: "tote" | "dolly" | "hand-truck" | "blanket", status: "available" | "cleaning" | "out" | "damaged", order?: number): s.InventoryAsset => ({
    id: 0, assetTag: tag, type, status,
    conditionNote: status === "damaged" ? "Cracked lid hinge" : null,
    currentOrderId: order ?? null, lastInspectAt: null, createdAt: new Date(),
  });
  for (let i = 1; i <= 140; i++) {
    let status: "available" | "cleaning" | "out" | "damaged" = "available";
    let order: number | undefined;
    if (i <= 40) { status = "out"; order = Number(orderId(1)); }
    else if (i <= 60) { status = "out"; order = Number(orderId(2)); }
    else if (i <= 66) { status = "cleaning"; }
    else if (i === 67) { status = "damaged"; }
    assets.push(mk(`TOTE-${String(i).padStart(4, "0")}`, "tote", status, order));
  }
  for (let i = 1; i <= 14; i++) {
    const out = i <= 3;
    assets.push(mk(`DOLLY-${String(i).padStart(3, "0")}`, "dolly", out ? "out" : i === 4 ? "cleaning" : "available", out ? Number(orderId(1)) : undefined));
  }
  for (let i = 1; i <= 4; i++) assets.push(mk(`HT-${String(i).padStart(3, "0")}`, "hand-truck", "available"));
  for (let i = 1; i <= 24; i++) assets.push(mk(`BLK-${String(i).padStart(3, "0")}`, "blanket", i <= 6 ? "out" : "available", i <= 6 ? Number(orderId(2)) : undefined));
  for (const a of assets) {
    const { id: _id, ...row } = a;
    await db.insert(s.inventoryAssets).values(row);
  }

  // --- Inquiries ---
  await db.insert(s.leads).values([
    { reference: ref("LEAD", 3001), type: "contact", name: "Julie Sanders", email: "julie.sanders@example.com", phone: "(989) 555-0110", message: "Do you deliver to Sanford? Planning a move in about three weeks.", status: "new" },
    { reference: ref("LEAD", 3002), type: "business-account", name: "Rachel Kim", email: "rachel@lakesidepm.com", company: "Lakeside Property Management", phone: "(989) 555-0111", message: "We manage 300+ units across Saginaw Township. Interested in recurring rentals for apartment turnovers.", status: "contacted" },
    { reference: ref("LEAD", 3003), type: "custom-quote", name: "Bill Thompson", email: "bill.t@example.com", phone: "(989) 555-0112", message: "Moving from Mount Pleasant to Midland — is that inside your Zone 3?", status: "new" },
    { reference: ref("LEAD", 3004), type: "referral", name: "Hart Realty Group", email: "melissa@hartrealty.com", company: "Hart Realty Group", message: "Would like to set up a referral arrangement for our staging clients.", status: "qualified" },
    { reference: ref("LEAD", 3005), type: "order-support", name: "Dan Miller", email: "dan.miller@example.com", orderNumber: "GLT-01002", message: "Can I add 5 extra totes to my current rental?", status: "converted" },
    { reference: ref("LEAD", 3006), type: "outside-area", name: "Carol Niedzwiecki", email: "carol.n@example.com", phone: "(989) 555-0113", message: "Estate cleanout in Gladwin — two weekends. Possible?", status: "new" },
    { reference: ref("LEAD", 3007), type: "contact", name: "Sam Wright", email: "sam.wright@example.com", message: "What are the tote dimensions? Need to know if they fit in my SUV.", status: "closed" },
    { reference: ref("LEAD", 3008), type: "business-account", name: "Revive Restoration", email: "dispatch@reviverestoration.com", company: "Revive Restoration", phone: "(989) 555-0114", message: "Need 100+ totes on call for pack-outs. Monthly invoicing a must.", status: "qualified" },
  ]);

  // --- Content ---
  await db.insert(s.announcements).values([
    { message: "Founding customer pricing available for a limited time — now booking moves in Midland, Saginaw, and Bay City", status: "published" },
  ]);
  await db.insert(s.faqs).values([
    { category: "Reservations", question: "How many totes do I need?", answer: "A studio or dorm fits the 12-tote Quick Pack; a one-bedroom the 20-tote Apartment; most 2–3 bedroom homes the 40-tote Home; larger homes the 60-tote Large Home; offices and estates the 100-tote package.", sortOrder: 1, status: "published" },
    { category: "Reservations", question: "Do you move my belongings?", answer: "No. We rent and deliver reusable moving equipment only. You pack and move with your own vehicle or moving company.", sortOrder: 2, status: "published" },
    { category: "Delivery & Pickup", question: "Can you deliver and pick up at different addresses?", answer: "Yes — both addresses must be within our approved service area. Zone charges may apply.", sortOrder: 3, status: "published" },
  ]);
  await db.insert(s.testimonials).values([
    { name: "Sample Customer", city: "Midland", reviewText: "Sample review — totes dropped off two days before our move and picked up from the new house.", rating: 5, source: "Sample content", featured: true, sample: true, status: "published" },
    { name: "Sample Customer", city: "Saginaw", reviewText: "Sample review — the dolly made elevator trips easy for our one-bedroom move.", rating: 5, source: "Sample content", featured: true, sample: true, status: "published" },
  ]);

  console.log("Done.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
