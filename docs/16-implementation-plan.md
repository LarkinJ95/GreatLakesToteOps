# 16 — Phased Implementation Plan

## Phase 0 — Foundation (done first)
- [x] Design artifacts (docs/01–16)
- [ ] Scaffold: Next.js + TypeScript + Tailwind + OpenNext + wrangler.jsonc
- [ ] D1 migrations 0001–0008 (schema + reference seed)
- [ ] `src/lib`: cloudflare env access, D1 helper, types, crypto, money, dates, audit
- [ ] Auth: login/logout/reset, sessions, RBAC guards, middleware (CSP/security headers)

## Phase 1 — Core records
- [ ] Customers + addresses + business accounts (API + pages)
- [ ] Rental packages, pricing rules, service zones, tax settings (seeded + admin pages)
- [ ] Assets + asset-number/QR generation + label PDF
- [ ] Employees/users admin

## Phase 2 — Order pipeline
- [ ] Quotes: create, PDF job, portal approve/decline, convert → order (pricing snapshot)
- [ ] Order state machine + timeline + universal search
- [ ] Agreement templates + merge renderer + versioning + editor
- [ ] Agreement generation → unsigned PDF (R2) → secure review link
- [ ] Portal acceptance: checkboxes, typed name, canvas signature → acceptance record →
      signed PDF → order advances; supersede flow

## Phase 3 — Billing
- [ ] Invoice engine: line items, tax, server totals, numbering, finalize/void
- [ ] Invoice/quote/receipt/credit-memo PDFs → R2
- [ ] Payments: manual recording + Stripe links/webhooks (idempotent)
- [ ] Credit memos + statements
- [ ] Damage-charge approval workflow → damage invoices

## Phase 4 — Field operations
- [ ] Dispatch calendar + assignments + routes (+ optimization heuristic)
- [ ] Scan service: state machine, modes, warnings, idempotency
- [ ] Mobile PWA: manifest, service worker, IndexedDB layer, scanner (ZXing),
      stage/load/deliver/pickup/return/cleaning/damage/audit flows
- [ ] Offline sync: batch endpoint, conflicts, manager review
- [ ] Signature + photo capture → R2

## Phase 5 — Platform
- [ ] Queue consumers + job board + retries/DLQ
- [ ] Cron handlers (reminders, late rentals, expiry, statements, retention, summaries)
- [ ] Notifications (templates, email/SMS providers, delivery log)
- [ ] Reports + CSV/PDF export
- [ ] Dashboard + alerts
- [ ] Document library + verification page

## Phase 6 — Quality & release
- [ ] Seed script (realistic Michigan data, full volume per spec)
- [ ] Automated tests (unit + integration per spec list)
- [ ] README: local dev, staging, production, backup/recovery, deployment checklist
- [ ] Typecheck + build + `wrangler dev` smoke test

## Acceptance workflow coverage

The 34-step acceptance workflow maps to: Phase 2 (steps 1–10), Phase 3 (11–14, 28–31),
Phase 4 (15–27, 34), Phase 5 (20, 22, 32–33). Each phase is demoable on `wrangler dev`
with the seed dataset.
