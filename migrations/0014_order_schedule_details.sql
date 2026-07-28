-- Structured operational scheduling data replaces free-text time-window notes.
ALTER TABLE orders ADD COLUMN preferred_delivery_window TEXT;
ALTER TABLE orders ADD COLUMN preferred_pickup_window TEXT;
ALTER TABLE orders ADD COLUMN confirmed_delivery_window_start TEXT;
ALTER TABLE orders ADD COLUMN confirmed_delivery_window_end TEXT;
ALTER TABLE orders ADD COLUMN confirmed_pickup_window_start TEXT;
ALTER TABLE orders ADD COLUMN confirmed_pickup_window_end TEXT;
ALTER TABLE orders ADD COLUMN onsite_contact_name TEXT;
ALTER TABLE orders ADD COLUMN onsite_contact_phone TEXT;
ALTER TABLE orders ADD COLUMN pickup_ready_confirmed_at TEXT;
ALTER TABLE orders ADD COLUMN reschedule_reason TEXT;
