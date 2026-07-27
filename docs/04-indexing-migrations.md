# 04 — D1 Indexing & Migration Plan

## Migration files

Migrations live in `migrations/`, numbered, committed to git, applied with Wrangler:

```
migrations/
  0001_identity.sql        roles, permissions, role_permissions, users, sessions,
                           password_reset_tokens, login_audit, branches, storage_locations
  0002_crm.sql             customers, customer_addresses, business_accounts, referral_partners
  0003_catalog.sql         rental_packages, pricing_rules, service_zones, tax_jurisdictions,
                           app_settings, document_counters
  0004_operations.sql      orders, order_status_history, assets, asset_status_history,
                           asset_scan_events, order_assets, assignments, routes, vehicles,
                           cleaning_records, damage_reports, inventory_audits(+items)
  0005_agreements.sql      agreement_templates, agreement_template_versions, agreements,
                           agreement_acceptances
  0006_billing.sql         quotes(+items), invoices(+items), payments, refunds,
                           credit_memos(+items), statements
  0007_platform.sql        documents, notification_templates, notifications, email_events,
                           job_records, offline_mutations, webhook_events, audit_logs
  0008_seed_reference.sql  roles, permission catalog, role_permissions, default branch,
                           storage locations, rental packages, service zones, tax
                           jurisdictions, notification templates, app settings,
                           document counters (idempotent INSERT ... WHERE NOT EXISTS)
```

Apply: `npm run db:migrate:local` / `:preview` / `:prod`.
Seed business data (employees, customers, orders, assets…): `npm run db:seed:local`
(`scripts/seed.mjs`, idempotent, separate from schema migrations).

Recovery: D1 point-in-time recovery via `wrangler d1 time-travel` (see docs/DEPLOYMENT.md).

## Index plan (beyond PK/UNIQUE)

| Table | Index | Why |
|---|---|---|
| users | `(email)` UNIQUE | login lookup |
| sessions | `(token_hash)` UNIQUE, `(user_id)`, `(expires_at)` | cookie lookup, revocation sweep |
| customers | `(last_name, first_name)`, `(email)`, `(primary_phone)`, `(customer_number)` UNIQUE | universal search |
| customer_addresses | `(customer_id)`, `(city, state)` | joins, territory |
| orders | `(customer_id)`, `(order_status)`, `(scheduled_delivery_date)`, `(scheduled_pickup_date)`, `(business_account_id)` | dashboards, dispatch, statements |
| assets | `(current_status)`, `(branch_id, storage_location_id)`, `(current_order_id)`, `(asset_type)` | inventory views, shortage checks |
| asset_scan_events | `(asset_id, server_timestamp)`, `(order_id)`, `(sync_batch_id)` | asset history, reconciliation |
| assignments | `(assigned_employee_id, scheduled_date)`, `(order_id)`, `(route_id, route_order)`, `(status)` | driver day view, dispatch board |
| agreements | `(order_id)`, `(agreement_status)`, `(customer_id)` | queues and portal |
| invoices | `(customer_id)`, `(invoice_status)`, `(due_date)`, `(order_id)`, `(business_account_id, issue_date)` | AR aging, statements |
| invoice_line_items | `(invoice_id)` | render |
| payments | `(invoice_id)`, `(customer_id)`, `(provider, provider_transaction_id)` UNIQUE-ish | webhook idempotency |
| documents | `(related_entity_type, related_entity_id)`, `(document_type)`, `(verification_code)` UNIQUE | document library, verify page |
| notifications | `(status, scheduled_at)`, `(related_entity_type, related_entity_id)` | retry sweep |
| audit_logs | `(entity_type, entity_id)`, `(actor_user_id, created_at)` | audit pages |
| offline_mutations | `(user_id, status)`, `(device_id)` | conflict review |
| job_records | `(job_type, status)`, `(idempotency_key)` UNIQUE | admin job board |

Partial indexes (SQLite supports them) are used for soft-delete-heavy hot paths, e.g.
`CREATE INDEX ... ON assets(current_status) WHERE deleted_at IS NULL`.

## Rules

1. Never edit an applied migration — add a new one.
2. Each migration is wrapped so a failed statement aborts the batch (wrangler applies files atomically).
3. New enum-like values go through CHECK-constraint migrations plus the TS union types in `src/lib/types.ts`.
4. Test migrations locally (`--local`) before preview/staging/production.
