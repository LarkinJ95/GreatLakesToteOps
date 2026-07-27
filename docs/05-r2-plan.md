# 05 — R2 Bucket & Object-Key Plan

One private bucket per environment: `glmt-documents`, `glmt-documents-preview`, `glmt-documents-staging`.
No public bucket, no public URLs. Every read goes through an authorized Worker endpoint.

## Object-key layout

```
agreements/templates/{templateId}/{version}.html
agreements/orders/{orderId}/{agreementId}.pdf            unsigned
agreements/orders/{orderId}/{agreementId}-signed.pdf     signed
invoices/{year}/{month}/{invoiceId}.pdf
quotes/{year}/{month}/{quoteId}.pdf
receipts/{year}/{month}/{receiptId}.pdf
credit-memos/{year}/{month}/{creditMemoId}.pdf
statements/{businessAccountId}/{year}/{month}.pdf
orders/{orderId}/delivery/{fileId}.jpg
orders/{orderId}/pickup/{fileId}.jpg
orders/{orderId}/damage/{fileId}.jpg
signatures/{entityType}/{entityId}/{signatureId}.png
assets/labels/{batchId}.pdf
reports/{reportType}/{year}/{month}/{fileId}
uploads/{customerId}/{fileId}
tax-exemptions/{customerId}/{fileId}
vehicles/{vehicleId}/{fileId}
previews/{documentType}/{entityId}.html
```

## D1 `documents` metadata (one row per object)

`id, object_key, bucket, file_name, mime_type, size_bytes, checksum_sha256, document_type,
related_entity_type, related_entity_id, template_version, generated_by, generated_at,
signed (0/1), retention_category, access_classification, verification_code, deleted_at`

- `checksum_sha256` computed at write; re-verified on sensitive reads.
- `verification_code`: human-readable `GLMT-XXXX-XXXX-XXXX` derived from HMAC(checksum, DOC_LINK_SECRET) — printed on PDFs, checked on `/verify`.
- `access_classification`: `internal`, `customer`, `financial`, `restricted` — drives authorization.
- `retention_category`: `permanent`, `financial_7y`, `operational_2y`, `temporary_30d` — drives the retention cron.

## Read path (authorized endpoint)

`GET /api/documents/{id}/download?disposition=inline|attachment&token=…`

1. Load `documents` row; 404 if soft-deleted.
2. Authorize: staff by role permission + branch; customers only their own `customer`-class docs.
3. For browser-direct downloads, issue a short-lived (10 min) HMAC token
   `base64url(docId.expires).signature` signed with `DOC_LINK_SECRET` — no session needed,
   used from emails and the customer portal.
4. Stream from R2 with the stored `mime_type`, a safe `Content-Disposition` filename,
   `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`.
5. Sensitive classes (`financial`, `restricted`) write an `audit_logs` access entry.

## Upload path

- Staff/customer uploads `POST /api/uploads` (multipart or base64) → validate MIME against an
  allow-list (`image/jpeg|png|webp`, `application/pdf`), 10 MB limit, extension check, then
  `DOCUMENTS.put` + `documents` insert in one flow. Photos from the field go through the
  offline attachment path (`docs/13`) with the same validation on the server.
- Malware-risk controls: MIME sniffing by magic bytes (not just extension), size caps,
  private bucket, no executable types, images re-served with `nosniff`.
