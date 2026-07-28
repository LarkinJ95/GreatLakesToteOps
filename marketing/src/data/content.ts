// Editable marketing content — mirrors D1 content tables (faqs, testimonials,
// use_cases, homepage sections). Admin-managed in production.

export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export const faqCategories = [
  'Reservations',
  'Pricing',
  'Delivery & Pickup',
  'Equipment',
  'Cleaning',
  'Damage & Extensions',
  'Business Accounts',
  'Payments',
] as const;

export const faqs: Faq[] = [
  {
    id: 'faq-how-many',
    category: 'Reservations',
    question: 'How many totes do I need?',
    answer:
      'As a rough guide: a studio or dorm room usually fits the 12-tote Quick Pack, a one-bedroom the 20-tote Apartment package, a two- to three-bedroom home the 40-tote Home package, and larger homes the 60-tote Large Home package. Offices and estates typically use the 100-tote package. If you run short, extra totes can be added to your rental.',
  },
  {
    id: 'faq-do-you-move',
    category: 'Reservations',
    question: 'Do you move my belongings?',
    answer:
      'No. Great Lakes Moving Totes rents and delivers reusable moving equipment only. We drop off clean, empty totes and dollies, and we pick up the empty equipment afterward. You pack and move your own belongings using your own vehicle or the moving company of your choice. We are not a moving carrier and never transport customer belongings.',
  },
  {
    id: 'faq-two-address',
    category: 'Delivery & Pickup',
    question: 'Can you deliver and pick up at different addresses?',
    answer:
      'Yes. We can deliver to your current address and pick up the empty totes from your new address, as long as both addresses are within our approved service area. You provide both addresses during booking. Additional zone charges may apply, and pickup-location changes after confirmation require our approval so we can adjust routing.',
  },
  {
    id: 'faq-clean',
    category: 'Cleaning',
    question: 'How clean are the totes?',
    answer:
      'Every tote is cleaned and inspected between rentals. Totes are washed, wiped down, and checked for damage before they are approved for the next customer. Equipment that fails inspection is pulled from circulation.',
  },
  {
    id: 'faq-extend',
    category: 'Damage & Extensions',
    question: 'Can I extend my rental?',
    answer:
      'Usually, yes. Extra days and extra weeks can be added at the extension rates shown on the pricing page, subject to availability for your dates. Contact us as early as possible — extensions depend on whether your totes are reserved for another customer after your scheduled pickup.',
  },
  {
    id: 'faq-damaged',
    category: 'Damage & Extensions',
    question: 'What happens if a tote is damaged or missing?',
    answer:
      'Normal wear is expected and never charged. If a tote or dolly is damaged beyond normal use or not returned, a replacement fee applies per the rental agreement. Replacement fees are listed on our pricing page so there are no surprises.',
  },
  {
    id: 'faq-waterproof',
    category: 'Equipment',
    question: 'Are the totes waterproof?',
    answer:
      'Our totes are weather-resistant, not waterproof. Durable plastic and attached lids provide much more protection from ordinary Michigan weather than cardboard, but totes should not be left standing in water or stored outdoors long-term.',
  },
  {
    id: 'faq-areas',
    category: 'Delivery & Pickup',
    question: 'What areas do you serve?',
    answer:
      'We serve Midland, Auburn, and Freeland in our Core Zone; Saginaw, Bay City, Sanford, and Coleman in Zone 2; and the outer Great Lakes Bay Region through Zone 3 custom routes. Enter your address on the Service Areas page to check your zone.',
  },
  {
    id: 'faq-home-delivery',
    category: 'Delivery & Pickup',
    question: 'Do I need to be home for delivery?',
    answer:
      'Not necessarily. Contactless delivery is available — tell us where to leave the totes (garage, porch, building lobby) during booking. Someone must be available if the drop location is secured or access-restricted.',
  },
  {
    id: 'faq-remodeling',
    category: 'Reservations',
    question: 'Can I use the totes for remodeling?',
    answer:
      'Absolutely. Flooring, painting, and kitchen remodels are some of our most common rentals. Pack rooms into totes, stack them out of the work area, and we collect everything when the project wraps. Totes are not intended for long-term outdoor storage.',
  },
  {
    id: 'faq-price-launch',
    category: 'Pricing',
    question: 'What is launch pricing?',
    answer:
      'Launch pricing is a limited-time founding-customer rate shown alongside the standard rate for each package. While launch pricing is active, you pay the lower rate. Any scheduled price changes are posted in advance.',
  },
  {
    id: 'faq-zone-fee',
    category: 'Pricing',
    question: 'Are there delivery fees?',
    answer:
      'Delivery and pickup are included in the Core Zone. Zone 2 rentals include a flat zone fee, and Zone 3 custom routes are priced per route. All fees are shown in your price summary before you confirm — we never hide unavoidable fees until the last step.',
  },
  {
    id: 'faq-business-po',
    category: 'Business Accounts',
    question: 'Do you support purchase orders and invoicing?',
    answer:
      'Yes. Approved business accounts can rent on purchase-order terms with monthly invoicing, negotiated volume pricing, and recurring rental schedules. Request a business account to get started.',
  },
  {
    id: 'faq-payment',
    category: 'Payments',
    question: 'When do I pay?',
    answer:
      'Reservations are confirmed after the rental agreement is signed and the required payment or deposit is completed. Approved business accounts may use invoicing terms instead. Your estimated total is always shown before you commit.',
  },
];

