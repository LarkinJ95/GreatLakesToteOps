// Money is stored as integer cents everywhere. These are the only format/parse helpers.

export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100).toLocaleString("en-US");
  const rem = (abs % 100).toString().padStart(2, "0");
  return `${sign}$${dollars}.${rem}`;
}

/** Parse a user-entered dollar string ("1,234.56") into cents. Throws on invalid input. */
export function parseUsdToCents(input: string): number {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) throw new Error(`Invalid dollar amount: ${input}`);
  return Math.round(parseFloat(cleaned) * 100);
}

/** Tax in cents for a taxable amount at a percent rate, half-up rounding. */
export function taxCents(taxableCents: number, ratePercent: number): number {
  return Math.round((taxableCents * ratePercent) / 100);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + (isoDate.length === 10 ? "T00:00:00Z" : ""));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
  return d.toLocaleDateString("en-US", { timeZone: "America/Detroit", year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Detroit", year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}
