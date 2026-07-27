import { ValidationError } from "./errors";

export async function jsonBody<T extends Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as T;
  } catch {
    throw new ValidationError("Request body must be a JSON object");
  }
}

export function requiredString(value: unknown, label: string, max = 500): string {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new ValidationError(`${label} is too long`);
  return normalized;
}

export function optionalString(value: unknown, label: string, max = 500): string | null {
  if (value == null || value === "") return null;
  return requiredString(value, label, max);
}