// Homepage FAQ preview subset (first N of these are shown on the homepage)
export const homepageFaqIds = [
  'faq-how-many',
  'faq-do-you-move',
  'faq-two-address',
  'faq-clean',
  'faq-extend',
  'faq-damaged',
  'faq-waterproof',
  'faq-areas',
];

export interface UseCase {
  id: string;
  title: string;
  description: string;
  recommendedPackageSlug: string;
  icon: string; // lucide icon name mapped in component
}

export const useCases: UseCase[] = [
  { id: 'uc-local-move', title: 'Local Moves', description: 'Moving across Midland, Saginaw, or Bay City? Totes arrive before moving day and leave after you are settled — no cardboard run required.', recommendedPackageSlug: 'home', icon: 'Home' },
  { id: 'uc-apartment', title: 'Apartment Moves', description: 'Uniform totes stack in elevators, hallways, and the back of a car. Dollies handle the heavy rolling between your unit and the truck.', recommendedPackageSlug: 'apartment', icon: 'Building2' },
  { id: 'uc-remodel', title: 'Remodeling', description: 'Clear rooms fast for flooring, kitchen, or bathroom work. Stack packed totes in the garage or a spare room until the dust settles.', recommendedPackageSlug: 'large-home', icon: 'Hammer' },
  { id: 'uc-flooring', title: 'Flooring Projects', description: 'Installers need empty rooms. Pack everything into totes a few days before the crew arrives and move back in on your schedule.', recommendedPackageSlug: 'home', icon: 'Layers' },
  { id: 'uc-painting', title: 'Painting Projects', description: 'Get furniture contents and wall decor out of the splash zone. Weather-resistant lids keep dust off your belongings.', recommendedPackageSlug: 'quick-pack', icon: 'Paintbrush' },
  { id: 'uc-declutter', title: 'Decluttering', description: 'Sort at your own pace. Totes keep keep-donate-store piles organized without a living room full of half-built boxes.', recommendedPackageSlug: 'quick-pack', icon: 'Sparkles' },
  { id: 'uc-staging', title: 'Home Staging', description: 'Realtors and sellers clear personal items fast so listings photograph clean. Totes come back out when the home sells.', recommendedPackageSlug: 'apartment', icon: 'Armchair' },
  { id: 'uc-downsizing', title: 'Senior Downsizing', description: 'A calmer way to transition to a smaller home. Pack gradually over two weeks, and we pick up from the new address.', recommendedPackageSlug: 'home', icon: 'HeartHandshake' },
  { id: 'uc-estate', title: 'Estate Transitions', description: 'Settle an estate with room to breathe. Sort, distribute, and store belongings in labeled, stackable totes.', recommendedPackageSlug: 'estate-office', icon: 'Archive' },
  { id: 'uc-office', title: 'Office Moves', description: 'Desks, files, and IT gear pack uniformly and roll on dollies. QR label kits keep every department\'s contents tracked.', recommendedPackageSlug: 'estate-office', icon: 'Briefcase' },
  { id: 'uc-nonprofit', title: 'Nonprofit & Church Moves', description: 'Supplies, records, and event gear move between locations on a schedule that fits volunteer availability.', recommendedPackageSlug: 'large-home', icon: 'Church' },
  { id: 'uc-restoration', title: 'Restoration Pack-Outs', description: 'After water or fire damage, contents need to leave fast. Clean, stackable totes protect belongings during remediation.', recommendedPackageSlug: 'estate-office', icon: 'ShieldAlert' },
];

