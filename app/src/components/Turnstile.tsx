import { useEffect, useRef } from 'react';
import { config } from '@/lib/config';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void }
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Turnstile'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile widget. Renders only when VITE_TURNSTILE_SITE_KEY is
 * configured; otherwise renders nothing (development/preview mode). The token
 * is verified server-side by the ToteOps API on every spam-protected form.
 */
export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!config.turnstileSiteKey || !containerRef.current) return;

    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: config.turnstileSiteKey,
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(null),
        });
      })
      .catch(() => onToken(null));

    return () => {
      cancelled = true;
    };
  }, [onToken]);

  if (!config.turnstileSiteKey) return null;

  return <div ref={containerRef} className="cf-turnstile" aria-label="Spam protection" />;
}
