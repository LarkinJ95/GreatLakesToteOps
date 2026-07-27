# 01 — Cloudflare Architecture

Great Lakes ToteOps is a Cloudflare-native application. There is no long-running Node server,
no Vercel, no Supabase, no Firebase, no AWS.

```
                         ┌────────────────────────────────────────────────────┐
                         │                  Cloudflare Edge                    │
                         │                                                     │
   Browser (desktop) ───►│  Cloudflare Worker (OpenNext / Next.js App Router)  │
   Mobile PWA (field) ──►│                                                     │
                         │  ┌───────────────┐   ┌───────────────────────────┐  │
                         │  │ Static assets │   │ SSR pages + Route handlers│  │
                         │  │ (ASSETS bind.)│   │ (server components/actions│  │
                         │  └───────────────┘   │  + /api/* endpoints)      │  │
                         │                      └─────┬───────┬──────┬──────┘  │
                         │                            │       │      │         │
                         │   ┌────────────────────────┘       │      │         │
                         │   ▼                                ▼      ▼         │
                         │ ┌──────┐   ┌──────────┐   ┌───────────┐ ┌────────┐  │
                         │ │  D1  │   │    R2    │   │  Queues   │ │ Cron   │  │
                         │ │ glmt │   │ documents│   │ glmt-jobs │ │Triggers│  │
                         │ │ -db  │   │ (private)│   │  + DLQ    │ │(5 jobs)│  │
                         │ └──────┘   └──────────┘   └───────────┘ └────────┘  │
                         │                                                     │
                         │  Turnstile (public forms) · WAF/rate limiting       │
                         └──────────────┬─────────────────────────────────────┘
                                        │ HTTPS + signed webhooks
                              ┌─────────▼─────────┐
                              │ Stripe (payments) │  email/SMS providers
                              └───────────────────┘
```

## Components

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | via `@opennextjs/cloudflare` adapter |
| Compute | Cloudflare Workers | all server code is Workers-runtime compatible (Web APIs only; `nodejs_compat` flag enabled for the adapter) |
| Relational DB | Cloudflare D1 (SQLite) | binding `DB`; typed repository layer (`src/lib/db`), no Prisma |
| Object storage | Cloudflare R2 | binding `DOCUMENTS`; private bucket; all access through authorized endpoints |
| Background jobs | Cloudflare Queues | binding `JOB_QUEUE`; producer + consumer in the same Worker, DLQ attached |
| Scheduled jobs | Cron Triggers | 5 schedules (see docs/06) |
| PDF generation | Built-in TS PDF engine (`src/lib/pdf`) | Workers-safe, no native deps; HTML/CSS template layer renders document models; abstraction allows swapping in Browser Rendering later |
| Auth | D1-backed sessions, PBKDF2 (Web Crypto), HTTP-only cookies | see docs/07 |
| Payments | Stripe | webhooks verified + idempotent; app runs in manual-payment mode when Stripe secrets are absent |
| Bot protection | Cloudflare Turnstile | login + customer-portal public forms when enabled |

## Data flow rules

- Binary files never touch D1 — D1 stores `documents` metadata rows; bytes live in R2.
- Anything slow/unreliable (PDF render, email, SMS, statements, exports) goes through `JOB_QUEUE` with idempotency keys, never inline in a user request.
- Financial numbers are computed server-side only and snapshotted onto orders/invoices.
- Every mutating request writes an `audit_logs` row.

## Environments

`local` (wrangler dev / local D1 + R2), `preview`, `staging`, `production` — each with its
own Worker name, D1 database, R2 bucket, and queue pair, defined in `wrangler.jsonc`.
