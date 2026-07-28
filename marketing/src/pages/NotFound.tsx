import { Link } from 'react-router';
import { useSeo } from '@/hooks/useSeo';

export function NotFound() {
  useSeo({ title: 'Page Not Found', description: 'The page you requested could not be found.' });

  return (
    <main id="main-content" className="bg-mist py-24">
      <div className="container-site text-center">
        <p className="text-7xl font-extrabold text-teal">404</p>
        <h1 className="mt-4 text-3xl font-extrabold text-navy-700">This page moved without totes.</h1>
        <p className="mx-auto mt-3 max-w-md text-charcoal-500">
          The page you are looking for does not exist. Let us help you get where you were going.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary">Back to Home</Link>
          <Link to="/book" className="btn-gold">Check Availability</Link>
        </div>
      </div>
    </main>
  );
}
