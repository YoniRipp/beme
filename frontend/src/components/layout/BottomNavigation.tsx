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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30 lg:hidden"
      aria-label="Main navigation"
    >
      <div className="flex items-end px-2 pb-1 pt-1">
        {/* Left nav items */}
        {leftItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              data-onboarding={onboardingKey(item.path)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors
                ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}

        {/* Center "+" button */}
        <div className="flex-1 flex flex-col items-center -mt-4">
          <button
            type="button"
            onClick={onCenterPress}
            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            aria-label="Quick add"
          >
            <Plus className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
          </button>
        </div>

        {/* Right nav items */}
        {rightItems.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              data-onboarding={onboardingKey(item.path)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors
                ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
