import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Menu, Phone, User, X } from 'lucide-react';
import { announcement, navLinks, site } from '@/data/site';
import { config } from '@/lib/config';
import logo from '@/assets/logo.png';

export function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const primaryNav = navLinks.filter((l) =>
    ['/', '/how-it-works', '/pricing', '/service-areas', '/moving-totes'].includes(l.href)
  );
  const moreNav = navLinks.filter((l) => !primaryNav.includes(l));

  return (
    <>
      {/* Skip navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-navy-700 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      {/* Announcement bar */}
      {announcement.status === 'published' && (
        <div className="bg-navy-700 px-4 py-2 text-center text-sm font-medium text-white">
          <p>{announcement.message}</p>
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
        <div className="container-site flex h-16 items-center justify-between gap-4 lg:h-20">
          <Link to="/" className="flex shrink-0 items-center" aria-label="Great Lakes Moving Totes — home">
            <img src={logo} alt="Great Lakes Moving Totes — Pack. Stack. Move. Done." className="h-9 w-auto lg:h-11" />
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Primary" className="hidden items-center gap-1 xl:flex">
            {primaryNav.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                end={link.href === '/'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-mist text-navy-700' : 'text-charcoal-500 hover:bg-mist hover:text-navy-700'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="group relative">
              <button
                className="rounded-md px-3 py-2 text-sm font-semibold text-charcoal-500 transition-colors hover:bg-mist hover:text-navy-700"
                aria-haspopup="true"
              >
                More
              </button>
              <div className="invisible absolute right-0 top-full z-50 w-56 rounded-xl border border-border bg-white p-2 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                {moreNav.map((link) => (
                  <NavLink
                    key={link.href}
                    to={link.href}
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-2 text-sm font-medium ${
                        isActive ? 'bg-mist text-navy-700' : 'text-charcoal-500 hover:bg-mist'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>

          {/* Right actions */}
          <div className="hidden items-center gap-3 xl:flex">
            <a
              href={config.portalUrl}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-teal"
            >
              <User className="h-4 w-4" aria-hidden />
              Staff Login
            </a>
            <Link to="/book" className="btn-gold !px-5 !py-2.5 !text-sm">
              Check Availability
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="rounded-md p-2 text-navy-700 hover:bg-mist xl:hidden"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>

        {/* Mobile nav */}
        {open && (
          <nav aria-label="Mobile" className="border-t border-border bg-white xl:hidden">
            <div className="container-site grid gap-1 py-4">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  end={link.href === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-4 py-3 text-base font-semibold ${
                      isActive || location.pathname === link.href
                        ? 'bg-mist text-navy-700'
                        : 'text-charcoal-500 hover:bg-mist'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <div className="mt-3 grid gap-2 border-t border-border pt-4">
                <Link to="/book" onClick={() => setOpen(false)} className="btn-gold">
                  Check Availability
                </Link>
                <a href={config.portalUrl} onClick={() => setOpen(false)} className="btn-outline">
                  <User className="h-4 w-4" aria-hidden /> Staff Login
                </a>
                <a href={site.phoneHref} className="btn-outline">
                  <Phone className="h-4 w-4" aria-hidden /> {site.phone}
                </a>
              </div>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
