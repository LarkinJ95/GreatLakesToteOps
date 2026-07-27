-- Public marketing API: content/pricing data kept separate from staff auth.
-- These tables are intentionally additive so the operational catalog remains valid.
CREATE TABLE service_zone_zips (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES service_zones(id),
  city_name TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  zip TEXT NOT NULL UNIQUE,
  blurb TEXT NOT NULL DEFAULT '',
  local_tips_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_service_zone_zips_zone ON service_zone_zips(zone_id);

CREATE TABLE public_addons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  active INTEGER NOT NULL DEFAULT 1,
  max_quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE promotional_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value INTEGER NOT NULL CHECK (discount_value >= 0),
  active INTEGER NOT NULL DEFAULT 1,
  starts_at TEXT,
  ends_at TEXT,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE public_quote_snapshots (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES rental_packages(id),
  zone_id TEXT REFERENCES service_zones(id),
  promo_code_id TEXT REFERENCES promotional_codes(id),
  subtotal_cents INTEGER NOT NULL,
  zone_fee_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE availability_inquiries (
  id TEXT PRIMARY KEY,
  package_slug TEXT NOT NULL,
  delivery_date TEXT,
  pickup_date TEXT,
  delivery_zip TEXT,
  result_status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE public_leads (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  lead_type TEXT NOT NULL,
  pipeline_status TEXT NOT NULL DEFAULT 'new',
  payload_json TEXT NOT NULL,
  consent INTEGER NOT NULL DEFAULT 0,
  source_page TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_public_leads_pipeline ON public_leads(pipeline_status, created_at);

INSERT OR IGNORE INTO public_addons (id, name, price_cents, active, max_quantity, created_at, updated_at) VALUES
('addon-totes-5','Extra totes (5-pack)',1500,1,8,datetime('now'),datetime('now')),
('addon-dolly','Extra dolly',1200,1,4,datetime('now'),datetime('now')),
('addon-hand-truck','Hand truck',1400,1,2,datetime('now'),datetime('now')),
('addon-blankets','Moving blankets (6-pack)',1800,1,4,datetime('now'),datetime('now')),
('addon-qr-kit','QR label kit',900,1,1,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO promotional_codes (id, code, discount_type, discount_value, active, created_at, updated_at)
VALUES ('promo_founding10','FOUNDING10','percent',10,1,datetime('now'),datetime('now'));

INSERT OR IGNORE INTO service_zone_zips (id,zone_id,city_name,city_slug,zip,blurb,local_tips_json,created_at,updated_at) VALUES
('szz_midland_48640','zone_1_midland','Midland','midland','48640','Midland is in our Core Zone.','[]',datetime('now'),datetime('now')),
('szz_midland_48641','zone_1_midland','Midland','midland','48641','Midland is in our Core Zone.','[]',datetime('now'),datetime('now')),
('szz_midland_48642','zone_1_midland','Midland','midland','48642','Midland is in our Core Zone.','[]',datetime('now'),datetime('now')),
('szz_auburn','zone_1_midland','Auburn','auburn','48611','Auburn is in our Core Zone.','[]',datetime('now'),datetime('now')),
('szz_freeland','zone_1_midland','Freeland','freeland','48623','Freeland is in our Core Zone.','[]',datetime('now'),datetime('now')),
('szz_saginaw_48601','zone_2_saginaw_bay','Saginaw','saginaw','48601','Saginaw is on our Zone 2 route.','[]',datetime('now'),datetime('now')),
('szz_saginaw_48602','zone_2_saginaw_bay','Saginaw','saginaw','48602','Saginaw is on our Zone 2 route.','[]',datetime('now'),datetime('now')),
('szz_saginaw_48603','zone_2_saginaw_bay','Saginaw','saginaw','48603','Saginaw is on our Zone 2 route.','[]',datetime('now'),datetime('now')),
('szz_baycity','zone_2_saginaw_bay','Bay City','bay-city','48708','Bay City is on our Zone 2 route.','[]',datetime('now'),datetime('now')),
('szz_sanford','zone_2_saginaw_bay','Sanford','sanford','48657','Sanford is on our Zone 2 route.','[]',datetime('now'),datetime('now')),
('szz_coleman','zone_2_saginaw_bay','Coleman','coleman','48618','Coleman is on our Zone 2 route.','[]',datetime('now'),datetime('now'));
