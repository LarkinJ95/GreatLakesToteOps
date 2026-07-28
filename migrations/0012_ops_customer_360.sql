CREATE TABLE cancellation_records (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  requested_at TEXT NOT NULL,
  requested_by TEXT NOT NULL DEFAULT 'staff',
  reason TEXT NOT NULL,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  refund_cents INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_cancellations_requested ON cancellation_records(requested_at);
