import { one, q, run, nowIso, type Db } from "./db";
import type { CompanyInfo } from "./pdf/documents";

export async function getSetting(db: Db, key: string, fallback = ""): Promise<string> {
  const row = await one<{ setting_value: string }>(db, `SELECT setting_value FROM app_settings WHERE setting_key = ?`, key);
  return row?.setting_value ?? fallback;
}

export async function setSetting(db: Db, key: string, value: string, updatedBy?: string): Promise<void> {
  await run(
    db,
    `INSERT INTO app_settings (setting_key, setting_value, updated_at, updated_by) VALUES (?, ?, ?, ?)
     ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    key, value, nowIso(), updatedBy ?? null,
  );
}

export async function getAllSettings(db: Db): Promise<Record<string, string>> {
  const rows = await q<{ setting_key: string; setting_value: string }>(db, `SELECT setting_key, setting_value FROM app_settings`);
  return Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
}

export async function getCompanyInfo(db: Db): Promise<CompanyInfo> {
  const s = await getAllSettings(db);
  return {
    legalName: s["company.legal_name"] || "Great Lakes Moving Totes LLC",
    tagline: s["company.tagline"] || "Pack. Stack. Move. Done.",
    street: s["company.street"] || "",
    city: s["company.city"] || "",
    state: s["company.state"] || "MI",
    zip: s["company.zip"] || "",
    phone: s["company.phone"] || "",
    email: s["company.email"] || "",
  };
}
