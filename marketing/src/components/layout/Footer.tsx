import { Link } from 'react-router';
import { Mail, MapPin, Phone } from 'lucide-react';
import { navLinks, site } from '@/data/site';
import logo from '@/assets/logo.png';

const legalLinks = [
  { label: 'Privacy Policy', href: '/legal/privacy' },
  { label: 'Terms of Website Use', href: '/legal/terms' },
  { label: 'Rental Agreement Overview', href: '/legal/rental-agreement' },
  { label: 'Cancellation Policy', href: '/legal/cancellation' },
  { label: 'Delivery & Pickup Policy', href: '/legal/delivery-pickup' },
  { label: 'Accessibility Statement', href: '/legal/accessibility' },
  { label: 'Cookie & Analytics Notice', href: '/legal/cookies' },
];

export function Footer() {
  return (
    <footer className="bg-navy-800 text-white">
      <div className="container-site grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="inline-block rounded-lg bg-white p-2">
            <img src={logo} alt="Great Lakes Moving Totes" className="h-10 w-auto" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-navy-100">
            {site.serviceStatement} Locally owned and operated in the {site.region}.
          </p>
        </div>

        <nav aria-label="Footer site pages">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gold">Explore</h2>
          <ul className="mt-4 grid gap-2">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="text-sm text-navy-100 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer legal pages">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gold">Policies</h2>
          <ul className="mt-4 grid gap-2">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="text-sm text-navy-100 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gold">Contact</h2>
          <ul className="mt-4 grid gap-3 text-sm text-navy-100">
            <li>
              <a href={site.phoneHref} className="inline-flex items-center gap-2 hover:text-white">
                <Phone className="h-4 w-4 shrink-0" aria-hidden /> {site.phone}
              </a>
            </li>
            <li>
              <a href={site.emailHref} className="inline-flex items-center gap-2 hover:text-white">
                <Mail className="h-4 w-4 shrink-0" aria-hidden /> {site.email}
              </a>
            </li>
            <li className="inline-flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Serving Midland, Saginaw, Bay City & the {site.region}
              </span>
            </li>
            <li>{site.hours}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-6">
        <div className="container-site flex flex-col items-center justify-between gap-2 text-center text-xs text-navy-200 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} {site.legalName}. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <p>Equipment rental only — we do not transport customer belongings.</p>
            <a href="/login" className="font-semibold text-navy-100 hover:text-white">Staff login</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
