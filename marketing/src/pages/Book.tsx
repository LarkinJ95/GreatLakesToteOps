import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ArrowLeft, ArrowRight, BadgeCheck, CalendarPlus, Check, Loader2, PartyPopper,
} from 'lucide-react';
import { SectionHeader } from '@/components/SectionHeader';
import { Turnstile } from '@/components/Turnstile';
import { useSeo } from '@/hooks/useSeo';
import { packages, addOns, currentPrice, getPackageBySlug } from '@/data/packages';
import { findCityByZip, getZone } from '@/data/zones';
import { rentalTypes } from '@/data/content';
import {
  checkAvailability, calculatePrice, quotePrice, submitLead,
  type AvailabilityResult, type PriceSummary,
} from '@/lib/api';
import { config, isLiveBackend } from '@/lib/config';
import { site } from '@/data/site';

const steps = [
  'Rental Type', 'Addresses', 'Dates', 'Package', 'Add-Ons',
  'Your Info', 'Review', 'Agreement', 'Payment', 'Confirmation',
];

interface AddressFields {
  street: string;
  city: string;
  zip: string;
}

const emptyAddress: AddressFields = { street: '', city: '', zip: '' };

const inputCls =
  'w-full rounded-lg border border-input bg-white px-4 py-3 text-base';
const labelCls = 'mb-1.5 block text-sm font-semibold text-navy-700';

