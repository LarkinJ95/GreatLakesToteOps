// Typed HTTP client for the Great Lakes ToteOps public API (Cloudflare
// Workers + D1). All public endpoints are same-origin or CORS-scoped,
// rate-limited, and Turnstile-verified server-side. No D1/R2 credentials ever
// appear in browser code.

import { config } from '@/lib/config';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Cloudflare Turnstile token for spam-protected endpoints */
  turnstileToken?: string;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, turnstileToken, timeoutMs = 12000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${config.toteOpsApiUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(config.toteOpsPublicKey ? { 'X-Api-Key': config.toteOpsPublicKey } : {}),
        ...(turnstileToken ? { 'X-Turnstile-Token': turnstileToken } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      // Public marketing responses may be edge-cached by the API; private
      // availability/pricing/reservation responses must be no-store, which the
      // API enforces via Cache-Control headers.
      credentials: 'omit',
    });

    if (!res.ok) {
      let code: string | undefined;
      let message = `Request failed (${res.status})`;
      try {
        const err = (await res.json()) as { error?: string; code?: string };
        if (err.error) message = err.error;
        code = err.code;
      } catch {
        // non-JSON error body — keep generic message
      }
      throw new ApiError(res.status, message, code);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
