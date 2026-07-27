# 07 — Authentication Design

## Passwords

- PBKDF2-HMAC-SHA-256 via Web Crypto (Workers-native), 100,000 iterations, 16-byte random salt.
- Stored format: `pbkdf2$100000$<salt_b64>$<hash_b64>`. Constant-time comparison.
- No Node `crypto`, no bcrypt native modules.

## Sessions

- Login issues a 32-byte random token; only `SHA-256(token)` is stored in `sessions`.
- Cookie `glmt_session`: `HttpOnly; SameSite=Lax; Secure` (Secure outside local); expiry from
  `SESSION_TTL_HOURS` (default 12h), sliding `last_activity` refresh, absolute expiry enforced.
- Revocation: `sessions.revoked_at` set on logout / admin revoke / password change.
- Auth state never lives in localStorage; the PWA keeps only non-secret UI state there.

## Login flow

1. `POST /api/auth/login` { email, password, turnstileToken }.
2. Turnstile verified server-side when `TURNSTILE_ENABLED=true` (siteverify API).
3. Rate limit: per-email + per-IP counters; `users.failed_login_count` increments on failure,
   account locked (`locked_until = now + 15 min`) after 5 failures; lockout is logged.
4. Success: session row + cookie + `login_audit` row (IP, user agent), `failed_login_count` reset.

## Password reset

`POST /api/auth/forgot-password` → single-use token in `password_reset_tokens`
(SHA-256 stored, 30-min expiry) → emailed link `/reset-password?token=…` →
`POST /api/auth/reset-password` validates, updates hash, revokes all sessions.

## Authorization

- `requireUser(ctx)` in every protected route handler / server page → loads session + user + role.
- `requirePermission(ctx, "invoices.finalize")` checks the role→permission set
  (matrix in docs/08, seeded into `permissions` / `role_permissions`).
- Branch restriction: users with `branch_id` set (dispatcher/driver/warehouse) only see rows for
  their branch; owner/admin/accountant (`branch_id NULL`) see all. Enforced in repository
  queries via `scopeBranch(query, user)`.
- Customer portal uses a separate principal: customer-scoped session claim
  (`portal_customers` link by email) or signed links; portal queries filter `customer_id` only.

## MFA (optional per user)

TOTP secret on `users` (encrypted at rest via Workers AES-GCM with a secret key); when
`users.mfa_enabled = 1`, login requires a second step before the session is issued.

## CSRF & headers

- SameSite=Lax cookies + a synchronizer token (`glmt_csrf`) required on cookie-authenticated
  `POST/PUT/DELETE` from browser pages; JSON API calls from the PWA use Bearer session tokens.
- CSP: `default-src 'self'`, no inline scripts except Next-managed, `img-src 'self' data: blob:`,
  Turnstile/Stripe origins whitelisted when enabled. `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `nosniff` on all responses
  (set in `src/middleware.ts`).
