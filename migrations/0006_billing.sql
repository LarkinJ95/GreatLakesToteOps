-- 0006_billing.sql — quotes, invoices, payments, refunds, credit memos, statements
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  quote_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  business_account_id TEXT REFERENCES business_accounts(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','declined','expired','converted')),
  package_id TEXT REFERENCES rental_packages(id),
  rental_start_date TEXT,
  rental_days INTEGER,
  delivery_address_id TEXT REFERENCES customer_addresses(id),
  pickup_address_id TEXT REFERENCES customer_addresses(id),
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  pricing_snapshot_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  approved_at TEXT, declined_at TEXT,
  decline_reason TEXT,
  converted_order_id TEXT,
  pdf_document_id TEXT,
  verification_code TEXT NOT NULL,
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);

CREATE TABLE quote_line_items (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id),
  line_order INTEGER NOT NULL,
  item_type TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'each',
  unit_price_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  taxable INTEGER NOT NULL DEFAULT 1,
  tax_rate_percent REAL NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  line_total_cents INTEGER NOT NULL
);
CREATE INDEX idx_quote_lines ON quote_line_items(quote_id);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN (
    'standard','deposit','final_rental','business_account','damage','missing_equipment',
    'extension','failed_pickup','monthly_consolidated','credit_memo','receipt','refund_receipt')),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  business_account_id TEXT REFERENCES business_accounts(id),
  order_id TEXT REFERENCES orders(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','pending_approval','finalized','sent','partially_paid','paid',
    'overdue','disputed','voided','written_off')),
  issue_date TEXT NOT NULL,
  due_date TEXT,
  service_date TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_total_cents INTEGER NOT NULL DEFAULT 0,
  taxable_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_total_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  credit_total_cents INTEGER NOT NULL DEFAULT 0,
  balance_due_cents INTEGER NOT NULL DEFAULT 0,
  payment_terms TEXT,
  purchase_order_number TEXT,
  customer_billing_snapshot_json TEXT NOT NULL,
  company_snapshot_json TEXT NOT NULL,
  tax_snapshot_json TEXT,
  notes TEXT,
  internal_notes TEXT,
  finalized_at TEXT,
  voided_at TEXT,
  superseded_invoice_id TEXT,
  pdf_document_id TEXT,
  verification_code TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date);
CREATE INDEX idx_invoices_order ON invoices(order_id);
CREATE INDEX idx_invoices_account ON invoices(business_account_id, issue_date);

CREATE TABLE invoice_line_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  line_order INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'package_rental','extra_tote','extra_day','extra_week','delivery_zone','access_fee',
    'hand_truck_rental','blanket_rental','qr_label_kit','failed_pickup','redelivery',
    'cleaning','repair','missing_equipment','damaged_equipment','discount','credit','custom')),
  description TEXT NOT NULL,
  service_date TEXT,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'each',
  unit_price_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  taxable INTEGER NOT NULL DEFAULT 1,
  tax_rate_percent REAL NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  line_subtotal_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL,
  related_asset_id TEXT,
  related_assignment_id TEXT,
  related_damage_report_id TEXT
);
CREATE INDEX idx_invoice_lines ON invoice_line_items(invoice_id);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  order_id TEXT REFERENCES orders(id),
  invoice_id TEXT REFERENCES invoices(id),
  provider TEXT NOT NULL DEFAULT 'manual' CHECK (provider IN ('stripe','manual','check','ach','cash')),
  provider_transaction_id TEXT,
  payment_method_type TEXT NOT NULL DEFAULT 'card' CHECK (payment_method_type IN ('card','ach','check','cash','account_terms','other')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  tax_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('pending','authorized','succeeded','failed','refunded','partially_refunded','disputed')),
  authorization_amount_cents INTEGER,
  captured_amount_cents INTEGER,
  refunded_amount_cents INTEGER NOT NULL DEFAULT 0,
  failure_code TEXT,
  dispute_status TEXT,
  receipt_document_id TEXT,
  received_at TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  UNIQUE (provider, provider_transaction_id)
);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);

CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  refund_number TEXT NOT NULL UNIQUE,
  payment_id TEXT NOT NULL REFERENCES payments(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  reason TEXT NOT NULL,
  provider_refund_id TEXT,
  receipt_document_id TEXT,
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('pending','succeeded','failed')),
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE credit_memos (
  id TEXT PRIMARY KEY,
  credit_memo_number TEXT NOT NULL UNIQUE,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','applied','rejected')),
  total_credit_cents INTEGER NOT NULL CHECK (total_credit_cents > 0),
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  pdf_document_id TEXT,
  verification_code TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE credit_memo_line_items (
  id TEXT PRIMARY KEY,
  credit_memo_id TEXT NOT NULL REFERENCES credit_memos(id),
  line_order INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL,
  credit_cents INTEGER NOT NULL CHECK (credit_cents > 0),
  tax_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE statements (
  id TEXT PRIMARY KEY,
  business_account_id TEXT NOT NULL REFERENCES business_accounts(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  opening_balance_cents INTEGER NOT NULL,
  closing_balance_cents INTEGER NOT NULL,
  past_due_cents INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL, -- invoices, payments, credits, adjustments for the period
  pdf_document_id TEXT,
  generated_at TEXT NOT NULL,
  UNIQUE (business_account_id, year, month)
);
