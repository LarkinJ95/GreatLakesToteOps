import { ShieldCheck } from 'lucide-react';
import logo from '@/assets/logo.png';

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set('client_id', appID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'profile');
  url.searchParams.set('state', state);
  return url.toString();
}

// Staff sign-in for the ToteOps operations dashboard.
export function OpsLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="text-center">
          <img src={logo} alt="Great Lakes Moving Totes" className="mx-auto h-14 w-auto" />
          <h1 className="mt-5 text-2xl font-extrabold text-navy-700">ToteOps</h1>
          <p className="mt-1 text-sm text-charcoal-400">Operations dashboard — staff only</p>
        </div>
        <a
          href={getOAuthUrl()}
          className="btn-primary mt-8 w-full"
        >
          <ShieldCheck className="h-5 w-5" aria-hidden />
          Sign in with Kimi
        </a>
        <p className="mt-6 text-center text-xs text-charcoal-300">
          Authorized staff only. All activity is recorded in the audit log.
        </p>
      </div>
    </div>
  );
}
