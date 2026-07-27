import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CheckCircle2, Loader2, Mail, MapPin, Phone, User } from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { Turnstile } from '@/components/Turnstile';
import { useSeo } from '@/hooks/useSeo';
import { submitLead } from '@/lib/api';
import { config } from '@/lib/config';
import { site } from '@/data/site';
import { cities } from '@/data/zones';

const inquiryTypes = [
  { value: 'contact', label: 'General question' },
  { value: 'business', label: 'Business account request' },
  { value: 'custom-quote', label: 'Custom quote / outside service area' },
  { value: 'referral', label: 'Realtor or referral partnership' },
  { value: 'order-support', label: 'Existing-order support' },
] as const;

const inputCls = 'w-full rounded-lg border border-input bg-white px-4 py-3 text-base';
const labelCls = 'mb-1.5 block text-sm font-semibold text-navy-700';

export function Contact() {
  useSeo({
    title: 'Contact Us',
    description:
      'Questions about tote rentals, business accounts, custom quotes, or an existing order? Reach Great Lakes Moving Totes by phone, email, or the contact form.',
  });

  const [params] = useSearchParams();
  const initialType = inquiryTypes.some((t) => t.value === params.get('type'))
    ? (params.get('type') as (typeof inquiryTypes)[number]['value'])
    : 'contact';

  const [type, setType] = useState<string>(initialType);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '', orderNumber: '', consent: false });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleTurnstile = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);

  const valid =
    form.name.trim().length >= 2 &&
    /.+@.+\..+/.test(form.email) &&
    form.message.trim().length >= 10 &&
    form.consent;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setStatus('sending');
    setError(null);
    try {
      const res = await submitLead({
        type: type as never,
        payload: { ...form },
        turnstileToken: turnstileToken ?? undefined,
      });
      setReference(res.reference);
      setStatus('sent');
    } catch (err) {
      setStatus('idle');
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong sending your message. Please try again or call us.'
      );
    }
  }

  return (
    <main id="main-content">
      <section className="wave-bg bg-mist py-14 lg:py-20">
        <div className="container-site">
          <SectionHeader
            eyebrow="Contact"
            title="Talk to a real person"
            lead="Questions about a rental, a business account, or an address outside our standard routes? We answer directly — no ticket queues."
          />
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          {/* Contact info */}
          <div className="grid content-start gap-4">
            <a href={site.phoneHref} className="card-lift flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50"><Phone className="h-5 w-5 text-teal" aria-hidden /></span>
              <span><span className="block text-sm text-charcoal-300">Call or text</span><span className="font-bold text-navy-700">{site.phone}</span></span>
            </a>
            <a href={site.emailHref} className="card-lift flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50"><Mail className="h-5 w-5 text-teal" aria-hidden /></span>
              <span><span className="block text-sm text-charcoal-300">Email</span><span className="font-bold text-navy-700">{site.email}</span></span>
            </a>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <span className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50"><MapPin className="h-5 w-5 text-teal" aria-hidden /></span>
                <span><span className="block text-sm text-charcoal-300">Service area</span><span className="font-bold text-navy-700">{cities.filter((c) => c.zips.length > 0).map((c) => c.name).join(', ')} & surrounding communities</span></span>
              </span>
              <p className="mt-3 text-xs text-charcoal-300">
                We do not publish our storage location — all deliveries run on scheduled routes.
              </p>
            </div>
            <div className="rounded-2xl bg-navy-700 p-5 text-white">
              <p className="font-bold text-gold">Service hours</p>
              <p className="mt-1 text-sm text-navy-100">{site.hours}</p>
              <p className="mt-3 font-bold text-gold">Existing customer?</p>
              <a href={config.portalUrl} className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-white underline-offset-4 hover:underline">
                <User className="h-4 w-4" aria-hidden /> Log in to the customer portal
              </a>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
            {status === 'sent' ? (
              <div className="grid gap-4 py-10 text-center" role="status">
                <CheckCircle2 className="mx-auto h-12 w-12 text-teal" aria-hidden />
                <h2 className="text-2xl font-bold text-navy-700">Message received</h2>
                <p className="text-charcoal-500">
                  Reference <strong>{reference}</strong>. We will follow up at {form.email} shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4" noValidate={false}>
                <div>
                  <label htmlFor="c-type" className={labelCls}>What is this about?</label>
                  <select id="c-type" className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
                    {inquiryTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="c-name" className={labelCls}>Name</label>
                    <input id="c-name" className={inputCls} autoComplete="name" required
                      value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="c-email" className={labelCls}>Email</label>
                    <input id="c-email" type="email" className={inputCls} autoComplete="email" required
                      value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="c-phone" className={labelCls}>Phone (optional)</label>
                    <input id="c-phone" type="tel" className={inputCls} autoComplete="tel"
                      value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="c-company" className={labelCls}>Company (if applicable)</label>
                    <input id="c-company" className={inputCls} autoComplete="organization"
                      value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                </div>
                {type === 'order-support' && (
                  <div>
                    <label htmlFor="c-order" className={labelCls}>Order number</label>
                    <input id="c-order" className={inputCls} placeholder="GLT-…"
                      value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} />
                  </div>
                )}
                <div>
                  <label htmlFor="c-message" className={labelCls}>Message</label>
                  <textarea id="c-message" className={inputCls} rows={5} required
                    value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder={type === 'custom-quote' ? 'Tell us both addresses and your dates…' : 'How can we help?'} />
                </div>
                <label className="flex items-start gap-3 text-sm text-charcoal-500">
                  <input type="checkbox" required checked={form.consent}
                    onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                    className="mt-0.5 h-5 w-5 rounded border-input text-teal" />
                  I consent to {site.legalName} contacting me about this inquiry.
                </label>
                <Turnstile onToken={handleTurnstile} />
                {error && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                    {error}
                  </p>
                )}
                <p className="text-xs text-charcoal-300">
                  Protected by spam controls and rate limiting (Cloudflare Turnstile, verified
                  server-side). We never share your information.
                </p>
                <button type="submit" disabled={!valid || status === 'sending'} className="btn-gold disabled:cursor-not-allowed disabled:opacity-50">
                  {status === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Sending…</> : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
