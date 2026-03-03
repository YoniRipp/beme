import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const links = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isWelcome = location.pathname === '/welcome';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    if (isWelcome) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate({ pathname: '/welcome', hash: href.replace('#', '') });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-border bg-background/95 backdrop-blur-[12px]'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-18">
          <Link to="/welcome" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className={`text-base font-bold tracking-tight transition-colors ${scrolled ? 'text-foreground' : 'text-primary-foreground'}`}>BeMe</span>
              <p className={`text-[9px] font-medium uppercase leading-none tracking-widest transition-colors ${scrolled ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
                Life Balance
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className={`text-sm font-medium transition-colors ${scrolled ? 'text-muted-foreground hover:text-primary' : 'text-primary-foreground/80 hover:text-primary-foreground'}`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${scrolled ? 'text-muted-foreground hover:text-primary' : 'text-primary-foreground/80 hover:text-primary-foreground'}`}
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-primary transition-all hover:bg-white/90"
            >
              Get started free
            </Link>
          </div>

          <button
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className={`p-2 md:hidden ${scrolled ? 'text-primary' : 'text-primary-foreground'}`}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-border bg-background md:hidden"
          >
            <div className="space-y-3 px-6 py-4">
              {links.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="block w-full py-2 text-left text-sm font-medium text-foreground"
                >
                  {link.label}
                </button>
              ))}
              <div className="space-y-2 border-t border-border pt-3">
                <Link to="/login" className="block w-full text-center py-2 text-sm font-medium text-muted-foreground">
                  Log in
                </Link>
                <Link to="/signup" className="block w-full rounded-lg bg-primary py-2 text-center text-sm font-semibold text-primary-foreground">
                  Get started free
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
