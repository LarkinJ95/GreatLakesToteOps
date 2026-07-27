# 03 — D1 Database Schema

The authoritative schema is the SQL in `migrations/` (applied with `wrangler d1 migrations apply`).
This document is the entity map. Conventions:

- IDs: `TEXT` UUIDs generated in app code (`crypto.randomUUID()`).
- Timestamps: ISO-8601 `TEXT`, UTC, set by the repository layer (`created_at`, `updated_at`, `deleted_at` nullable).
- Money: integer **cents** (`INTEGER NOT NULL`) — never floats. Formatted to USD at render time.
- Soft deletion for business records via `deleted_at`; queries filter `deleted_at IS NULL` by default.
- Optimistic concurrency: `version INTEGER NOT NULL DEFAULT 1` on orders, assets, assignments, invoices; every update does `WHERE id = ? AND version = ?` and increments.
- Immutable snapshots: pricing on orders, billing/company/tax snapshots on invoices, template + order snapshot JSON on agreements.
- All writes use parameterized prepared statements; multi-row writes that must succeed together use `db.batch()`.

## Entity groups

**Identity & access**: `roles`, `permissions`, `role_permissions`, `users`, `sessions`,
`password_reset_tokens`, `login_audit`, `branches`, `storage_locations`.

**CRM**: `customers`, `customer_addresses`, `business_accounts`, `referral_partners`.

**Catalog & pricing**: `rental_packages`, `pricing_rules`, `service_zones`, `tax_jurisdictions`,
`app_settings`, `document_counters` (collision-resistant numbering).

**Operations**: `orders`, `order_status_history`, `assets`, `asset_status_history`,
`asset_scan_events`, `order_assets`, `assignments`, `routes`, `vehicles`,
`cleaning_records`, `damage_reports`, `inventory_audits`, `inventory_audit_items`.

**Agreements**: `agreement_templates`, `agreement_template_versions`, `agreements`,
`agreement_acceptances`.

**Billing**: `invoices`, `invoice_line_items`, `payments`, `refunds`, `credit_memos`,
`credit_memo_line_items`, `quotes`, `quote_line_items`, `statements`.

**Documents & comms**: `documents` (R2 metadata), `notification_templates`, `notifications`,
`email_events`.

**Platform**: `job_records` (queue visibility), `offline_mutations` (sync log),
`webhook_events` (idempotency), `audit_logs`.

## Key constraints

- `assets.asset_number`, `assets.qr_code_value` UNIQUE.
- `order_assets`: partial unique index `UNIQUE(order_id, asset_id) WHERE picked_up_date IS NULL`
  prevents double-assigning an asset to an active order; a second partial unique index on
  `(asset_id) WHERE warehouse_return_date IS NULL AND missing = 0` prevents one asset existing
  in two active rentals.
- `invoices.invoice_number`, `agreements.agreement_number`, `orders.order_number`,
  `quotes.quote_number` UNIQUE.
- `asset_scan_events.idempotency_key` UNIQUE — scans are immutable events, never updated.
- `offline_mutations.idempotency_key` UNIQUE.
- `webhook_events.provider_event_id` UNIQUE per provider.
- CHECK constraints on money columns (`>= 0` where meaningful), on enum-like status columns,
  and on `quantity > 0` line items.
- Foreign keys `ON DELETE RESTRICT` for financial chains; soft-delete for everything user-facing.

See `docs/04` for the index list and migration sequencing.
