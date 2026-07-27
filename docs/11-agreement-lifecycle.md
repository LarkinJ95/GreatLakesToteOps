# 11 — Agreement Lifecycle Diagram

## Template lifecycle

```
 draft version ──(submit)──► pending approval ──(approve + activate)──► active
      ▲                                                              │
      └──────────── new version (clone) ◄── edit not allowed ────────┘
 active ──(retire)──► retired (still attached to historical agreements forever)
```

- An active/approved version is immutable: editing creates version N+1 (`draft`).
- Only one `active` version per template at a time (partial unique index).
- Templates contain `{{merge.field}}` placeholders only; the renderer
  (`src/lib/services/agreementService.ts#renderMergeFields`) whitelists fields, HTML-escapes
  all values, and rejects anything else — no executable code possible.

## Agreement lifecycle

```
                generation (service, on order stage)
                        │
                        ▼
      draft ──► generated ──(send link)──► sent ──(portal open)──► viewed
                        │                     │                    │
                        │                     │  accept            ▼
                        │                     └──────────────► accepted 🔒
                        │                     │                    │
                        │                     │  decline           ▼
                        │                     └──────────────► signed PDF generated,
                        │                     │              order → awaiting_payment
                        │                     ▼
                        │                  declined
                        │
        void (unsigned only) ▼            cron expiry ▼
                          voided                      expired
                        │
   material order change after acceptance:
        accepted ──► superseded (preserved permanently) + new agreement generated
```

## Generation steps (all server-side, audit-logged)

1. Select the correct `active` template version (jurisdiction + customer type).
2. Snapshot: template version, order pricing snapshot, customer/billing data →
   `agreements.snapshot_json`; `html_checksum` = SHA-256 of rendered HTML.
3. Insert `agreements` row (`generated`), unique `agreement_number`.
4. Queue `agreement_pdf.generate` → PDF → R2 `agreements/orders/{orderId}/{id}.pdf` +
   `documents` row with checksum + verification code.
5. `sent` when the secure review link is emailed (link = customer-portal session or
   signed token).

## Acceptance evidence (`agreement_acceptances`, immutable)

`id, agreement_id, customer_name_typed, signature_document_id (R2 PNG),
accepted_at, ip_address, device_info, template_version, html_checksum,
order_snapshot_json, checkbox_values_json, verification_code`

After acceptance:
1. Agreement row locked (`accepted_at` set; service rejects further mutation).
2. `agreement_pdf.generate_signed` → signed PDF (signature image + acceptance block) → R2;
   unsigned PDF preserved.
3. `orders.agreement_status = accepted`, order advances.
4. Customer emailed a copy; audit log entry.

## Change-after-acceptance rule

Any change to package, dates, addresses, or price on an order with an `accepted` agreement:
old agreement → `superseded` (kept per retention), new agreement (or amendment template)
generated and sent; order returns to `awaiting_agreement`. Never overwritten, never silent.
