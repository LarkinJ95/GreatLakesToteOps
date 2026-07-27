import { useState } from 'react';
import { Link } from 'react-router';
import { Loader2, Mail } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { useSeo } from '@/hooks/useSeo';
import { site } from '@/data/site';

// Customer portal handoff — production links securely to the Great Lakes
// ToteOps customer portal with a secure email link (no password stored here).
export function Login() {
  useSeo({
    title: 'Customer Login',
    description: 'Log in to the Great Lakes Moving Totes customer portal to view your reservation, agreement, and delivery details.',
  });

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 700));
    setSending(false);
    setSent(true);
  }

  return (
    <main id="main-content">
      <section className="bg-mist py-14 lg:py-24">
        <div className="container-site max-w-md">
          <SectionHeader eyebrow="Customer portal" title="Log in to your account" align="center" />
          <div className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
            {sent ? (
              <div role="status" className="grid gap-3 text-center">
                <Mail className="mx-auto h-10 w-10 text-teal" aria-hidden />
                <h2 className="text-xl font-bold text-navy-700">Check your email</h2>
                <p className="text-sm text-charcoal-500">
                  If an account exists for <strong>{email}</strong>, a secure sign-in link is on its
                  way. The link expires shortly and can be used once.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4">
                <p className="text-sm text-charcoal-500">
                  Enter the email on your reservation and we will send a secure sign-in link — no
                  password to remember.
                </p>
                <div>
                  <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-navy-700">Email</label>
                  <input id="login-email" type="email" required autoComplete="email"
                    className="w-full rounded-lg border border-input bg-white px-4 py-3 text-base"
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <button type="submit" disabled={sending} className="btn-gold w-full">
                  {sending ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Sending…</> : 'Email Me a Sign-In Link'}
                </button>
              </form>
            )}
            <p className="mt-6 border-t border-border pt-4 text-center text-sm text-charcoal-400">
              No reservation yet?{' '}
              <Link to="/book" className="font-semibold text-teal hover:text-teal-600">Check availability</Link>
              {' '}or call <a href={site.phoneHref} className="font-semibold text-teal">{site.phone}</a>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
