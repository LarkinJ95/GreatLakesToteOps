-- Physical warehouse bins and audited customer/order holds.
CREATE TABLE warehouse_bins (
  id TEXT PRIMARY KEY,
  storage_location_id TEXT NOT NULL REFERENCES storage_locations(id),
  code TEXT NOT NULL,
  label TEXT,
  bin_type TEXT NOT NULL DEFAULT 'general' CHECK (bin_type IN ('general','staging','customer_hold','returns','repair','quarantine')),
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (storage_location_id, code)
);
CREATE INDEX idx_bins_location ON warehouse_bins(storage_location_id, active);

CREATE TABLE bin_assignments (
  id TEXT PRIMARY KEY,
  bin_id TEXT NOT NULL REFERENCES warehouse_bins(id),
  customer_id TEXT REFERENCES customers(id),
  order_id TEXT REFERENCES orders(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','released','completed')),
  purpose TEXT NOT NULL DEFAULT 'hold',
  notes TEXT,
  assigned_by TEXT REFERENCES users(id),
  assigned_at TEXT NOT NULL,
  released_at TEXT
);
CREATE UNIQUE INDEX uq_bin_active_assignment ON bin_assignments(bin_id) WHERE status = 'active';
CREATE INDEX idx_bin_assignments_customer ON bin_assignments(customer_id,status);
CREATE INDEX idx_bin_assignments_order ON bin_assignments(order_id,status);
