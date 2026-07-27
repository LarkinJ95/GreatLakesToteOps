# 06 — Queue & Scheduled-Job Design

## Queue: `glmt-jobs` (+ `glmt-jobs-dlq`)

Producer: any server code calls `enqueueJob(env, job)` (`src/lib/jobs.ts`), which
1. inserts a `job_records` row (`status=queued`, idempotency key unique), and
2. sends the message to `JOB_QUEUE`.

Consumer: `queue()` handler in `src/worker.ts` (wired through the OpenNext entry), processes
each message via the job registry; a message is acked only after the handler succeeds.
Failures retry up to 3×, then land in the DLQ; the admin **Document-generation jobs** page
shows every `job_records` row and offers re-queue (which marks DLQ rows `requeued`).

### Job envelope

```json
{
  "schemaVersion": 1,
  "idempotencyKey": "invoice-pdf:inv_01J…:finalized:2026-07-27T…",
  "jobType": "invoice_pdf.generate",
  "entityId": "inv_01J…",
  "requestedBy": "usr_…",
  "requestedAt": "2026-07-27T19:00:00Z",
  "attempt": 1,
  "payload": { }
}
```

### Job types

| Type | Idempotency rule |
|---|---|
| `agreement_pdf.generate` / `agreement_pdf.generate_signed` | skip if `documents` row already exists for the same agreement + signed flag |
| `invoice_pdf.generate` / `quote_pdf.generate` / `receipt.generate` / `credit_memo_pdf.generate` | skip if current PDF document exists for the entity version |
| `statement.generate_monthly` | unique per (business_account, year, month) |
| `report.export` | unique per (report type, filter hash, requester, day) |
| `email.send` / `sms.send` / `push.send` | unique `notifications.id`; consumer marks `sent`, never duplicates |
| `review_request.send` | one per completed order |
| `photo.process` | unique per document id |
| `retention.process` | daily batch, deletes expired `temporary_30d` objects |

Consumers are idempotent by construction: they check the target state before writing
(no duplicate invoices, agreements, payments, or notifications on retry), and every attempt
updates `job_records.attempts` / `last_error`.

## Cron triggers

| Schedule | Handler | Work |
|---|---|---|
| `*/15 * * * *` | `frequentSweep` | retry failed notifications (bounded), flag stale offline sync, update `driver status` heartbeat |
| `17 6 * * *` | `morningReminders` | today's delivery reminders, tomorrow's pickup reminders, queue emails/SMS |
| `23 7 * * *` | `dailyChecks` | late-rental identification (order → `late_rental` + alert), agreement-expiry sweep (`sent/viewed` past expiration → `expired`), overdue-invoice detection + reminders |
| `41 1 * * *` | `nightlyMaintenance` | temp-file cleanup, retention policy processing, daily operational summary to owner |
| `9 2 1 * *` | `monthlyJobs` | business-account statements (queues one job per account), abandoned-quote cleanup, vehicle document-expiry alerts, asset-inspection reminders |

All cron handlers are in `src/lib/cron.ts`, dispatched from the Worker's `scheduled()` entry.
Every cron write is audit-logged with `actor_user_id = NULL` (system).
