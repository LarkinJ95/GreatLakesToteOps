-- 0004_operations.sql — orders, assets, scans, assignments, routes, vehicles, cleaning, damage, audits
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  business_account_id TEXT REFERENCES business_accounts(id),
  order_status TEXT NOT NULL DEFAULT 'inquiry' CHECK (order_status IN (
    'inquiry','quote','awaiting_customer_approval','awaiting_agreement','awaiting_payment',
    'confirmed','equipment_reserved','staged','delivery_assigned','out_for_delivery',
    'delivered','active_rental','pickup_scheduled','pickup_assigned','picked_up',
    'equipment_reconciliation','cleaning','final_invoice_review','completed','closed',
    'cancelled','rescheduled','delivery_failed','pickup_failed','late_rental',
    'missing_equipment','damage_review','agreement_declined','agreement_expired','payment_dispute')),
  package_id TEXT REFERENCES rental_packages(id),
  rental_start_date TEXT,
  scheduled_delivery_date TEXT,
  scheduled_pickup_date TEXT,
  actual_delivery_at TEXT,
  actual_pickup_at TEXT,
  delivery_address_id TEXT REFERENCES customer_addresses(id),
  pickup_address_id TEXT REFERENCES customer_addresses(id),
  sales_channel TEXT DEFAULT 'office',
  referral_code TEXT,
  purchase_order_number TEXT,
  -- immutable pricing snapshots (cents)
  base_rental_cents INTEGER NOT NULL DEFAULT 0,
  zone_fee_cents INTEGER NOT NULL DEFAULT 0,
  access_fee_cents INTEGER NOT NULL DEFAULT 0,
  add_on_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  amount_credited_cents INTEGER NOT NULL DEFAULT 0,
  balance_due_cents INTEGER NOT NULL DEFAULT 0,
  pricing_snapshot_json TEXT, -- package name, prices, rates at time of quote/order
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partially_paid','paid','refunded','terms')),
  agreement_status TEXT NOT NULL DEFAULT 'none' CHECK (agreement_status IN ('none','pending','sent','viewed','accepted','declined','expired','superseded')),
  current_agreement_id TEXT,
  requires_agreement INTEGER NOT NULL DEFAULT 1,
  internal_notes TEXT,
  customer_notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_delivery ON orders(scheduled_delivery_date);
CREATE INDEX idx_orders_pickup ON orders(scheduled_pickup_date);
CREATE INDEX idx_orders_account ON orders(business_account_id);

