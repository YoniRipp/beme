import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

const footerGroups = [
  {
    label: 'Product',
    links: [
      { label: 'Features', to: '/welcome#features' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    label: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Leaf className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">BeMe</p>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  Life Balance
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Track money, body, energy, and goals in one place.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.label}>
              <h4 className="mb-4 text-xs font-semibold tracking-wide text-foreground">
                {group.label}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} BeMe. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
