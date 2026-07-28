import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileCTA } from '@/components/layout/MobileCTA';
import { Home } from '@/pages/Home';
import { HowItWorks } from '@/pages/HowItWorks';
import { Pricing } from '@/pages/Pricing';
import { ServiceAreas } from '@/pages/ServiceAreas';
import { MovingTotes } from '@/pages/MovingTotes';
import { Remodeling } from '@/pages/Remodeling';
import { BusinessAccounts } from '@/pages/BusinessAccounts';
import { FaqPage } from '@/pages/FaqPage';
import { About } from '@/pages/About';
import { Contact } from '@/pages/Contact';
import { Book } from '@/pages/Book';
import { Login } from '@/pages/Login';
import { Legal } from '@/pages/Legal';
import { NotFound } from '@/pages/NotFound';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function MarketingApp() {
  return (
    <div className="flex min-h-screen flex-col pb-[57px] xl:pb-0">
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/service-areas" element={<ServiceAreas />} />
          <Route path="/moving-totes" element={<MovingTotes />} />
          <Route path="/remodeling-storage" element={<Remodeling />} />
          <Route path="/business-accounts" element={<BusinessAccounts />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/book" element={<Book />} />
          <Route path="/login" element={<Login />} />
          <Route path="/legal/:slug" element={<Legal />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
      <MobileCTA />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <MarketingApp />
    </>
  );
}
