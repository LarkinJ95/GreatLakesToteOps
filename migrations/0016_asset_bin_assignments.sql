-- Item-level warehouse custody. A bin can hold multiple assets, while an
-- asset has only one active physical bin at a time.
CREATE TABLE asset_bin_assignments (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  bin_id TEXT NOT NULL REFERENCES warehouse_bins(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','released')),
  notes TEXT,
  assigned_by TEXT REFERENCES users(id),
  assigned_at TEXT NOT NULL,
  released_at TEXT
);
CREATE UNIQUE INDEX uq_asset_active_bin ON asset_bin_assignments(asset_id) WHERE status = 'active';
CREATE INDEX idx_asset_bin_active ON asset_bin_assignments(bin_id, status);
