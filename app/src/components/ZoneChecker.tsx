import { useState } from 'react';
import { Link } from 'react-router';
import { Loader2, MapPin } from 'lucide-react';
import { checkServiceArea, type ZoneCheckResult } from '@/lib/api';

// Service-area checker — production flow: geocode exact address, test against
// zone polygons + mileage rules, then continue to availability checking.
export function ZoneChecker({ compact = false }: { compact?: boolean }) {
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ZoneCheckResult | null>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await checkServiceArea({ street, city, zip });
    setResult(res);
    setLoading(false);
  }

  return (
    <div className={compact ? '' : 'rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8'}>
      <form onSubmit={handleCheck} className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
        <div>
          <label htmlFor="zc-street" className="mb-1.5 block text-sm font-semibold text-navy-700">
            Street address
          </label>
          <input
            id="zc-street"
            type="text"
            autoComplete="street-address"
            placeholder="123 Main St"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className="w-full rounded-lg border border-input bg-white px-4 py-3 text-base"
          />
        </div>
        <div>
          <label htmlFor="zc-city" className="mb-1.5 block text-sm font-semibold text-navy-700">
            City
          </label>
          <input
            id="zc-city"
            type="text"
            autoComplete="address-level2"
            placeholder="Midland"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border border-input bg-white px-4 py-3 text-base"
          />
        </div>
        <div>
          <label htmlFor="zc-zip" className="mb-1.5 block text-sm font-semibold text-navy-700">
            ZIP code <span aria-hidden="true" className="text-red-600">*</span>
          </label>
          <input
            id="zc-zip"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="48640"
            required
            pattern="[0-9]{5}"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            className="w-full rounded-lg border border-input bg-white px-4 py-3 text-base"
          />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={loading} className="btn-gold w-full sm:w-auto">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <MapPin className="h-5 w-5" aria-hidden />}
            Check
          </button>
        </div>
      </form>

      {result && (
        <div
          role="status"
          className={`mt-5 rounded-xl border p-4 ${
            result.status === 'in-zone'
              ? 'border-teal/30 bg-teal-50 text-teal-800'
              : 'border-gold-300 bg-gold-50 text-gold-800'
          }`}
        >
          <p className="font-semibold">{result.message}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {result.status === 'in-zone' ? (
              <Link to="/book" className="btn-primary !px-5 !py-2.5 !text-sm">
                Continue to Availability
              </Link>
            ) : (
              <Link to="/contact?type=custom-quote" className="btn-primary !px-5 !py-2.5 !text-sm">
                Request a Custom Quote
              </Link>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-charcoal-300">
        Final eligibility is confirmed from your exact address during booking — a ZIP match alone
        does not guarantee service where distance or routing rules apply.
      </p>
    </div>
  );
}
