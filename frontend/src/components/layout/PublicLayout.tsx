import { Outlet } from 'react-router-dom';
import { Navbar } from '../marketing/Navbar';
import { Footer } from '../marketing/Footer';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
