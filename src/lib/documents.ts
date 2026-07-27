// Document storage service: R2 bytes + D1 metadata + authorized access + signed links.
import type { Env } from "./cloudflare";
import { hmacSha256Hex, sha256Hex, verificationCodeFrom, base64url, fromBase64url, timingSafeEqualHex } from "./crypto";
import { id, nowIso, one, run, type Db } from "./db";
import { ForbiddenError, NotFoundError, ValidationError } from "./errors";
import type { AuthContext, DocumentRow, DocumentType } from "./types";

const ALLOWED_UPLOAD_MIME = new Map<string, string>([
  ["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"], ["application/pdf", ".pdf"],
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Magic-byte sniffing — never trust the declared content type alone. */
export function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length > 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  return null;
}

export interface StoreDocumentOpts {
  objectKey: string;
  fileName: string;
  documentType: DocumentType;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  templateVersion?: number | null;
  generatedBy?: string | null;
  signed?: boolean;
  retentionCategory?: string;
  accessClassification?: string;
}

/** Store bytes in R2 and register metadata in D1. Returns the documents row. */
export async function storeDocument(
  env: Pick<Env, "DB" | "DOCUMENTS"> & Partial<Env>,
  bytes: Uint8Array,
  mimeType: string,
  opts: StoreDocumentOpts,
): Promise<DocumentRow> {
  const checksum = await sha256Hex(bytes);
  const docId = id("doc");
  const secret = env.DOC_LINK_SECRET ?? "local-dev-only-change-me";
  const verificationCode = verificationCodeFrom(await hmacSha256Hex(secret, `${docId}:${checksum}`));

  await env.DOCUMENTS.put(opts.objectKey, bytes, {
    httpMetadata: { contentType: mimeType },
    customMetadata: { documentId: docId, checksum },
  });

  await run(
    env.DB,
    `INSERT INTO documents (id, object_key, bucket, file_name, mime_type, size_bytes, checksum_sha256,
       document_type, related_entity_type, related_entity_id, template_version, generated_by, generated_at,
       signed, retention_category, access_classification, verification_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    docId, opts.objectKey, "glmt-documents", opts.fileName, mimeType, bytes.length, checksum,
    opts.documentType, opts.relatedEntityType ?? null, opts.relatedEntityId ?? null,
    opts.templateVersion ?? null, opts.generatedBy ?? null, nowIso(),
    opts.signed ? 1 : 0, opts.retentionCategory ?? "operational_2y", opts.accessClassification ?? "internal",
    verificationCode,
  );
  const row = await one<DocumentRow>(env.DB, `SELECT * FROM documents WHERE id = ?`, docId);
  return row!;
}

export async function getDocument(db: Db, docId: string): Promise<DocumentRow> {
  const doc = await one<DocumentRow>(db, `SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL`, docId);
  if (!doc) throw new NotFoundError("Document");
  return doc;
}

/** Staff authorization for a document; customers may only access their own 'customer'-class docs. */
export function authorizeDocumentAccess(ctx: AuthContext, doc: DocumentRow): void {
  if (ctx.portalCustomerId) {
    if (doc.access_classification !== "customer" && doc.access_classification !== "financial") {
      throw new ForbiddenError("This document is not available in the customer portal");
    }
    if (doc.related_entity_type === "customer" && doc.related_entity_id !== ctx.portalCustomerId) {
      throw new ForbiddenError("This document belongs to a different customer");
    }
    return; // order/invoice-scoped docs are additionally checked by the caller
  }
  if (!ctx.permissions.has("documents.view") && !ctx.permissions.has("documents.download")) {
    throw new ForbiddenError();
  }
}

// ---- Short-lived signed download tokens (emails, portal links) ----

export async function createDownloadToken(env: Partial<Env>, docId: string, ttlMs = 10 * 60 * 1000): Promise<string> {
  const secret = env.DOC_LINK_SECRET ?? "local-dev-only-change-me";
  const payload = base64url(new TextEncoder().encode(`${docId}.${Date.now() + ttlMs}`));
  const sig = await hmacSha256Hex(secret, payload);
  return `${payload}.${sig.slice(0, 32)}`;
}

export async function verifyDownloadToken(env: Partial<Env>, token: string): Promise<string | null> {
  const secret = env.DOC_LINK_SECRET ?? "local-dev-only-change-me";
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await hmacSha256Hex(secret, payload);
  if (!timingSafeEqualHex(sig, expected.slice(0, 32))) return null;
  const [docId, expires] = new TextDecoder().decode(fromBase64url(payload)).split(".");
  if (!docId || Number(expires) < Date.now()) return null;
  return docId;
}

// ---- Validated uploads ----

export interface UploadValidation { bytes: Uint8Array; mimeType: string; fileName: string; }

export function validateUpload(fileName: string, declaredMime: string, bytes: Uint8Array): UploadValidation {
  if (bytes.length === 0) throw new ValidationError("Empty file");
  if (bytes.length > MAX_UPLOAD_BYTES) throw new ValidationError("File exceeds the 10 MB limit");
  const sniffed = sniffMime(bytes);
  if (!sniffed || !ALLOWED_UPLOAD_MIME.has(sniffed)) {
    throw new ValidationError("File type not allowed (JPEG, PNG, WebP, PDF only)");
  }
  if (declaredMime && declaredMime !== sniffed && !(declaredMime === "image/jpg" && sniffed === "image/jpeg")) {
    throw new ValidationError("File content does not match its declared type");
  }
  const safeName = fileName.replace(/[^\w.\- ]/g, "_").slice(0, 120) || `upload${ALLOWED_UPLOAD_MIME.get(sniffed)}`;
  return { bytes, mimeType: sniffed, fileName: safeName };
}

/** Build the authorized R2 response for a document. */
export async function documentResponse(env: Env, doc: DocumentRow, disposition: "inline" | "attachment"): Promise<Response> {
  const object = await env.DOCUMENTS.get(doc.object_key);
  if (!object) throw new NotFoundError("Document file");
  const safeName = doc.file_name.replace(/[^\w.\- ]/g, "_");
  return new Response(object.body, {
    headers: {
      "Content-Type": doc.mime_type,
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
      "Content-Length": String(doc.size_bytes),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
