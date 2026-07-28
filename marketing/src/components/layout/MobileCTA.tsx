import { Link } from 'react-router';
import { CalendarCheck, Phone, User } from 'lucide-react';
import { config } from '@/lib/config';
import { site } from '@/data/site';

// Sticky mobile bottom action bar: Call / Check Availability / Customer Login
export function MobileCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur xl:hidden">
      <div className="grid grid-cols-3 divide-x divide-border">
        <a
          href={site.phoneHref}
          className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold text-navy-700"
        >
          <Phone className="h-5 w-5" aria-hidden />
          Call
        </a>
        <Link
          to="/book"
          className="flex flex-col items-center gap-1 bg-gold py-2.5 text-xs font-bold text-navy-900"
        >
          <CalendarCheck className="h-5 w-5" aria-hidden />
          Check Availability
        </Link>
        <a
          href={config.portalUrl}
          className="flex flex-col items-center gap-1 py-2.5 text-xs font-semibold text-navy-700"
        >
          <User className="h-5 w-5" aria-hidden />
          Login
        </a>
      </div>
    </div>
  );
}
