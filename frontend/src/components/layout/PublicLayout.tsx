import { Outlet } from 'react-router-dom';
import { Navbar } from '../marketing/Navbar';
import { Footer } from '../marketing/Footer';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      {/* The nav is fixed and grows by the top inset, while the public pages clear it with
          a hard-coded `pt-24`. Shifting the content by the same inset keeps that gap
          exactly as it is on the web instead of letting the nav creep over a heading. */}
      <main className="flex-1 pt-safe">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
