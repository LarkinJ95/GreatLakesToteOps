import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  boolean,
  bigint,
  json,
  decimal,
  date,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export const customers = mysqlTable("customers", {
  id: serial("id").primaryKey(),
  firstName: varchar("firstName", { length: 120 }).notNull(),
  lastName: varchar("lastName", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  companyName: varchar("companyName", { length: 255 }),
  accountType: mysqlEnum("accountType", ["residential", "business"]).default("residential").notNull(),
  referralSource: varchar("referralSource", { length: 120 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
export type Customer = typeof customers.$inferSelect;

// ---------------------------------------------------------------------------
// Inquiries (leads inbox)
// ---------------------------------------------------------------------------

export const leads = mysqlTable("leads", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 40 }).notNull().unique(),
  type: mysqlEnum("type", [
    "contact",
    "business-account",
    "custom-quote",
    "outside-area",
    "referral",
    "order-support",
  ]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  company: varchar("company", { length: 255 }),
  message: text("message"),
  orderNumber: varchar("orderNumber", { length: 40 }),
  payload: json("payload"),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "closed", "spam"]).default("new").notNull(),
  internalNote: text("internalNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
export type Lead = typeof leads.$inferSelect;

// ---------------------------------------------------------------------------
// Catalog: packages, add-ons, zones, promos
// ---------------------------------------------------------------------------

export const packages = mysqlTable("packages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 60 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  totes: int("totes").notNull(),
  dollies: int("dollies").notNull(),
  rentalDays: int("rentalDays").notNull(),
  launchPrice: int("launchPrice").notNull(),
  standardPrice: int("standardPrice").notNull(),
  extraWeekPrice: int("extraWeekPrice").notNull(),
  bestFor: varchar("bestFor", { length: 255 }),
  featured: boolean("featured").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  launchPricingActive: boolean("launchPricingActive").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
export type Package = typeof packages.$inferSelect;

export const addons = mysqlTable("addons", {
  id: serial("id").primaryKey(),
  addonKey: varchar("addonKey", { length: 60 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: varchar("description", { length: 255 }),
  price: int("price").notNull(),
  unit: varchar("unit", { length: 60 }),
  maxQty: int("maxQty").default(4).notNull(),
  active: boolean("active").default(true).notNull(),
});
export type Addon = typeof addons.$inferSelect;

export const zones = mysqlTable("zones", {
  id: serial("id").primaryKey(),
  zoneKey: varchar("zoneKey", { length: 60 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  fee: int("fee").default(0).notNull(),
  description: varchar("description", { length: 255 }),
  active: boolean("active").default(true).notNull(),
});
export type Zone = typeof zones.$inferSelect;

export const zoneZips = mysqlTable("zone_zips", {
  id: serial("id").primaryKey(),
  zoneId: bigint("zoneId", { mode: "number", unsigned: true }).notNull(),
  zip: varchar("zip", { length: 10 }).notNull(),
  cityName: varchar("cityName", { length: 120 }),
});

export const promos = mysqlTable("promos", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  percentOff: int("percentOff").notNull(),
  active: boolean("active").default(true).notNull(),
  startsAt: date("startsAt", { mode: "string" }),
  endsAt: date("endsAt", { mode: "string" }),
  usageLimit: int("usageLimit"),
  usedCount: int("usedCount").default(0).notNull(),
});
export type Promo = typeof promos.$inferSelect;

// ---------------------------------------------------------------------------
// Quotes (pricing snapshots) & reservations (orders)
// ---------------------------------------------------------------------------

export const quotes = mysqlTable("quotes", {
  id: serial("id").primaryKey(),
  quoteRef: varchar("quoteRef", { length: 40 }).notNull().unique(),
  packageSlug: varchar("packageSlug", { length: 60 }).notNull(),
  zoneId: bigint("zoneId", { mode: "number", unsigned: true }),
  addOns: json("addOns"),
  promoCode: varchar("promoCode", { length: 40 }),
  lines: json("lines"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  zoneFee: decimal("zoneFee", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Quote = typeof quotes.$inferSelect;

export const reservations = mysqlTable("reservations", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("orderNumber", { length: 40 }).notNull().unique(),
  customerId: bigint("customerId", { mode: "number", unsigned: true }).notNull(),
  quoteId: bigint("quoteId", { mode: "number", unsigned: true }),
  rentalType: varchar("rentalType", { length: 60 }).notNull(),
  packageSlug: varchar("packageSlug", { length: 60 }).notNull(),
  packageName: varchar("packageName", { length: 120 }).notNull(),
  totes: int("totes").notNull(),
  dollies: int("dollies").notNull(),
  status: mysqlEnum("status", ["draft", "pending", "confirmed", "active", "completed", "cancelled"]).default("draft").notNull(),
  deliveryDate: date("deliveryDate", { mode: "string" }).notNull(),
  pickupDate: date("pickupDate", { mode: "string" }).notNull(),
  deliveryWindow: varchar("deliveryWindow", { length: 60 }),
  pickupWindow: varchar("pickupWindow", { length: 60 }),
  deliveryAddress: json("deliveryAddress").notNull(),
  pickupAddress: json("pickupAddress").notNull(),
  propertyType: varchar("propertyType", { length: 60 }),
  stairs: varchar("stairs", { length: 60 }),
  elevator: varchar("elevator", { length: 20 }),
  accessNotes: text("accessNotes"),
  contactless: boolean("contactless").default(false).notNull(),
  zoneKey: varchar("zoneKey", { length: 60 }),
  zoneFee: decimal("zoneFee", { precision: 10, scale: 2 }).default("0").notNull(),
  addOns: json("addOns"),
  promoCode: varchar("promoCode", { length: 40 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0").notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentOption: mysqlEnum("paymentOption", ["deposit", "full", "terms"]).default("full").notNull(),
  agreementSigned: boolean("agreementSigned").default(false).notNull(),
  signedName: varchar("signedName", { length: 255 }),
  internalNotes: text("internalNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
export type Reservation = typeof reservations.$inferSelect;

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export const vehicles = mysqlTable("vehicles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  capacityTotes: int("capacityTotes").notNull(),
  active: boolean("active").default(true).notNull(),
});

export const drivers = mysqlTable("drivers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  active: boolean("active").default(true).notNull(),
});

export const dispatchStops = mysqlTable("dispatch_stops", {
  id: serial("id").primaryKey(),
  orderId: bigint("orderId", { mode: "number", unsigned: true }).notNull(),
  type: mysqlEnum("type", ["delivery", "pickup"]).notNull(),
  stopDate: date("stopDate", { mode: "string" }).notNull(),
  window: varchar("window", { length: 60 }),
  address: json("address").notNull(),
  status: mysqlEnum("status", ["scheduled", "en-route", "completed", "issue", "skipped"]).default("scheduled").notNull(),
  driverId: bigint("driverId", { mode: "number", unsigned: true }),
  vehicleId: bigint("vehicleId", { mode: "number", unsigned: true }),
  sequence: int("sequence").default(0).notNull(),
  notes: text("notes"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DispatchStop = typeof dispatchStops.$inferSelect;

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export const invoices = mysqlTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 40 }).notNull().unique(),
  orderId: bigint("orderId", { mode: "number", unsigned: true }).notNull(),
  customerId: bigint("customerId", { mode: "number", unsigned: true }).notNull(),
  status: mysqlEnum("status", ["draft", "sent", "paid", "overdue", "void"]).default("draft").notNull(),
  terms: mysqlEnum("terms", ["card", "deposit", "business-terms"]).default("card").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }).default("0").notNull(),
  dueDate: date("dueDate", { mode: "string" }),
  lineItems: json("lineItems"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  paidAt: timestamp("paidAt"),
});
export type Invoice = typeof invoices.$inferSelect;

export const payments = mysqlTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: bigint("invoiceId", { mode: "number", unsigned: true }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: varchar("method", { length: 60 }).notNull(),
  note: varchar("note", { length: 255 }),
  paidAt: timestamp("paidAt").defaultNow().notNull(),
});
export type Payment = typeof payments.$inferSelect;

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export const inventoryAssets = mysqlTable("inventory_assets", {
  id: serial("id").primaryKey(),
  assetTag: varchar("assetTag", { length: 40 }).notNull().unique(),
  type: mysqlEnum("type", ["tote", "dolly", "hand-truck", "blanket"]).notNull(),
  status: mysqlEnum("status", ["available", "cleaning", "out", "damaged", "retired"]).default("available").notNull(),
  conditionNote: varchar("conditionNote", { length: 255 }),
  currentOrderId: bigint("currentOrderId", { mode: "number", unsigned: true }),
  lastInspectAt: timestamp("lastInspectAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type InventoryAsset = typeof inventoryAssets.$inferSelect;

// ---------------------------------------------------------------------------
// Marketing content (admin-managed)
// ---------------------------------------------------------------------------

export const announcements = mysqlTable("announcements", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["draft", "scheduled", "published", "archived"]).default("draft").notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const faqs = mysqlTable("faqs", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 80 }).notNull(),
  question: varchar("question", { length: 255 }).notNull(),
  answer: text("answer").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("published").notNull(),
});

export const testimonials = mysqlTable("testimonials", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  city: varchar("city", { length: 120 }),
  reviewText: text("reviewText").notNull(),
  rating: int("rating").notNull(),
  source: varchar("source", { length: 120 }),
  reviewDate: date("reviewDate", { mode: "string" }),
  featured: boolean("featured").default(false).notNull(),
  sample: boolean("sample").default(false).notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
});

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export const auditLog = mysqlTable("audit_log", {
  id: serial("id").primaryKey(),
  actorUserId: bigint("actorUserId", { mode: "number", unsigned: true }),
  actorName: varchar("actorName", { length: 255 }),
  action: varchar("action", { length: 120 }).notNull(),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityRef: varchar("entityRef", { length: 60 }),
  detail: json("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditEntry = typeof auditLog.$inferSelect;
