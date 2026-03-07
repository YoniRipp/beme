import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

interface BottomNavigationProps {
  items: NavItem[];
  currentPath: string;
}

export function BottomNavigation({ items, currentPath }: BottomNavigationProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-border z-30 lg:hidden"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item) => {
          const isActive = currentPath === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all
                ${isActive ? 'text-primary' : 'text-stone'}`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-primary/15' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
