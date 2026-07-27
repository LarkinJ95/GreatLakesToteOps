// Workers-native cryptography (Web Crypto only — no Node modules).

const PBKDF2_ITERATIONS = 100_000;
const enc = new TextEncoder();

function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const arr = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
  return arr;
}

export function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function fromHex(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr;
}

export function base64url(bytes: ArrayBuffer | Uint8Array): string {
  return toB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64url(s: string): Uint8Array {
  return fromB64(s.replace(/-/g, "+").replace(/_/g, "/"));
}

export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export async function sha256Hex(data: string | ArrayBuffer | Uint8Array): Promise<string> {
  const buf = typeof data === "string" ? enc.encode(data) : data;
  return toHex(await crypto.subtle.digest("SHA-256", buf as BufferSource));
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

export async function hmacSha256Bytes(secret: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", secret as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, message as BufferSource));
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key, 256,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterStr, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterStr || !saltB64 || !hashB64) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromB64(saltB64) as BufferSource, iterations: Number(iterStr), hash: "SHA-256" },
    key, 256,
  );
  const computed = toB64(bits);
  return timingSafeEqualHex(
    Array.from(computed).map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join(""),
    Array.from(hashB64).map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join(""),
  );
}

/** Human-readable document verification code: GLMT-XXXX-XXXX-XXXX (HMAC-derived). */
export function verificationCodeFrom(hmacHex: string): string {
  const clean = hmacHex.toUpperCase().replace(/[^0-9A-F]/g, "");
  const alpha = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alpha[parseInt(clean[i * 2] ?? "0", 16) % alpha.length];
    if (i === 3 || i === 7) out += "-";
  }
  return `GLMT-${out}`;
}
