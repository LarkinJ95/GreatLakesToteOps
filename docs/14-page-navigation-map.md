# 14 — Page & Navigation Map

## Desktop app (`/app/*`, staff session required)

```
/login
/app
├── dashboard                      Today, alerts, revenue, inventory, fleet, failures, audit
├── orders                         list + filters + universal search
│   ├── new                        new reservation wizard (customer → package → dates → price)
│   └── [id]                       detail: timeline, assets, agreement, invoices, payments,
│                                  assignments, scans, photos, notes, actions
├── quotes                         list
│   └── [id]                       detail: approve/decline/expire, convert to order, PDF
├── customers                      list + search
│   └── [id]                       detail: addresses, orders, invoices, balance, documents
├── business-accounts              list + detail (terms, statements, negotiated pricing)
├── agreements                     list (awaiting acceptance, expiring, evidence)
│   ├── templates                  template list
│   │   └── [id]                   editor: versions, preview, compare, activate, retire,
│   │                              merge-field errors
│   └── [id]                       detail: snapshot, checksum, acceptance evidence, PDFs
├── invoices                       list (drafts awaiting approval, unpaid, overdue)
│   ├── new                        manual invoice builder
│   └── [id]                       detail: line items, totals, payments, credit memos, PDF
├── credit-memos                   list + detail + create (authorization flow)
├── payments                       payments & refunds ledger
├── dispatch
│   ├── calendar                   day / week / month / list, drag-and-drop, warnings
│   ├── routes                     route planner: map, stops, optimize, capacity, nav links
│   └── assignments/[id]           assignment detail + exception handling
├── inventory                      asset list (status/branch/type filters, search)
│   ├── [id]                       asset detail: full scan history, rentals, cleaning, cost
│   └── audit                      inventory audit sessions + reconciliation approval
├── cleaning                       cleaning queue + cleaning/inspection records
├── damage                         damage & quarantine queue, charge approval workflow
├── vehicles                       fleet list + detail (documents, expirations)
├── users                          employees & users, roles, branches, sessions
├── reports                        report catalog + filters + CSV/PDF export
├── notifications                  templates + delivery log + failures
├── documents                      document library (filter by type/entity)
├── jobs                           document-generation job board + retry controls
├── pricing                        packages, pricing rules, add-on fees
├── service-zones                  zones + zone fees
├── tax-settings                   tax jurisdictions + rates
├── settings                       company info, numbering formats, branding
└── audit-log                      full audit trail

/verify                            internal document verification (code → status/checksum)
```

## Customer portal (`/portal/*`, customer-scoped)

```
/portal/login           email + token link (Turnstile)
/portal                 current reservation, status timeline
/portal/quotes/[id]     view / approve / decline, PDF
/portal/agreements/[id] review → checkboxes → typed name → drawn/typed signature → accept/decline
/portal/invoices        list + PDF download
/portal/invoices/[id]   detail + pay (Stripe link or instructions)
/portal/receipts        payment receipts
/portal/photos          delivery / pickup photos, pickup reconciliation
/portal/requests        extension, date change, access instructions, report a problem
```

## Mobile PWA (`/m/*`, installable, offline-capable)

```
/m/login
/m                        home: today's route, next stop, counts, messages, sync status
/m/route                  today's route, stop list, navigate (Google/Apple Maps links)
/m/assignments            assignment list
/m/assignments/[id]       detail: customer, access notes, checklist, complete
/m/scan                   scanner shell (continuous scan, batch, beep/vibrate, warnings)
/m/stage/[orderId]        stage order (progress, required counts)
/m/load/[assignmentId]    load vehicle (capacity)
/m/deliver/[assignmentId] delivery flow: scans → photo → signature/contactless → confirm
/m/pickup/[assignmentId]  pickup flow: scans → conditions → damage → reconciliation
/m/return                 warehouse return
/m/cleaning               cleaning & inspection checklist
/m/damage                 damage report (photos, category, explanation)
/m/audit                  inventory audit mode
/m/signature              signature capture component page
/m/photo                  photo capture component page
/m/messages               dispatcher messages
/m/offline                offline queue (pending/failed items, manual retry)
/m/conflicts              sync-conflict review (managers)
/m/profile                profile, dark mode, high contrast, device id, logout
```
