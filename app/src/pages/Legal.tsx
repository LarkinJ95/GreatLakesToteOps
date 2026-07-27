import { useParams } from 'react-router';
import { SectionHeader } from '@/components/SectionHeader';
import { useSeo } from '@/hooks/useSeo';
import { site } from '@/data/site';

const pages: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      { heading: 'What we collect', body: `We collect the information needed to provide rentals: contact details, delivery and pickup addresses, reservation dates, and communication preferences. Payment details are processed by our payment provider and never stored by ${site.legalName}.` },
      { heading: 'How we use it', body: 'Your information is used to schedule deliveries and pickups, communicate about your rental, and — only with your consent — send service updates. We do not sell personal information.' },
      { heading: 'Analytics', body: 'We use privacy-conscious analytics to understand how the website is used. Analytics events never contain your name, address, or other sensitive details.' },
      { heading: 'Your choices', body: `Contact us at ${site.email} to access, correct, or delete your information, subject to records we must retain for active rentals and legal obligations.` },
    ],
  },
  terms: {
    title: 'Terms of Website Use',
    sections: [
      { heading: 'Use of this site', body: 'This website provides information about tote rental services and lets you check availability and request reservations. Content may not be copied or republished without permission.' },
      { heading: 'No guarantee from browsing', body: 'Checking availability or pricing online does not create a reservation. A rental exists only after the agreement is signed and required payment is completed.' },
      { heading: 'Accuracy', body: 'We work to keep pricing, availability, and policies current, but the rental agreement and server-confirmed pricing control if anything on this site is inconsistent.' },
    ],
  },
  'rental-agreement': {
    title: 'Rental Agreement Overview',
    sections: [
      { heading: 'Equipment rental only', body: `${site.legalName} rents and delivers reusable moving totes, dollies, and related equipment. We do not pack, load, or transport customer belongings and are not a moving carrier.` },
      { heading: 'Care and return', body: 'Equipment must be returned empty, reasonably clean, and on time. Normal wear is never charged; equipment damaged beyond normal use or not returned is subject to posted replacement fees.' },
      { heading: 'The full agreement', body: 'The complete rental agreement is generated through our secure agreement system during booking and signed electronically before payment is finalized. The signed agreement controls the rental.' },
    ],
  },
  cancellation: {
    title: 'Cancellation Policy',
    sections: [
      { heading: 'Before delivery', body: 'Reservations may be cancelled for a full refund up to 48 hours before the scheduled delivery window. Cancellations inside 48 hours may be subject to a scheduling fee to cover reserved route capacity.' },
      { heading: 'After delivery', body: 'Once equipment is delivered, the rental is active. Early pickup does not reduce the package price, though we are happy to collect equipment early.' },
      { heading: 'How to cancel', body: `Call ${site.phone} or email ${site.email} with your order number. Refunds are issued to the original payment method.` },
    ],
  },
  'delivery-pickup': {
    title: 'Delivery & Pickup Policy',
    sections: [
      { heading: 'Scheduling', body: 'Deliveries and pickups run on scheduled routes with confirmed time windows. We communicate the window in advance and update you if routing changes.' },
      { heading: 'Access', body: 'Tell us about gates, stairs, elevators, and parking during booking. Contactless delivery is available with a designated drop location.' },
      { heading: 'Two-address service', body: 'Delivery and pickup may occur at different addresses as long as both are inside the approved service area. Changes after confirmation require approval so we can adjust routing.' },
      { heading: 'Pickup readiness', body: 'Please have totes empty and stacked at the agreed location before the pickup window. Equipment not ready at pickup may require a rescheduling fee.' },
    ],
  },
  accessibility: {
    title: 'Accessibility Statement',
    sections: [
      { heading: 'Our commitment', body: 'We aim for WCAG 2.2 AA conformance across this website: keyboard-accessible navigation, visible focus states, semantic structure, sufficient contrast, labeled forms, and reduced-motion support.' },
      { heading: 'Known limits', body: 'Accessibility is ongoing work. If you hit a barrier — a control that does not work with your assistive technology, contrast that is hard to read — we want to know.' },
      { heading: 'Feedback', body: `Report accessibility issues to ${site.email} or ${site.phone}. We will work with you to provide the information or complete the task another way.` },
    ],
  },
  cookies: {
    title: 'Cookie & Analytics Notice',
    sections: [
      { heading: 'What we use', body: 'This site uses privacy-conscious, cookieless analytics where possible to measure page views and conversion steps. No advertising pixels are loaded unless explicitly configured and consented to.' },
      { heading: 'What we never do', body: 'We never place names, addresses, order contents, or other sensitive customer details into analytics events.' },
      { heading: 'Your control', body: 'Most browsers let you block analytics scripts without affecting booking. Essential booking functions do not depend on tracking.' },
    ],
  },
};

export function Legal() {
  const { slug } = useParams();
  const page = (slug && pages[slug]) || pages.privacy;

  useSeo({ title: page.title, description: `${page.title} — ${site.legalName}` });

  return (
    <main id="main-content">
      <section className="wave-bg bg-mist py-14">
        <div className="container-site">
          <SectionHeader eyebrow="Policies" title={page.title} />
        </div>
      </section>
      <section className="bg-white py-14">
        <div className="container-site max-w-3xl">
          <p className="rounded-xl bg-gold-50 p-4 text-sm text-gold-800">
            Policy placeholder — final legal language to be reviewed before launch.
          </p>
          <div className="mt-8 grid gap-8">
            {page.sections.map((s) => (
              <div key={s.heading}>
                <h2 className="text-xl font-bold text-navy-700">{s.heading}</h2>
                <p className="mt-2 leading-relaxed text-charcoal-500">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm text-charcoal-300">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </section>
    </main>
  );
}
