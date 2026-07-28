// Runtime configuration — production values come from environment variables.
// Copy .env.example to .env and fill in for your ToteOps deployment.

export const config = {
  /**
   * Base URL of the Great Lakes ToteOps public API (Cloudflare Workers).
   * Example: https://api.greatlakesmovingtotes.com
   * Empty string = same origin (this server hosts /api/public/* in the
   * full-stack deployment).
   */
  toteOpsApiUrl: (import.meta.env.VITE_TOTEOPS_API_URL ?? '').replace(/\/$/, ''),

  /**
   * When true (default), call the same-origin /api/public/* endpoints hosted
   * by this app. Set VITE_SAME_ORIGIN_API=false for the static-only build,
   * which falls back to the local simulation.
   */
  sameOriginApi: (import.meta.env.VITE_SAME_ORIGIN_API ?? 'true') === 'true',

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

/** True when the site is wired to the live ToteOps backend (remote or same-origin). */
export const isLiveBackend = config.toteOpsApiUrl.length > 0 || config.sameOriginApi;
