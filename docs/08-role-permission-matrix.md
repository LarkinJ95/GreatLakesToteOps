# 08 — Role & Permission Matrix

Seeded into `roles` / `permissions` / `role_permissions` (migration `0008`). `●` = granted.

| Permission key | Owner | Admin | Dispatcher | Driver | Warehouse | Accountant | Read-only |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| dashboard.view | ● | ● | ● | ● | ● | ● | ● |
| customers.view | ● | ● | ● | ¹ | ● | ● | ● |
| customers.create / .edit | ● | ● |  |  |  |  |  |
| customers.delete | ● |  |  |  |  |  |  |
| orders.view | ● | ● | ● | ¹ | ● | ● | ● |
| orders.create / .edit | ● | ● |  |  |  |  |  |
| orders.cancel | ● | ● |  |  |  |  |  |
| quotes.view / .create / .edit | ● | ● |  |  |  | ● | ● |
| agreements.view | ● | ● | ● |  |  | ● | ● |
| agreements.manage_templates | ● | ● |  |  |  |  |  |
| agreements.void / .resend | ● | ● |  |  |  |  |  |
| invoices.view | ● | ● | ● |  |  | ● | ● |
| invoices.create / .finalize | ● | ● |  |  |  | ● |  |
| invoices.void | ● |  |  |  |  |  |  |
| payments.record / .refund | ● | ● |  |  |  | ● |  |
| credit_memos.create | ● | ● |  |  |  | ● |  |
| credit_memos.approve | ● |  |  |  |  |  |  |
| dispatch.view / .manage | ● | ● | ● |  |  |  | ●(view) |
| assignments.view | ● | ● | ● | ¹ | ● |  | ● |
| assignments.manage | ● | ● | ● |  |  |  |  |
| assignments.complete_own |  |  |  | ● | ● |  |  |
| assets.view | ● | ● | ● | ¹ | ● |  | ● |
| assets.manage | ● | ● |  |  | ● |  |  |
| assets.retire | ● | ● |  |  |  |  |  |
| scans.create | ● | ● | ● | ● | ● |  |  |
| cleaning.manage | ● | ● |  |  | ● |  |  |
| damage.report | ● | ● | ● | ● | ● |  |  |
| damage.approve | ● | ● |  |  |  |  |  |
| vehicles.view | ● | ● | ● | ¹ |  |  | ● |
| vehicles.manage | ● | ● | ● |  |  |  |  |
| inventory.audit | ● | ● |  |  | ● |  |  |
| inventory.reconcile | ● | ● |  |  |  |  |  |
| reports.view | ● | ● | ● |  |  | ● | ● |
| reports.export | ● | ● |  |  |  | ● |  |
| users.manage | ● |  |  |  |  |  |  |
| settings.manage | ● |  |  |  |  |  |  |
| pricing.manage | ● | ● |  |  |  |  |  |
| documents.view / .download | ● | ● | ● | ¹ | ● | ● | ● |
| audit.view | ● |  |  |  |  |  |  |
| sync.review_conflicts | ● | ● | ● |  |  |  |  |

¹ = scoped: drivers see only customers/orders/assets/documents tied to their own assignments;
warehouse sees operational views without financial detail.

## Hard rules enforced in services (not just UI)

- Dispatcher: may view agreement/payment status, never writes to finalized financial records
  (`invoices.*`, `payments.*` denied).
- Driver: no customer list, pricing, or company financial endpoints; `damage.report` yes,
  `damage.approve` no — a field report can never charge a customer.
- Accountant: no writes to `asset_scan_events`, `order_assets`, cleaning, or dispatch.
- Administrator: everything except `users.manage`, `settings.manage`, `invoices.void`,
  `credit_memos.approve`, `customers.delete`.
- Deletion anywhere except owner-only settings is soft delete.
