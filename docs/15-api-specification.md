# 15 — API Endpoint Specification

All endpoints are Next.js route handlers under `src/app/api/`. JSON in/out.
Errors: `{ "error": { "code": "...", "message": "..." } }` with proper HTTP status.
Auth: staff = `glmt_session` cookie or `Authorization: Bearer <token>`; portal = customer
session; public endpoints are marked. All mutations are audit-logged and permission-checked.

## Auth

| Method | Path | Perm | Notes |
|---|---|---|---|
| POST | /api/auth/login | public+Turnstile | sets session cookie |
| POST | /api/auth/logout | session | revokes session |
| POST | /api/auth/forgot-password | public+Turnstile | emails reset token |
| POST | /api/auth/reset-password | public | token + new password |
| GET | /api/auth/me | session | user, role, permissions |

## Customers / accounts

| Method | Path | Perm |
|---|---|---|
| GET/POST | /api/customers | customers.view / .create |
| GET/PATCH/DELETE | /api/customers/[id] | .view / .edit / .delete (soft) |
| POST/GET | /api/customers/[id]/addresses | .edit / .view |
| GET/POST | /api/business-accounts | customers.view / .create |

## Quotes

| Method | Path | Perm | Notes |
|---|---|---|---|
| GET/POST | /api/quotes | quotes.view / .create | server computes totals |
| GET/PATCH | /api/quotes/[id] | quotes.view / .edit | |
| POST | /api/quotes/[id]/approve | portal | records approval + snapshot |
| POST | /api/quotes/[id]/decline | portal | |
| POST | /api/quotes/[id]/convert | orders.create | → order with frozen pricing |
| POST | /api/quotes/[id]/pdf | quotes.view | queues quote_pdf.generate |

## Orders

| Method | Path | Perm | Notes |
|---|---|---|---|
| GET/POST | /api/orders | orders.view / .create | |
| GET/PATCH | /api/orders/[id] | orders.view / .edit | optimistic `version` |
| POST | /api/orders/[id]/transition | orders.edit | `{toStatus, reason?, override?}` state machine |
| POST | /api/orders/[id]/reserve | orders.edit | reserve clean assets |
| GET | /api/orders/[id]/timeline | orders.view | status + scans + docs |

## Agreements

| Method | Path | Perm | Notes |
|---|---|---|---|
| GET/POST | /api/agreement-templates | agreements.manage_templates | |
| POST | /api/agreement-templates/[id]/versions | manage_templates | new immutable version |
| POST | /api/agreement-templates/[id]/activate | manage_templates | `{version}` |
| POST | /api/agreement-templates/[id]/retire | manage_templates | |
| GET | /api/agreement-templates/[id]/preview | manage_templates | rendered merge preview |
| GET/POST | /api/agreements | agreements.view / generate (orders.edit) | |
| GET | /api/agreements/[id] | agreements.view | includes evidence |
| POST | /api/agreements/[id]/send | agreements.resend | |
| POST | /api/agreements/[id]/void | agreements.void | unsigned only |
| GET | /api/portal/agreements/[token] | portal | review view |
| POST | /api/portal/agreements/[token]/accept | portal | checkboxes, typed name, signature PNG → acceptance + signed-PDF job |
| POST | /api/portal/agreements/[token]/decline | portal | with reason |

## Invoices / billing

| Method | Path | Perm | Notes |
|---|---|---|---|
| GET/POST | /api/invoices | invoices.view / .create | totals server-computed |
| GET | /api/invoices/[id] | invoices.view | |
| POST | /api/invoices/[id]/finalize | invoices.finalize | reconciliation enforced |
| POST | /api/invoices/[id]/void | invoices.void | owner-only, no payments |
| POST | /api/invoices/[id]/pdf | invoices.view | queues PDF |
| POST | /api/invoices/[id]/payments | payments.record | manual payment |
| POST | /api/payments/[id]/refund | payments.refund | |
| GET/POST | /api/credit-memos | credit_memos.* | approve flow, applies to invoice |
| GET | /api/statements | invoices.view | business accounts |
| POST | /api/webhooks/stripe | public (signed) | signature verify + idempotent |

## Assets / scanning

| Method | Path | Perm | Notes |
|---|---|---|---|
| GET/POST | /api/assets | assets.view / .manage | |
| GET/PATCH | /api/assets/[id] | assets.view / .manage | no direct status writes |
| POST | /api/assets/[id]/retire | assets.retire | |
| POST | /api/scans | scans.create | single scan, idempotency key, state machine |
| POST | /api/scans/batch | scans.create | batch scan (also used by sync) |
| GET | /api/assets/[id]/history | assets.view | scans + status history |
| POST | /api/inventory-audits | inventory.audit | start/close sessions |
| POST | /api/inventory-audits/[id]/reconcile | inventory.reconcile | manager approval |
| GET/POST | /api/cleaning | cleaning.manage | queue + records |
| GET/POST | /api/damage-reports | damage.report | |
| POST | /api/damage-reports/[id]/decision | damage.approve | approve/adjust/reject |

## Dispatch

| Method | Path | Perm |
|---|---|---|
| GET/POST | /api/assignments | assignments.view / .manage |
| GET/PATCH | /api/assignments/[id] | view / manage (complete: complete_own) |
| POST | /api/assignments/[id]/complete | assignments.complete_own |
| GET/POST | /api/routes | dispatch.view / .manage |
| POST | /api/routes/[id]/optimize | dispatch.manage |
| GET/POST | /api/vehicles | vehicles.view / .manage |

## Documents / uploads

| Method | Path | Perm | Notes |
|---|---|---|---|
| GET | /api/documents | documents.view | filter by entity/type |
| GET | /api/documents/[id]/download | session or signed token | authorized R2 read |
| POST | /api/uploads | session | validated upload → R2 + documents row |
| POST | /api/uploads/field | Bearer (PWA) | offline attachment upload |
| GET | /api/documents/verify/[code] | staff | verification page data |

## Sync / platform

| Method | Path | Perm | Notes |
|---|---|---|---|
| POST | /api/sync/batch | session/Bearer | offline mutations (docs/13) |
| GET | /api/sync/status | session | pending conflicts, failures |
| GET | /api/search | any staff | universal search `?q=` |
| GET | /api/reports/[type] | reports.view | `?format=csv\|json`, PDF via queue |
| GET | /api/dashboard | dashboard.view | dashboard aggregates |
| GET | /api/jobs | settings/dispatch view | job board |
| POST | /api/jobs/[id]/retry | settings.manage | requeue DLQ/failed |
| GET | /api/audit-logs | audit.view | |
| GET/PUT | /api/settings | settings.manage | |
