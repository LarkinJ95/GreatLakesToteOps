// Typed D1 repository helpers. All SQL is parameterized; multi-write flows use db.batch().

export type Db = D1Database;

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export async function q<T = Record<string, unknown>>(db: Db, sql: string, ...params: unknown[]): Promise<T[]> {
  const res = await db.prepare(sql).bind(...(params as never[])).all<T>();
  return res.results ?? [];
}

export async function one<T = Record<string, unknown>>(db: Db, sql: string, ...params: unknown[]): Promise<T | null> {
  const res = await db.prepare(sql).bind(...(params as never[])).first<T>();
  return res ?? null;
}

export async function run(db: Db, sql: string, ...params: unknown[]): Promise<D1Result> {
  return db.prepare(sql).bind(...(params as never[])).run();
}

export function stmt(db: Db, sql: string, ...params: unknown[]): D1PreparedStatement {
  return db.prepare(sql).bind(...(params as never[]));
}

/** Escape user input for a LIKE pattern. */
export function likePattern(input: string): string {
  return `%${input.replace(/[%_\\]/g, (c) => "\\" + c)}%`;
}

/** HTML-escape any user-supplied string before inserting into document/page HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Optimistic-concurrency update: throws ConflictError (via caller) when 0 rows change. */
export async function updateWithVersion(
  db: Db, table: string, rowId: string, expectedVersion: number,
  sets: Record<string, unknown>,
): Promise<number> {
  const keys = Object.keys(sets);
  const sql = `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(", ")}, version = version + 1, updated_at = ?
    WHERE id = ? AND version = ?`;
  const res = await run(db, sql, ...keys.map((k) => sets[k]), nowIso(), rowId, expectedVersion);
  return res.meta.changes ?? 0;
}

export interface PageParams { limit: number; offset: number; }
export function pageParams(url: URL, defaultLimit = 50): PageParams {
  const limit = Math.min(Number(url.searchParams.get("limit")) || defaultLimit, 200);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
  return { limit, offset };
}
