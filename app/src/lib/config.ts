// Runtime configuration — production values come from environment variables.
// Copy .env.example to .env and fill in for your ToteOps deployment.

export const config = {
  /**
   * Base URL of the Great Lakes ToteOps public API (Cloudflare Workers).
   * Example: https://api.greatlakesmovingtotes.com
   * Leave empty in development to use the built-in local simulation.
   */
  toteOpsApiUrl: (import.meta.env.VITE_TOTEOPS_API_URL ?? '').replace(/\/$/, ''),

  /**
   * Public API key sent as X-Api-Key on public endpoints. The Workers API
   * should scope this key to unauthenticated public routes only — it is
   * visible in browser code by design and must never grant admin access.
   */
  toteOpsPublicKey: import.meta.env.VITE_TOTEOPS_PUBLIC_KEY ?? '',

  /**
   * Cloudflare Turnstile site key. When set, spam-protected forms render the
   * Turnstile widget and the token is verified server-side by the API.
   */
  turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '',

  /** Customer portal URL on the ToteOps app (agreement, payment, account). */
  portalUrl: import.meta.env.VITE_PORTAL_URL ?? '/login',
} as const;

/** True when the site is wired to the live ToteOps backend. */
export const isLiveBackend = config.toteOpsApiUrl.length > 0;
