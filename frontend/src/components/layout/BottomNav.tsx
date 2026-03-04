import { Home, Dumbbell, Zap, Target } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/body', icon: Dumbbell, label: 'Body' },
  { path: '/energy', icon: Zap, label: 'Energy' },
  { path: '/goals', icon: Target, label: 'Goals' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40 md:hidden">
      <div className="max-w-screen-xl mx-auto px-2 md:px-4">
        <div className="flex items-center justify-around h-16 gap-0.5 md:gap-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 md:gap-1 px-2 md:px-3 py-2 rounded-lg transition-colors min-w-[50px] md:min-w-[60px]",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium hidden sm:block">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
