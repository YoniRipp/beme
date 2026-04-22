import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
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
  // Split items into left and right halves for the center button
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
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors press min-h-[48px]
          ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.25 : 1.75} />
        <span className={`text-[11px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
          {item.name}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 glass border-t border-border/60 z-30 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Main navigation"
    >
      <div className="flex items-end px-2 pb-2 pt-2" style={{ minHeight: '72px' }}>
        {leftItems.map(renderItem)}

        {/* Elevated center FAB */}
        <div className="flex-1 flex flex-col items-center -mt-5">
          <button
            type="button"
            onClick={onCenterPress}
            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-card-lg ring-[3px] ring-background active:scale-95 transition-transform"
            aria-label="Quick add"
          >
            <Plus className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
          </button>
        </div>

        {rightItems.map(renderItem)}
      </div>
    </nav>
  );
}
