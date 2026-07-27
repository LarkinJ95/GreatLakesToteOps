# 13 — Offline Synchronization Protocol

## Client side (PWA)

IndexedDB database `glmt-offline` with object stores:

| Store | Key | Contents |
|---|---|---|
| `mutations` | `clientMutationId` (UUID) | pending/submitted/failed mutation envelopes |
| `attachments` | `attachmentId` (UUID) | photo/signature blobs queued for R2 upload |
| `cache` | cache key | last-synced assignments, customers, orders, assets for offline viewing |
| `meta` | key | device id, last sync time, conflict count |

### Mutation envelope

```json
{
  "clientMutationId": "uuid-v4",
  "idempotencyKey": "scan:uuid-v4",
  "entityType": "asset_scan",
  "entityId": "ast_…",
  "entityVersion": 7,
  "mutationType": "asset.scan",
  "deviceTimestamp": "2026-07-27T18:59:01.240Z",
  "userId": "usr_…",
  "deviceId": "dev_…",
  "payload": { "mode": "deliver", "lat": 43.61, "lng": -84.25, "accuracy": 12, "notes": "" },
  "attachmentRefs": ["att_uuid1"],
  "retryCount": 0
}
```

Offline capabilities: view synced assignments/customer+access notes, scan equipment
(QR/BarcodeDetector → ZXing fallback), record status changes, capture signatures (canvas →
PNG blob), capture photos, GPS via Geolocation, checklists, damage reports, notes.
Every action enqueues a mutation; nothing is discarded silently.

### Sync sequence (service worker `sync` event + manual "Sync now")

1. **Attachments first**: each blob `POST /api/uploads/field` (multipart, auth Bearer) →
   returns `documentId`; mutation payloads are rewritten with real document ids.
2. **Mutations** in device-timestamp order, batched: `POST /api/sync/batch` (≤ 50/batch).
3. Server responds per mutation: `applied | duplicate | conflict | error`.
4. Client marks stores accordingly; conflicts surface in **Sync-conflict review**.

Banner states: `Online` · `Offline` · `Syncing` · `Sync Failed` · `Conflict Review Required`.

## Server side (`POST /api/sync/batch`)

Per mutation, inside one handler (idempotent by `offline_mutations.idempotency_key` UNIQUE):

1. Already have the key? → return `duplicate` (with the original outcome).
2. Look up entity; compare `entityVersion` with the current row:
   - match → apply through the normal service (state machine validated), store the **device**
     timestamp as the event time and server time as received time → `applied`.
   - mismatch → **conflict**: mutation stored `status=conflict`, server data untouched,
     routed to manager review (`sync.review_conflicts`). Never silently overwrites newer data.
3. Any validation failure → `error` with a code; mutation kept for manual retry.

Manager conflict resolution choices: **apply anyway** (force with current version, audit-logged)
or **reject** (field user sees the rejection in the app).

## Guarantees

- Idempotency everywhere: scans, sync mutations, uploads, webhooks, queue jobs.
- Device timestamps preserved (`asset_scan_events.device_timestamp` vs `server_timestamp`).
- An asset can never end up in two places: order_assets unique constraints +
  state machine reject stale transitions, which is exactly what conflicts catch.
