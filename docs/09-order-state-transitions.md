# 09 — Order State-Transition Diagram

Implemented in `src/lib/services/orderService.ts` (`ORDER_TRANSITIONS` map). Any transition
not listed is rejected with `InvalidTransitionError`; every accepted transition appends to
`order_status_history` and bumps `orders.version`.

## Main flow

```
 inquiry
   │  (create quote)
   ▼
 quote ──────────────────────────────► awaiting_customer_approval
   │                                        │ customer approves
   │                                        ▼
   │                                 awaiting_agreement
   │                                        │ agreement accepted
   │                                        ▼
   │                                 awaiting_payment
   │                                        │ payment recorded / terms approved
   │                                        ▼
   │                                    confirmed
   │                                        │ assets reserved
   │                                        ▼
   │                                equipment_reserved ──(warehouse stages)──► staged
   │                                                                        │ dispatcher assigns
   │                                                                        ▼
   │                                                              delivery_assigned
   │                                                                        │ driver departs
   │                                                                        ▼
   │                                                              out_for_delivery
   │                                                                        │ delivery completed
   │                                                                        ▼
   │                                                              delivered ──► active_rental
   │                                                                            │ pickup scheduled
   │                                                                            ▼
   │                                                              pickup_scheduled ──► pickup_assigned
   │                                                                                     │ driver completes
   │                                                                                     ▼
   │                                                                  picked_up ──► equipment_reconciliation
   │                                                                                     │
   │                                                                                     ▼
   │                                                                  cleaning ──► final_invoice_review
   │                                                                                     │
   │                                                                                     ▼
   │                                                                  completed ──► closed
   ▼
 cancelled (from: inquiry, quote, awaiting_customer_approval, awaiting_agreement,
            awaiting_payment, confirmed, equipment_reserved, staged)
```

## Exception statuses (sideways, with required guards)

| Status | Entered from | Trigger | Exit |
|---|---|---|---|
| rescheduled | confirmed…pickup_assigned | date change; supersedes agreement if terms change | back to the status matching the new step |
| delivery_failed | out_for_delivery | driver records failed attempt w/ reason + photo | delivery_assigned (retry) or cancelled |
| pickup_failed | pickup_assigned | failed pickup | pickup_assigned (follow-up assignment), may create failed-pickup invoice |
| late_rental | active_rental, pickup_scheduled | daily cron past pickup date + grace | pickup flow resumes |
| missing_equipment | equipment_reconciliation | reconciliation finds missing assets | cleaning (rest) + missing-equipment invoice |
| damage_review | equipment_reconciliation, cleaning | damage report filed | cleaning / final_invoice_review after manager decision |
| agreement_declined | awaiting_agreement | customer declines w/ reason | quote (renegotiate) or cancelled |
| agreement_expired | awaiting_agreement | cron expiry | regenerate agreement → awaiting_agreement |
| payment_dispute | awaiting_payment, confirmed, final_invoice_review | Stripe dispute webhook | resolved → prior financial step |

## Guards (server-enforced)

- `awaiting_agreement → awaiting_payment` requires an `accepted` agreement.
- `confirmed → equipment_reserved` requires sufficient clean inventory of required types.
- `out_for_delivery → delivered` requires all staged/loaded assets scanned delivered,
  delivery photo, and signature or contactless confirmation; if the order requires an
  accepted agreement and none exists, completion is blocked unless a user with
  `orders.edit` records an override with a reason (audit-logged).
- `picked_up → equipment_reconciliation` generates the pickup reconciliation record.
- `final_invoice_review → completed` requires balance due = 0 or approved account terms.
- `completed → closed` is terminal except for accounting corrections via credit memos.
