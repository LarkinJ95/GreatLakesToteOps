# 02 — Wrangler Binding Plan

All bindings are declared in `wrangler.jsonc`. Access in code only through
`getCloudflareContext().env` (`src/lib/cloudflare.ts`). Bindings are never exposed to the browser.

| Binding | Type | Purpose |
|---|---|---|
| `DB` | D1 database | primary relational store (`migrations/`) |
| `DOCUMENTS` | R2 bucket (private) | agreements, invoices, quotes, receipts, credit memos, statements, photos, signatures, labels, reports, uploads |
| `JOB_QUEUE` | Queue (producer + consumer) | document generation, notifications, reports, retention |
| `ASSETS` | Static assets | Next.js static output (OpenNext) |

## Vars (non-secret, per environment)

| Var | Values | Purpose |
|---|---|---|
| `APP_ENV` | local / preview / staging / production | environment gate |
| `APP_BASE_URL` | origin URL | building portal/email links |
| `SESSION_TTL_HOURS` | default 12 | session expiry |
| `TURNSTILE_ENABLED` | true/false | Turnstile enforcement |
| `STRIPE_ENABLED` | true/false | card payments vs manual-only |

## Secrets (`wrangler secret put`, never committed)

| Secret | Used for |
|---|---|
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PUBLISHABLE_KEY` | payments + webhook verification |
| `TURNSTILE_SECRET_KEY` / `TURNSTILE_SITE_KEY` | bot protection |
| `EMAIL_API_KEY`, `EMAIL_FROM` | transactional email |
| `SMS_ACCOUNT_SID`, `SMS_AUTH_TOKEN`, `SMS_FROM_NUMBER` | SMS |
| `DOC_LINK_SECRET` | HMAC key for short-lived authorized document-download tokens |

Local development uses `.dev.vars` (see `dev.vars.example`).

## Resources to create per environment

```bash
wrangler d1 create glmt-db[-preview|-staging]
wrangler r2 bucket create glmt-documents[-preview|-staging]
wrangler queues create glmt-jobs[-preview|-staging]
wrangler queues create glmt-jobs[-preview|-staging]-dlq
```

Paste the returned D1 `database_id` values into `wrangler.jsonc` (placeholder zeros are
committed intentionally — they work for `--local` development only).

## Cron triggers (same Worker, all environments)

| Schedule | Job |
|---|---|
| `*/15 * * * *` | sync monitor, notification retry sweep |
| `17 6 * * *` | delivery/pickup reminders, driver-en-route prep |
| `23 7 * * *` | late-rental scan, overdue-invoice reminders, agreement-expiry checks |
| `41 1 * * *` | temp-file cleanup, retention processing, daily ops summary |
| `9 2 1 * *` | monthly business-account statements, vehicle-document expiry alerts, abandoned-quote cleanup |
