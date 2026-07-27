-- 0002_crm.sql — customers, addresses, business accounts, referral partners
CREATE TABLE referral_partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  contact_name TEXT, contact_email TEXT, contact_phone TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  customer_number TEXT NOT NULL UNIQUE,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('residential','business')),
  first_name TEXT,
  last_name TEXT,
  business_name TEXT,
  primary_phone TEXT,
  secondary_phone TEXT,
  email TEXT,
  billing_address_id TEXT,
  notes TEXT,
  marketing_consent INTEGER NOT NULL DEFAULT 0,
  referral_source TEXT,
  referral_partner_id TEXT REFERENCES referral_partners(id),
  tax_exempt INTEGER NOT NULL DEFAULT 0,
  tax_exemption_document_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (customer_type = 'business' OR (first_name IS NOT NULL AND last_name IS NOT NULL))
);
CREATE INDEX idx_customers_name ON customers(last_name, first_name);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(primary_phone);

CREATE TABLE customer_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  label TEXT NOT NULL DEFAULT 'Primary',
  street TEXT NOT NULL,
  unit TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'MI',
  zip TEXT NOT NULL,
  county TEXT,
  latitude REAL,
  longitude REAL,
  gate_code TEXT,
  parking_instructions TEXT,
  stair_info TEXT,
  elevator_info TEXT,
  delivery_notes TEXT,
  contactless_allowed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX idx_addresses_city ON customer_addresses(city, state);

CREATE TABLE business_accounts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL UNIQUE REFERENCES customers(id),
  account_number TEXT NOT NULL UNIQUE,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('pending','active','suspended','closed')),
  negotiated_pricing_rule_id TEXT,
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  credit_limit_cents INTEGER NOT NULL DEFAULT 0 CHECK (credit_limit_cents >= 0),
  purchase_order_required INTEGER NOT NULL DEFAULT 0,
  tax_exempt INTEGER NOT NULL DEFAULT 0,
  billing_contact TEXT,
  billing_email TEXT,
  statement_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (statement_frequency IN ('weekly','monthly','quarterly')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