export function Book() {
  useSeo({
    title: 'Check Availability & Reserve Totes',
    description:
      'Check availability and reserve reusable moving totes online — choose a package, dates, delivery and pickup addresses, and add-ons.',
  });

  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [rentalType, setRentalType] = useState<string>('Moving');
  const [delivery, setDelivery] = useState<AddressFields>(emptyAddress);
  const [pickup, setPickup] = useState<AddressFields>(emptyAddress);
  const [sameAddress, setSameAddress] = useState(true);
  const [propertyType, setPropertyType] = useState('House');
  const [stairs, setStairs] = useState('No');
  const [elevator, setElevator] = useState('No');
  const [access, setAccess] = useState('');
  const [contactless, setContactless] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [deliveryWindow, setDeliveryWindow] = useState('Morning (8–11 AM)');
  const [pickupWindow, setPickupWindow] = useState('Morning (8–11 AM)');
  const [packageSlug, setPackageSlug] = useState(params.get('package') ?? 'home');
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [addOnSel, setAddOnSel] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    businessName: '', referral: '', promo: '',
  });
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [signature, setSignature] = useState('');
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full' | 'terms'>('full');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ reference: string } | null>(null);
  const [serverQuote, setServerQuote] = useState<(PriceSummary & { quoteId?: string }) | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const pkg = getPackageBySlug(packageSlug) ?? packages.find((p) => p.featured)!;

  const effectivePickup = sameAddress ? delivery : pickup;

  const zoneInfo = useMemo(() => {
    const city = findCityByZip(delivery.zip.trim());
    return city ? { city, zone: getZone(city.zoneId) } : null;
  }, [delivery.zip]);

  const localPrice = useMemo(
    () =>
      calculatePrice({
        pkg,
        zoneId: zoneInfo?.zone?.id ?? null,
        addOnSelections: addOnSel,
        promoCode: customer.promo,
      }),
    [pkg, zoneInfo, addOnSel, customer.promo]
  );

  // Authoritative price: server quote when the live backend is configured,
  // local estimate otherwise. The server recalculates from D1 and stores a
  // pricing snapshot with the quote.
  const price = serverQuote ?? localPrice;

  useEffect(() => {
    if (step !== 6 || !isLiveBackend) return;
    let cancelled = false;
    setQuoting(true);
    quotePrice({
      packageSlug,
      zoneId: zoneInfo?.zone?.id ?? null,
      addOnSelections: addOnSel,
      promoCode: customer.promo,
      deliveryDate,
      pickupDate,
    })
      .then((q) => {
        if (!cancelled) setServerQuote(q);
      })
      .catch(() => {
        // Keep the local estimate if the quote endpoint is unreachable —
        // final pricing is still re-validated at reservation submission.
        if (!cancelled) setServerQuote(null);
      })
      .finally(() => {
        if (!cancelled) setQuoting(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const minDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  function addressBlock(
    label: string,
    value: AddressFields,
    onChange: (a: AddressFields) => void,
    prefix: string
  ) {
    return (
      <fieldset className="rounded-xl border border-border p-4">
        <legend className="px-2 text-sm font-bold text-navy-700">{label}</legend>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <label htmlFor={`${prefix}-street`} className={labelCls}>Street</label>
            <input id={`${prefix}-street`} className={inputCls} autoComplete="street-address"
              value={value.street} onChange={(e) => onChange({ ...value, street: e.target.value })} required />
          </div>
          <div>
            <label htmlFor={`${prefix}-city`} className={labelCls}>City</label>
            <input id={`${prefix}-city`} className={inputCls} autoComplete="address-level2"
              value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} required />
          </div>
          <div>
            <label htmlFor={`${prefix}-zip`} className={labelCls}>ZIP</label>
            <input id={`${prefix}-zip`} className={inputCls} inputMode="numeric" pattern="[0-9]{5}"
              autoComplete="postal-code" value={value.zip}
              onChange={(e) => onChange({ ...value, zip: e.target.value })} required />
          </div>
        </div>
      </fieldset>
    );
  }

  async function runAvailabilityCheck() {
    setCheckingAvailability(true);
    const res = await checkAvailability({
      packageSlug,
      deliveryDate,
      pickupDate,
      deliveryZip: delivery.zip,
    });
    setAvailability(res);
    setCheckingAvailability(false);
  }

  function canContinue(): boolean {
    switch (step) {
      case 0: return !!rentalType;
      case 1:
        return (
          !!delivery.street && !!delivery.city && delivery.zip.length === 5 &&
          (sameAddress || (!!pickup.street && !!pickup.city && pickup.zip.length === 5))
        );
      case 2: return !!deliveryDate && !!pickupDate && pickupDate >= deliveryDate;
      case 3: return !!pkg && !!availability && availability.status !== 'outside-area';
      case 5:
        return !!customer.firstName && !!customer.lastName &&
          /.+@.+\..+/.test(customer.email) && customer.phone.length >= 10;
      case 7: return agreementAccepted && signature.trim().length >= 2;
      default: return true;
    }
  }

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleTurnstile = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);

  async function next() {
    if (step === 2) {
      setStep(3);
      await runAvailabilityCheck();
      return;
    }
    if (step === 8) {
      setSubmitting(true);
      setSubmitError(null);
      try {
        const res = await submitLead({
          type: 'reservation',
          turnstileToken: turnstileToken ?? undefined,
          payload: {
            rentalType, delivery, pickup: effectivePickup, propertyType, stairs, elevator,
            access, contactless, deliveryDate, pickupDate, deliveryWindow, pickupWindow,
            packageSlug, addOns: addOnSel, customer, paymentOption,
            estimatedTotal: price.estimatedTotal, quoteId: serverQuote?.quoteId,
          },
        });
        setConfirmation({ reference: res.reference });
        setStep(9);
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : 'Something went wrong submitting your reservation. Please try again or call us.'
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setStep((s) => Math.min(s + 1, 9));
  }

  return (
    <main id="main-content">
      <section className="bg-mist py-10 lg:py-14">
        <div className="container-site">
          <SectionHeader
            eyebrow="Reserve"
            title="Check availability & book"
            lead="No account required to check dates and pricing. Your reservation is confirmed after the agreement and payment steps."
          />
        </div>
      </section>

      <section className="bg-white py-10 lg:py-14">
        <div className="container-site max-w-4xl">
          {/* Progress indicator */}
          <nav aria-label="Booking progress" className="mb-10">
            <ol className="flex flex-wrap items-center gap-1.5">
              {steps.map((label, i) => (
                <li key={label} className="flex items-center gap-1.5">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      i < step
                        ? 'bg-teal text-white'
                        : i === step
                          ? 'bg-gold text-navy-900'
                          : 'bg-mist text-charcoal-300'
                    }`}
                    aria-current={i === step ? 'step' : undefined}
                  >
                    {i < step ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                  </span>
                  <span className={`hidden text-xs font-semibold sm:inline ${i === step ? 'text-navy-700' : 'text-charcoal-300'}`}>
                    {label}
                  </span>
                  {i < steps.length - 1 && <span className="h-px w-3 bg-border" aria-hidden />}
                </li>
              ))}
            </ol>
          </nav>

          {/* Step 1: Rental type */}
          {step === 0 && (
            <fieldset>
              <legend className="text-xl font-bold text-navy-700">What is this rental for?</legend>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {rentalTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setRentalType(t)}
                    aria-pressed={rentalType === t}
                    className={`rounded-xl border-2 px-4 py-4 text-sm font-bold transition-colors ${
                      rentalType === t
                        ? 'border-teal bg-teal-50 text-teal-800'
                        : 'border-border bg-white text-charcoal-500 hover:border-teal-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Step 2: Addresses */}
          {step === 1 && (
            <div className="grid gap-5">
              <h2 className="text-xl font-bold text-navy-700">Where are we delivering and picking up?</h2>
              {addressBlock('Delivery address', delivery, setDelivery, 'del')}
              <label className="flex items-center gap-3 rounded-xl bg-mist px-4 py-3 text-sm font-semibold text-navy-700">
                <input type="checkbox" checked={sameAddress} onChange={(e) => setSameAddress(e.target.checked)}
                  className="h-5 w-5 rounded border-input text-teal" />
                Pick up from the same address
              </label>
              {!sameAddress && addressBlock('Pickup address', pickup, setPickup, 'pick')}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="prop-type" className={labelCls}>Property type</label>
                  <select id="prop-type" className={inputCls} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    {['House', 'Apartment', 'Condo', 'Office', 'Storage facility', 'Other'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="stairs" className={labelCls}>Stairs at delivery?</label>
                  <select id="stairs" className={inputCls} value={stairs} onChange={(e) => setStairs(e.target.value)}>
                    {['No', 'Yes — a few steps', 'Yes — multiple flights'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="elevator" className={labelCls}>Elevator available?</label>
                  <select id="elevator" className={inputCls} value={elevator} onChange={(e) => setElevator(e.target.value)}>
                    {['No', 'Yes', 'N/A'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="access" className={labelCls}>Parking, gate, or access notes (optional)</label>
                <textarea id="access" className={inputCls} rows={2} value={access}
                  onChange={(e) => setAccess(e.target.value)}
                  placeholder="Gate code, long driveway, lobby drop-off…" />
              </div>
              <label className="flex items-center gap-3 text-sm font-semibold text-navy-700">
                <input type="checkbox" checked={contactless} onChange={(e) => setContactless(e.target.checked)}
                  className="h-5 w-5 rounded border-input text-teal" />
                Contactless delivery preferred
              </label>
            </div>
          )}

          {/* Step 3: Dates */}
          {step === 2 && (
            <div className="grid gap-5">
              <h2 className="text-xl font-bold text-navy-700">Pick your dates</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="del-date" className={labelCls}>Delivery date</label>
                  <input id="del-date" type="date" className={inputCls} min={minDate}
                    value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="pick-date" className={labelCls}>Pickup date</label>
                  <input id="pick-date" type="date" className={inputCls} min={deliveryDate || minDate}
                    value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} required />
                </div>
                <div>
                  <label htmlFor="del-window" className={labelCls}>Preferred delivery window</label>
                  <select id="del-window" className={inputCls} value={deliveryWindow} onChange={(e) => setDeliveryWindow(e.target.value)}>
                    {['Morning (8–11 AM)', 'Midday (11 AM–2 PM)', 'Afternoon (2–5 PM)', 'Flexible'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="pick-window" className={labelCls}>Preferred pickup window</label>
                  <select id="pick-window" className={inputCls} value={pickupWindow} onChange={(e) => setPickupWindow(e.target.value)}>
                    {['Morning (8–11 AM)', 'Midday (11 AM–2 PM)', 'Afternoon (2–5 PM)', 'Flexible'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <p className="rounded-xl bg-mist p-4 text-sm text-charcoal-500">
                The {pkg.name} package includes a {pkg.rentalDays}-day rental. Longer rentals can
                be arranged with extra-week add-ons on the next steps.
              </p>
            </div>
          )}

          {/* Step 4: Package + availability result */}
          {step === 3 && (
            <div className="grid gap-5">
              <h2 className="text-xl font-bold text-navy-700">Choose your package</h2>

              {checkingAvailability && (
                <div role="status" className="flex items-center gap-3 rounded-xl bg-mist p-5 text-navy-700">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Checking clean inventory, route capacity, and your service zone…
                </div>
              )}

              {availability && !checkingAvailability && (
                <div
                  role="status"
                  className={`rounded-xl border p-5 ${
                    availability.status === 'available'
                      ? 'border-teal/30 bg-teal-50 text-teal-800'
                      : availability.status === 'outside-area'
                        ? 'border-red-200 bg-red-50 text-red-800'
                        : 'border-gold-300 bg-gold-50 text-gold-800'
                  }`}
                >
                  <p className="font-bold">{availability.headline}</p>
                  <p className="mt-1 text-sm">{availability.detail}</p>
                  {availability.status === 'outside-area' && (
                    <Link to="/contact?type=custom-quote" className="btn-primary mt-3 !py-2.5 !text-sm">
                      Request a Custom Quote
                    </Link>
                  )}
                </div>
              )}

              <div className="grid gap-3">
                {packages.filter((p) => p.active).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setPackageSlug(p.slug); }}
                    aria-pressed={packageSlug === p.slug}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                      packageSlug === p.slug
                        ? 'border-teal bg-teal-50'
                        : 'border-border bg-white hover:border-teal-200'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-navy-700">
                        {p.name}
                        {p.featured && (
                          <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-navy-900">
                            Most Popular
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-charcoal-400">
                        {p.totes} totes · {p.dollies} {p.dollies > 1 ? 'dollies' : 'dolly'} · {p.rentalDays}-day rental
                      </p>
                    </div>
                    <p className="text-xl font-extrabold text-navy-700">${currentPrice(p)}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-charcoal-300">
                Availability is approximate until your reservation is completed and confirmed.
              </p>
            </div>
          )}

          {/* Step 5: Add-ons */}
          {step === 4 && (
            <div className="grid gap-5">
              <h2 className="text-xl font-bold text-navy-700">Add-ons</h2>
              <div className="grid gap-3">
                {[...addOns.filter((a) => a.active && a.id !== 'addon-extra-week'),
                  { id: 'addon-extra-week', name: 'Extra rental week', description: `Extend this package by seven days ($${pkg.extraWeekPrice}/week).`, price: pkg.extraWeekPrice, unit: 'per week', maxQty: 4, active: true },
                ].map((a) => {
                  const qty = addOnSel[a.id] ?? 0;
                  return (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-navy-700">{a.name}</p>
                        <p className="text-sm text-charcoal-400">{a.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-teal">${a.price}</span>
                        <div className="flex items-center gap-2">
                          <button type="button" aria-label={`Remove one ${a.name}`}
                            onClick={() => setAddOnSel({ ...addOnSel, [a.id]: Math.max(0, qty - 1) })}
                            className="h-9 w-9 rounded-lg border border-border font-bold text-navy-700 hover:bg-mist">−</button>
                          <span className="w-6 text-center font-bold" aria-live="polite">{qty}</span>
                          <button type="button" aria-label={`Add one ${a.name}`}
                            onClick={() => setAddOnSel({ ...addOnSel, [a.id]: Math.min(a.maxQty, qty + 1) })}
                            className="h-9 w-9 rounded-lg border border-border font-bold text-navy-700 hover:bg-mist">+</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 6: Customer info */}
          {step === 5 && (
            <div className="grid gap-4">
              <h2 className="text-xl font-bold text-navy-700">Your information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="fname" className={labelCls}>First name</label>
                  <input id="fname" className={inputCls} autoComplete="given-name" value={customer.firstName}
                    onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor="lname" className={labelCls}>Last name</label>
                  <input id="lname" className={inputCls} autoComplete="family-name" value={customer.lastName}
                    onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor="email" className={labelCls}>Email</label>
                  <input id="email" type="email" className={inputCls} autoComplete="email" value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor="phone" className={labelCls}>Phone</label>
                  <input id="phone" type="tel" className={inputCls} autoComplete="tel" value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} required />
                </div>
                <div>
                  <label htmlFor="biz" className={labelCls}>Business name (if applicable)</label>
                  <input id="biz" className={inputCls} autoComplete="organization" value={customer.businessName}
                    onChange={(e) => setCustomer({ ...customer, businessName: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="referral" className={labelCls}>How did you hear about us?</label>
                  <select id="referral" className={inputCls} value={customer.referral}
                    onChange={(e) => setCustomer({ ...customer, referral: e.target.value })}>
                    <option value="">Select…</option>
                    {['Google search', 'Friend or family', 'Realtor', 'Social media', 'Drove by / saw totes', 'Other'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="promo" className={labelCls}>Promotional code (optional)</label>
                  <input id="promo" className={inputCls} value={customer.promo}
                    onChange={(e) => setCustomer({ ...customer, promo: e.target.value })} placeholder="FOUNDING10" />
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Review */}
          {step === 6 && (
            <div className="grid gap-6">
              <h2 className="text-xl font-bold text-navy-700">Review your reservation</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <dl className="grid gap-3 rounded-2xl border border-border p-5 text-sm">
                  <div><dt className="font-bold text-navy-700">Rental type</dt><dd>{rentalType}</dd></div>
                  <div><dt className="font-bold text-navy-700">Package</dt><dd>{pkg.name} — {pkg.totes} totes, {pkg.dollies} {pkg.dollies > 1 ? 'dollies' : 'dolly'}</dd></div>
                  <div><dt className="font-bold text-navy-700">Delivery</dt><dd>{deliveryDate} · {deliveryWindow}<br />{delivery.street}, {delivery.city}, MI {delivery.zip}</dd></div>
                  <div><dt className="font-bold text-navy-700">Pickup</dt><dd>{pickupDate} · {pickupWindow}<br />{effectivePickup.street}, {effectivePickup.city}, MI {effectivePickup.zip}</dd></div>
                  <div><dt className="font-bold text-navy-700">Access</dt><dd>{propertyType} · Stairs: {stairs} · Elevator: {elevator}{contactless ? ' · Contactless' : ''}</dd></div>
                  {zoneInfo?.zone && (
                    <div><dt className="font-bold text-navy-700">Service zone</dt><dd>{zoneInfo.zone.name}{zoneInfo.zone.fee > 0 ? ` ($${zoneInfo.zone.fee} fee)` : ' (delivery included)'}</dd></div>
                  )}
                </dl>
                <div className="rounded-2xl bg-navy-700 p-5 text-white">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-gold">Price summary</h3>
                    {quoting ? (
                      <span className="flex items-center gap-1.5 text-xs text-navy-200">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Confirming with server…
                      </span>
                    ) : serverQuote ? (
                      <span className="flex items-center gap-1 rounded-full bg-teal/20 px-2.5 py-1 text-xs font-bold text-teal-100">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Server-confirmed
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-navy-200">
                        Estimate
                      </span>
                    )}
                  </div>
                  <ul className="mt-3 grid gap-2 text-sm">
                    {price.lines.map((l) => (
                      <li key={l.label} className="flex justify-between gap-4">
                        <span className="text-navy-100">{l.label}</span>
                        <span className="whitespace-nowrap font-semibold">
                          {l.amount < 0 ? `−$${Math.abs(l.amount).toFixed(2)}` : `$${l.amount.toFixed(2)}`}
                        </span>
                      </li>
                    ))}
                    <li className="flex justify-between gap-4 border-t border-white/15 pt-2">
                      <span className="text-navy-100">Estimated MI sales tax (6%)</span>
                      <span className="font-semibold">${price.estimatedTax.toFixed(2)}</span>
                    </li>
                    <li className="flex justify-between gap-4 text-lg font-extrabold">
                      <span>Estimated total</span>
                      <span>${price.estimatedTotal.toFixed(2)}</span>
                    </li>
                  </ul>
                  <p className="mt-3 text-xs text-navy-200">
                    Final pricing is recalculated on the server when your reservation is submitted,
                    and a pricing snapshot is stored with your order.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Agreement */}
          {step === 7 && (
            <div className="grid gap-5">
              <h2 className="text-xl font-bold text-navy-700">Rental agreement</h2>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-mist p-5 text-sm leading-relaxed text-charcoal-500">
                <p className="font-bold text-navy-700">Rental Agreement Overview — {site.legalName}</p>
                <p className="mt-2">By accepting, you agree that: (1) rented equipment remains the property of {site.legalName}; (2) you will use totes and dollies per the safe-use rules; (3) normal wear is expected, but equipment damaged beyond normal use or not returned is subject to the replacement fees listed on the pricing page; (4) {site.legalName} rents and delivers equipment only and does not transport customer belongings; (5) delivery and pickup windows are scheduled and may be adjusted with notice; (6) cancellations follow the posted cancellation policy; (7) extensions require approval and are billed at the package extension rate.</p>
                <p className="mt-2">The full rental agreement is generated through our secure agreement system and sent to your email for review before payment is finalized.</p>
              </div>
              <label className="flex items-start gap-3 text-sm font-semibold text-navy-700">
                <input type="checkbox" checked={agreementAccepted} onChange={(e) => setAgreementAccepted(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-input text-teal" />
                I have reviewed and accept the rental agreement and required policies.
              </label>
              <div>
                <label htmlFor="sig" className={labelCls}>Type your full name to sign electronically</label>
                <input id="sig" className={`${inputCls} italic`} value={signature}
                  onChange={(e) => setSignature(e.target.value)} placeholder="Full legal name" />
              </div>
            </div>
          )}

          {/* Step 9: Payment */}
          {step === 8 && (
            <div className="grid gap-5">
              <h2 className="text-xl font-bold text-navy-700">Payment</h2>
              <div className="grid gap-3">
                {([
                  { id: 'full', label: `Pay in full — $${price.estimatedTotal.toFixed(2)}`, desc: 'Complete payment now and your reservation is confirmed.' },
                  { id: 'deposit', label: `Deposit — $${(Math.max(25, price.estimatedTotal * 0.25)).toFixed(2)}`, desc: 'Reserve your dates with a deposit; the balance is due before delivery.' },
                  { id: 'terms', label: 'Approved business-account terms', desc: 'Monthly invoicing for approved business accounts.' },
                ] as const).map((o) => (
                  <label key={o.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${
                    paymentOption === o.id ? 'border-teal bg-teal-50' : 'border-border bg-white'
                  }`}>
                    <input type="radio" name="payment" value={o.id} checked={paymentOption === o.id}
                      onChange={() => setPaymentOption(o.id)} className="mt-1 h-5 w-5 text-teal" />
                    <span>
                      <span className="block font-bold text-navy-700">{o.label}</span>
                      <span className="block text-sm text-charcoal-400">{o.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="rounded-xl bg-mist p-4 text-sm text-charcoal-500">
                Secure payment is completed through our payment provider after you submit — card
                details are never entered on this page or stored by us.
              </p>
              <Turnstile onToken={handleTurnstile} />
              {submitError && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  {submitError}
                </p>
              )}
            </div>
          )}

          {/* Step 10: Confirmation */}
          {step === 9 && confirmation && (
            <div className="grid gap-6 text-center">
              <PartyPopper className="mx-auto h-12 w-12 text-gold" aria-hidden />
              <div>
                <h2 className="text-2xl font-extrabold text-navy-700">Reservation received!</h2>
                <p className="mt-2 text-charcoal-500">
                  Order <strong className="text-navy-700">{confirmation.reference}</strong> is in
                  our system. A confirmation and the full rental agreement are on the way to{' '}
                  <strong>{customer.email}</strong>.
                </p>
              </div>
              <dl className="mx-auto grid w-full max-w-md gap-3 rounded-2xl border border-border p-5 text-left text-sm">
                <div className="flex justify-between"><dt className="font-bold text-navy-700">Package</dt><dd>{pkg.name}</dd></div>
                <div className="flex justify-between"><dt className="font-bold text-navy-700">Delivery</dt><dd>{deliveryDate}</dd></div>
                <div className="flex justify-between"><dt className="font-bold text-navy-700">Pickup</dt><dd>{pickupDate}</dd></div>
                <div className="flex justify-between"><dt className="font-bold text-navy-700">Estimated total</dt><dd>${price.estimatedTotal.toFixed(2)}</dd></div>
                <div className="flex justify-between"><dt className="font-bold text-navy-700">Payment</dt><dd className="capitalize">{paymentOption === 'terms' ? 'Business terms' : paymentOption}</dd></div>
                <div className="flex justify-between"><dt className="font-bold text-navy-700">Agreement</dt><dd className="flex items-center gap-1"><BadgeCheck className="h-4 w-4 text-teal" aria-hidden /> Signed</dd></div>
              </dl>
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" className="btn-outline"
                  onClick={() => {
                    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Tote delivery — ${site.name}\nDTSTART;VALUE=DATE:${deliveryDate.replaceAll('-', '')}\nDESCRIPTION:${pkg.name} delivery (${deliveryWindow})\nEND:VEVENT\nBEGIN:VEVENT\nSUMMARY:Tote pickup — ${site.name}\nDTSTART;VALUE=DATE:${pickupDate.replaceAll('-', '')}\nDESCRIPTION:Have totes empty and ready (${pickupWindow})\nEND:VEVENT\nEND:VCALENDAR`;
                    const blob = new Blob([ics], { type: 'text/calendar' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'great-lakes-tote-rental.ics';
                    a.click();
                  }}>
                  <CalendarPlus className="h-4 w-4" aria-hidden /> Add to Calendar
                </button>
                <a href={config.portalUrl} className="btn-primary">Go to Customer Portal</a>
                <Link to="/" className="btn-outline">Back to Home</Link>
              </div>
              <p className="text-sm text-charcoal-400">
                Questions about your order? Call <a className="font-semibold text-teal" href={site.phoneHref}>{site.phone}</a>{' '}
                or email <a className="font-semibold text-teal" href={site.emailHref}>{site.email}</a>.
              </p>
            </div>
          )}

          {/* Nav buttons */}
          {step < 9 && (
            <div className="mt-10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="btn-outline disabled:invisible"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canContinue() || submitting || checkingAvailability}
                className="btn-gold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Submitting…</>
                ) : step === 2 ? (
                  <>Check Availability <ArrowRight className="h-4 w-4" aria-hidden /></>
                ) : step === 8 ? (
                  <>Submit Reservation <ArrowRight className="h-4 w-4" aria-hidden /></>
                ) : (
                  <>Continue <ArrowRight className="h-4 w-4" aria-hidden /></>
                )}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
