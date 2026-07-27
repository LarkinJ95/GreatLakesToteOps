import { one, run, type Db } from "./db";

export type DocType =
  | "order" | "quote" | "invoice" | "credit_memo" | "receipt" | "agreement" | "assignment" | "audit";

const DEFAULT_FORMATS: Record<DocType, string> = {
  order: "GLMT-ORD-{year}-{seq:6}",
  quote: "GLMT-QTE-{year}-{seq:6}",
  invoice: "GLMT-INV-{year}-{seq:6}",
  credit_memo: "GLMT-CRM-{year}-{seq:6}",
  receipt: "GLMT-RCT-{year}-{seq:6}",
  agreement: "GLMT-AGR-{year}-{seq:6}",
  assignment: "GLMT-ASN-{year}-{seq:6}",
  audit: "GLMT-AUD-{year}-{seq:6}",
};

/**
 * Allocate the next collision-resistant document number.
 * The counter row is incremented atomically (UPDATE ... RETURNING) and the caller
 * inserts the row carrying the UNIQUE number column in the same batch/request.
 */
export async function nextDocumentNumber(db: Db, docType: DocType, at?: Date): Promise<string> {
  const year = (at ?? new Date()).getUTCFullYear();
  await run(
    db,
    `INSERT OR IGNORE INTO document_counters (doc_type, year, next_value) VALUES (?, ?, 1)`,
    docType, year,
  );
  const row = await one<{ next_value: number }>(
    db,
    `UPDATE document_counters SET next_value = next_value + 1 WHERE doc_type = ? AND year = ? RETURNING next_value`,
    docType, year,
  );
  const seq = (row?.next_value ?? 2) - 1;

  const setting = await one<{ setting_value: string }>(
    db, `SELECT setting_value FROM app_settings WHERE setting_key = ?`, `numbering.${docType}`,
  );
  const format = setting?.setting_value ?? DEFAULT_FORMATS[docType];
  return format
    .replace("{year}", String(year))
    .replace(/\{seq:(\d+)\}/, (_, width) => String(seq).padStart(Number(width), "0"));
}
