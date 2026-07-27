# 12 — Invoice Lifecycle Diagram

```
            ┌──────────────────────────────────────────────────────────┐
            │ creation triggers: reservation confirm, deposit, delivery, │
            │ extension, pickup, damage approval, missing equipment,     │
            │ failed pickup, billing cycle, manual admin action          │
            └──────────────────────────────┬───────────────────────────┘
                                           ▼
                              draft (line items editable)
                                           │ submit
                                           ▼
                              pending_approval
                                │ finalize (explicit action, perms-gated)
                                ▼
                            finalized 🔒 ──(send)──► sent
                                │                      │
                                │ payment(s)           ▼
                                ├───────────► partially_paid
                                │                      │ balance = 0
                                ├──────────────────────┴──► paid
                                │
                                │ due_date passes (cron) ──► overdue ──(payment)──► paid
                                │
                                │ dispute webhook ──► disputed ──(resolved)──► prior
                                ▼
              voided (owner only, pre-payment)      written_off (owner, with credit memo)
```

## Immutability rules

- `finalized` and later: line items, totals, and snapshots **cannot change** (repository
  rejects; DB CHECK + service guard). Corrections happen only through:
  - **credit memo** referencing the original invoice (negative amounts, authorized, PDF to R2),
  - **void** (owner-only, only when no payments applied; keeps the row, sets `voided_at`),
  - **supersede** for regenerated drafts (`superseded_invoice_id` chain).
- Totals are computed on the server from line items + tax snapshot; client-submitted totals
  are ignored. Reconciliation check on finalize: Σ(line_total) = subtotal − discount + tax;
  mismatch blocks finalization and raises a dashboard alert.
- Pricing comes from the **order snapshot**, never current package prices.

## Numbering

`document_counters` row per `(doc_type, year)` incremented inside the same D1 batch as the
insert → `GLMT-INV-2026-000001`, `GLMT-QTE-…`, `GLMT-CRM-…`, `GLMT-RCT-…`. Collision-proof:
counters are updated with `UPDATE … SET next_value = next_value + 1 WHERE … RETURNING`, and
the number column is UNIQUE.

## Payments

- Stripe mode: payment link per invoice → Checkout → webhook `payment_intent.succeeded`
  (signature-verified, `webhook_events` idempotency by provider event id) creates the
  `payments` row, updates invoice/order balances.
- Manual mode (no Stripe secrets): `payments.record` permission records check/cash/ACH/manual
  card entries directly.
- Refunds create `refunds` rows + refund receipts; never negative-edit the payment.
- Partial payments allowed; `amount_paid` / `balance_due` recomputed server-side per payment.

## Damage/additional charges

field report (photos/notes → R2) → recommended charge (from replacement costs) →
manager `damage.approve` (approve/adjust/reject) → new **damage invoice** (or adjustment) →
customer notified → payment per accepted agreement. No automatic capture from a field report.
