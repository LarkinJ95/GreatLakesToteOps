-- 0003_catalog.sql — packages, pricing, zones, taxes, settings, numbering
CREATE TABLE rental_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tote_quantity INTEGER NOT NULL CHECK (tote_quantity >= 0),
  dolly_quantity INTEGER NOT NULL DEFAULT 0 CHECK (dolly_quantity >= 0),
  included_rental_days INTEGER NOT NULL CHECK (included_rental_days > 0),
  launch_price_cents INTEGER NOT NULL CHECK (launch_price_cents >= 0),
  standard_price_cents INTEGER NOT NULL CHECK (standard_price_cents >= 0),
  extra_day_price_cents INTEGER NOT NULL DEFAULT 0,
  extra_week_price_cents INTEGER NOT NULL DEFAULT 0,
  effective_date TEXT NOT NULL,
  expiration_date TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  is_custom INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE pricing_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('discount_percent','discount_amount','custom_price','zone_fee_override')),
  value_cents INTEGER,
  percent REAL,
  package_id TEXT REFERENCES rental_packages(id),
  business_account_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE service_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cities TEXT NOT NULL, -- comma-separated city list
  zone_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (zone_fee_cents >= 0),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tax_jurisdictions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'MI',
  county TEXT,
  city TEXT,
  rate_percent REAL NOT NULL CHECK (rate_percent >= 0),
  applies_to_rental INTEGER NOT NULL DEFAULT 1,
  applies_to_delivery INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE app_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

-- Collision-resistant document numbering: one row per (doc type, year)
CREATE TABLE document_counters (
  doc_type TEXT NOT NULL,
  year INTEGER NOT NULL,
  next_value INTEGER NOT NULL DEFAULT 1 CHECK (next_value > 0),
  PRIMARY KEY (doc_type, year)
);