CREATE TABLE order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  override_by TEXT REFERENCES users(id),
  changed_by TEXT REFERENCES users(id),
  changed_at TEXT NOT NULL
);
CREATE INDEX idx_order_history ON order_status_history(order_id, changed_at);

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  unit_number TEXT NOT NULL UNIQUE,
  asset_number TEXT UNIQUE,
  year INTEGER, make TEXT, model TEXT,
  vin TEXT, license_plate TEXT,
  cargo_capacity_cuft INTEGER,
  max_tote_capacity INTEGER NOT NULL DEFAULT 60,
  active INTEGER NOT NULL DEFAULT 1,
  assigned_driver_id TEXT REFERENCES users(id),
  branch_id TEXT REFERENCES branches(id),
  mileage INTEGER DEFAULT 0,
  insurance_expiration TEXT,
  registration_expiration TEXT,
  inspection_status TEXT DEFAULT 'current',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE routes (
  id TEXT PRIMARY KEY,
  route_date TEXT NOT NULL,
  driver_id TEXT REFERENCES users(id),
  vehicle_id TEXT REFERENCES vehicles(id),
  branch_id TEXT REFERENCES branches(id),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
  estimated_miles REAL,
  estimated_minutes INTEGER,
  optimized INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_routes_date ON routes(route_date, driver_id);

CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  assignment_number TEXT NOT NULL UNIQUE,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN (
    'delivery','pickup','swap','redelivery','failed_pickup_followup',
    'inventory_transfer','warehouse_task','cleaning_task','repair_task')),
  order_id TEXT REFERENCES orders(id),
  assigned_employee_id TEXT REFERENCES users(id),
  vehicle_id TEXT REFERENCES vehicles(id),
  scheduled_date TEXT NOT NULL,
  window_start TEXT,
  window_end TEXT,
  route_id TEXT REFERENCES routes(id),
  route_order INTEGER,
  priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','en_route','arrived','in_progress','completed','failed','cancelled')),
  address_id TEXT REFERENCES customer_addresses(id),
  arrival_at TEXT, departure_at TEXT,
  arrival_latitude REAL, arrival_longitude REAL,
  completion_latitude REAL, completion_longitude REAL,
  completion_notes TEXT,
  customer_signature_document_id TEXT,
  failed_reason TEXT,
  branch_id TEXT REFERENCES branches(id),
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_assignments_employee ON assignments(assigned_employee_id, scheduled_date);
CREATE INDEX idx_assignments_order ON assignments(order_id);
CREATE INDEX idx_assignments_route ON assignments(route_id, route_order);
CREATE INDEX idx_assignments_status ON assignments(status);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  asset_number TEXT NOT NULL UNIQUE,
  qr_code_value TEXT NOT NULL UNIQUE,
  barcode_value TEXT UNIQUE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('tote','dolly','hand_truck','blanket_pack','trailer','vehicle','other')),
  manufacturer TEXT, model TEXT, color TEXT,
  purchase_date TEXT,
  purchase_cost_cents INTEGER DEFAULT 0,
  replacement_cost_cents INTEGER NOT NULL DEFAULT 0,
  branch_id TEXT REFERENCES branches(id),
  storage_location_id TEXT REFERENCES storage_locations(id),
  current_status TEXT NOT NULL DEFAULT 'new' CHECK (current_status IN (
    'new','clean_inventory','reserved','staged','loaded','out_for_delivery','delivered',
    'rented','pickup_scheduled','picked_up','dirty_return','cleaning','inspection_required',
    'quarantine','repair_required','missing','damaged','retired')),
  current_condition TEXT NOT NULL DEFAULT 'good' CHECK (current_condition IN ('excellent','good','fair','poor','damaged')),
  current_order_id TEXT,
  current_customer_id TEXT,
  current_assignment_id TEXT,
  current_vehicle_id TEXT,
  last_scan_at TEXT,
  last_cleaned_at TEXT,
  last_inspected_at TEXT,
  total_rental_count INTEGER NOT NULL DEFAULT 0,
  total_days_rented INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  retired_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_assets_status ON assets(current_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_location ON assets(branch_id, storage_location_id);
CREATE INDEX idx_assets_order ON assets(current_order_id);
CREATE INDEX idx_assets_type ON assets(asset_type);

CREATE TABLE asset_status_history (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  scan_event_id TEXT,
  changed_by TEXT REFERENCES users(id),
  changed_at TEXT NOT NULL,
  notes TEXT
);
CREATE INDEX idx_asset_history ON asset_status_history(asset_id, changed_at);

CREATE TABLE asset_scan_events (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  user_id TEXT REFERENCES users(id),
  device_id TEXT,
  order_id TEXT,
  assignment_id TEXT,
  scan_mode TEXT NOT NULL CHECK (scan_mode IN (
    'receive','stage','unstage','load','unload','deliver','pickup','warehouse_return',
    'clean_start','clean_complete','inspect','audit','quarantine','repair','retire',
    'mark_missing','recover')),
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  device_timestamp TEXT NOT NULL,
  server_timestamp TEXT NOT NULL,
  latitude REAL, longitude REAL, accuracy REAL,
  source TEXT NOT NULL DEFAULT 'online' CHECK (source IN ('online','offline')),
  sync_batch_id TEXT,
  exception_code TEXT,
  notes TEXT
);
CREATE INDEX idx_scans_asset ON asset_scan_events(asset_id, server_timestamp);
CREATE INDEX idx_scans_order ON asset_scan_events(order_id);
CREATE INDEX idx_scans_batch ON asset_scan_events(sync_batch_id);

CREATE TABLE order_assets (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  asset_id TEXT NOT NULL REFERENCES assets(id),
  assigned_at TEXT NOT NULL,
  delivered_at TEXT,
  picked_up_at TEXT,
  warehouse_return_at TEXT,
  delivery_condition TEXT,
  return_condition TEXT,
  missing INTEGER NOT NULL DEFAULT 0,
  damaged INTEGER NOT NULL DEFAULT 0,
  replacement_charge_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);
-- one asset once per active order
CREATE UNIQUE INDEX uq_order_assets_active ON order_assets(order_id, asset_id) WHERE picked_up_at IS NULL;
-- one asset in only one open order allocation at a time
CREATE UNIQUE INDEX uq_order_assets_open ON order_assets(asset_id) WHERE warehouse_return_at IS NULL AND missing = 0;
CREATE INDEX idx_order_assets_order ON order_assets(order_id);

CREATE TABLE cleaning_records (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  order_id TEXT REFERENCES orders(id),
  employee_id TEXT REFERENCES users(id),
  started_at TEXT,
  completed_at TEXT,
  debris_removed INTEGER NOT NULL DEFAULT 0,
  washed INTEGER NOT NULL DEFAULT 0,
  cleaning_product TEXT,
  disinfectant_used TEXT,
  contact_time_completed INTEGER NOT NULL DEFAULT 0,
  dried INTEGER NOT NULL DEFAULT 0,
  inspected INTEGER NOT NULL DEFAULT 0,
  final_condition TEXT,
  final_status TEXT,
  photo_document_ids TEXT, -- JSON array
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_cleaning_asset ON cleaning_records(asset_id);

CREATE TABLE damage_reports (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id),
  asset_id TEXT NOT NULL REFERENCES assets(id),
  reported_by TEXT REFERENCES users(id),
  reported_at TEXT NOT NULL,
  damage_category TEXT NOT NULL CHECK (damage_category IN ('crack','broken_lid','broken_hinge','contamination','missing','cosmetic','structural','other')),
  description TEXT NOT NULL,
  customer_explanation TEXT,
  photo_document_ids TEXT, -- JSON array
  repairable INTEGER,
  repair_cost_cents INTEGER,
  replacement_cost_cents INTEGER,
  recommended_charge_cents INTEGER,
  approved_charge_cents INTEGER,
  approval_user_id TEXT REFERENCES users(id),
  resolution TEXT CHECK (resolution IN (NULL,'pending','approved','adjusted','rejected','charged','closed')),
  customer_notified INTEGER NOT NULL DEFAULT 0,
  closed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_damage_asset ON damage_reports(asset_id);
CREATE INDEX idx_damage_order ON damage_reports(order_id);

CREATE TABLE inventory_audits (
  id TEXT PRIMARY KEY,
  audit_number TEXT NOT NULL UNIQUE,
  branch_id TEXT REFERENCES branches(id),
  storage_location_id TEXT REFERENCES storage_locations(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reconciling','completed','cancelled')),
  started_by TEXT REFERENCES users(id),
  started_at TEXT NOT NULL,
  closed_at TEXT,
  reconciled_by TEXT REFERENCES users(id),
  notes TEXT
);

CREATE TABLE inventory_audit_items (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL REFERENCES inventory_audits(id),
  asset_id TEXT NOT NULL REFERENCES assets(id),
  scanned_at TEXT NOT NULL,
  scanned_by TEXT REFERENCES users(id),
  expected_location_id TEXT,
  discrepancy TEXT CHECK (discrepancy IN (NULL,'ok','missing','unexpected','wrong_location','duplicate')),
  resolved INTEGER NOT NULL DEFAULT 0,
  UNIQUE (audit_id, asset_id)
);
