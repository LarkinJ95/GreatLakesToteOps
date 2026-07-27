-- 0005_agreements.sql — agreement templates, versions, agreements, acceptances
CREATE TABLE agreement_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN (
    'standard_residential','business_account','custom_project','equipment_amendment',
    'extension_amendment','damage_acknowledgment','contactless_authorization')),
  jurisdiction TEXT NOT NULL DEFAULT 'MI',
  customer_type TEXT NOT NULL DEFAULT 'residential' CHECK (customer_type IN ('residential','business','any')),
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE agreement_template_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES agreement_templates(id),
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','active','retired')),
  effective_date TEXT,
  expiration_date TEXT,
  html_body TEXT NOT NULL,
  print_css TEXT,
  created_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  approved_at TEXT,
  UNIQUE (template_id, version)
);
-- only one active version per template
CREATE UNIQUE INDEX uq_template_active_version ON agreement_template_versions(template_id) WHERE status = 'active';

CREATE TABLE agreements (
  id TEXT PRIMARY KEY,
  agreement_number TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES orders(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  template_id TEXT NOT NULL REFERENCES agreement_templates(id),
  template_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','generated','sent','viewed','accepted','declined','expired','superseded','voided')),
  snapshot_json TEXT NOT NULL,      -- immutable order/customer/pricing snapshot
  rendered_html TEXT,               -- server-rendered review HTML (escaped merge fields)
  html_checksum TEXT NOT NULL,
  unsigned_pdf_document_id TEXT,
  signed_pdf_document_id TEXT,
  sent_at TEXT, viewed_at TEXT, accepted_at TEXT, declined_at TEXT,
  expires_at TEXT, superseded_at TEXT, voided_at TEXT,
  decline_reason TEXT,
  acceptance_ip TEXT,
  acceptance_device_info TEXT,
  customer_signature_document_id TEXT,
  company_signature_document_id TEXT,
  verification_code TEXT NOT NULL,
  portal_token_hash TEXT UNIQUE,    -- secure review link (SHA-256 of token)
  portal_token_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_agreements_order ON agreements(order_id);
CREATE INDEX idx_agreements_status ON agreements(status);
CREATE INDEX idx_agreements_customer ON agreements(customer_id);

CREATE TABLE agreement_acceptances (
  id TEXT PRIMARY KEY,
  agreement_id TEXT NOT NULL UNIQUE REFERENCES agreements(id), -- one acceptance, immutable
  customer_name_typed TEXT NOT NULL,
  signature_document_id TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  ip_address TEXT,
  device_info TEXT,
  template_version INTEGER NOT NULL,
  html_checksum TEXT NOT NULL,
  order_snapshot_json TEXT NOT NULL,
  checkbox_values_json TEXT NOT NULL,
  authority_confirmed INTEGER NOT NULL DEFAULT 0,
  verification_code TEXT NOT NULL,
  created_at TEXT NOT NULL
);