// SAMPLE CONTENT — clearly marked. Replace with real customer reviews after
// launch. Never present fictional reviews as genuine endorsements.
export interface Testimonial {
  id: string;
  name: string;
  city: string;
  text: string;
  rating: number;
  source: string;
  date: string;
  featured: boolean;
  sample: boolean;
}

export const testimonials: Testimonial[] = [
  {
    id: 'tst-sample-1',
    name: 'Sample Customer',
    city: 'Midland',
    text: 'Sample review — the totes were dropped off two days before our move and picked up from the new house. No boxes to build or break down.',
    rating: 5,
    source: 'Sample content',
    date: '2026-01-01',
    featured: true,
    sample: true,
  },
  {
    id: 'tst-sample-2',
    name: 'Sample Customer',
    city: 'Saginaw',
    text: 'Sample review — used the Apartment package for a one-bedroom move. The dolly made the elevator trips easy.',
    rating: 5,
    source: 'Sample content',
    date: '2026-01-01',
    featured: true,
    sample: true,
  },
  {
    id: 'tst-sample-3',
    name: 'Sample Customer',
    city: 'Bay City',
    text: 'Sample review — rented totes during a flooring project. Stacked everything in the garage and rolled it back in when the floors cured.',
    rating: 4,
    source: 'Sample content',
    date: '2026-01-01',
    featured: true,
    sample: true,
  },
];

export const howItWorksSteps = [
  {
    step: 1,
    title: 'Reserve',
    description: 'Choose a package, dates, and delivery and pickup addresses.',
  },
  {
    step: 2,
    title: 'We Deliver',
    description: 'Clean totes and dollies arrive before the move or project.',
  },
  {
    step: 3,
    title: 'Pack and Move',
    description: 'Pack the totes and move your belongings using your own vehicle or moving company.',
  },
  {
    step: 4,
    title: 'We Pick Up',
    description: 'Empty the totes and we collect them from the original or new address.',
  },
];

export const benefits = [
  { id: 'no-assembly', title: 'No Assembly', description: 'No folding, taping, or building cardboard boxes.', icon: 'Scissors' },
  { id: 'easy-stacking', title: 'Easy Stacking', description: 'Uniform containers stack neatly in homes, vehicles, storage areas, and offices.', icon: 'Layers' },
  { id: 'weather-resistant', title: 'Weather-Resistant', description: 'Durable plastic provides more protection from ordinary Michigan weather than cardboard.', icon: 'CloudRain' },
  { id: 'easy-handling', title: 'Easier Handling', description: 'Built-in handles and compatible dollies make equipment easier to move.', icon: 'Hand' },
  { id: 'less-waste', title: 'Less Waste', description: 'Reusable totes reduce the number of single-use cardboard boxes you need to purchase and discard.', icon: 'Recycle' },
  { id: 'convenient-pickup', title: 'Convenient Pickup', description: 'We retrieve the empty equipment after the rental — from your original or new address.', icon: 'Truck' },
];

export const trustItems = [
  { label: 'Locally owned', icon: 'MapPin' },
  { label: 'Serving the Great Lakes Bay Region', icon: 'Waves' },
  { label: 'Cleaned & inspected', icon: 'BadgeCheck' },
  { label: 'Secure online booking', icon: 'Lock' },
  { label: 'Flexible delivery & pickup', icon: 'CalendarClock' },
  { label: 'Residential & business rentals', icon: 'Building2' },
];

export const businessBenefits = [
  'Volume packages',
  'Multi-location service',
  'Purchase-order support',
  'Monthly invoicing',
  'Recurring rentals',
  'Negotiated pricing',
  'Dedicated account notes',
  'QR and numbered asset tracking',
  'Business-account statements',
];

export const businessAudiences = [
  'Realtors',
  'Apartment managers',
  'Property management companies',
  'Restoration companies',
  'Professional organizers',
  'Senior-transition professionals',
  'Storage facilities',
  'Offices',
  'Schools',
  'Churches',
  'Nonprofits',
];

export const rentalTypes = [
  'Moving',
  'Remodeling',
  'Downsizing',
  'Decluttering',
  'Office',
  'Estate',
  'Restoration',
  'Other',
] as const;

// Damage / replacement fee overview (mirrors pricing policy rows in D1)
export const replacementFees = [
  { item: 'Moving tote (lost or damaged beyond normal use)', fee: 25 },
  { item: 'Tote dolly', fee: 60 },
  { item: 'Hand truck', fee: 45 },
  { item: 'Moving blanket (each)', fee: 8 },
];
