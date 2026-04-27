import { Link } from 'react-router-dom';
import { Mic } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

interface BottomNavigationProps {
  items: NavItem[];
  currentPath: string;
  onCenterPress?: () => void;
}

export function BottomNavigation({ items, currentPath, onCenterPress }: BottomNavigationProps) {
  const half = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, half);
  const rightItems = items.slice(half);

  const onboardingKey = (path: string) => {
    if (path === '/body') return 'nav-body';
    if (path === '/energy') return 'nav-energy';
    if (path === '/insights') return 'nav-insights';
    return undefined;
  };

  const renderItem = (item: NavItem) => {
    const isActive = currentPath === item.path;
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        to={item.path}
        data-onboarding={onboardingKey(item.path)}
        className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] py-2 transition-colors press min-h-[48px]
          ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 1.9} />
        <span className="leading-none">
          {item.name}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 14px)' }}
      aria-label="Main navigation"
    >
      {/* Floating pill */}
      <div
        className="mx-3.5 mb-3.5 pointer-events-auto"
        style={{ position: 'relative' }}
      >
        {/* Center voice FAB — floats above the pill */}
        <button
          type="button"
          onClick={onCenterPress}
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform z-10"
          style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.4), 0 8px 20px rgba(0,0,0,0.25)' }}
          aria-label="Voice log"
        >
          <Mic className="w-6 h-6 text-primary-foreground" strokeWidth={2.2} />
        </button>

        {/* Pill bar */}
        <div
          className="flex items-center bg-card border border-border/60 rounded-[22px]"
          style={{
            height: 64,
            boxShadow: '0 8px 28px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          {/* Left items */}
          {leftItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-onboarding={onboardingKey(item.path)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors tap-target"
                style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
              >
                <Icon className="w-5 h-5" />
                <span
                  className="text-[10px] font-bold tracking-widest uppercase"
                >
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* Center spacer for FAB */}
          <div className="w-16 shrink-0" />

          {/* Right items */}
          {rightItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-onboarding={onboardingKey(item.path)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors tap-target"
                style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
              >
                <Icon className="w-5 h-5" />
                <span
                  className="text-[10px] font-bold tracking-widest uppercase"
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
