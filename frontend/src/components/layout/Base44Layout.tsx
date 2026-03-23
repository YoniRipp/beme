import { useState, useEffect, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Dumbbell,
  Target,
  Menu,
  X,
  Leaf,
  ChevronRight,
  Sun,
  TrendingUp,
  Settings,
  ShieldCheck,
  LogOut,
  User,
  Users,
  BookOpen,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AiChatPanel } from '../insights/AiChatPanel';
import { VoiceAgentButton } from '../voice/VoiceAgentButton';
import { QuickAddMenu } from '../shared/QuickAddMenu';
import { BottomNavigation } from './BottomNavigation';

const ROUTE_TO_TITLE: Record<string, string> = {
  '/': 'Home',
  '/body': 'Workouts',
  '/energy': 'Journal',
  '/goals': 'Goals',
  '/insights': 'Insights',
  '/settings': 'Settings',
  '/trainer': 'Trainer',
  '/admin': 'Admin',
};

const SIDEBAR_NAV_BASE = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Workouts', path: '/body', icon: Dumbbell },
  { name: 'Journal', path: '/energy', icon: BookOpen },
  { name: 'Goals', path: '/goals', icon: Target },
  { name: 'Insights', path: '/insights', icon: TrendingUp },
  { name: 'Settings', path: '/settings', icon: Settings },
];

/** MFP-style bottom nav: 4 items split around a center "+" button */
const BOTTOM_NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: Home },
  { name: 'Journal', path: '/energy', icon: BookOpen },
  { name: 'Goals', path: '/goals', icon: Target },
  { name: 'More', path: '/settings', icon: MoreHorizontal },
];

function getSidebarNav(isAdmin: boolean, isTrainer: boolean) {
  const nav = [...SIDEBAR_NAV_BASE];
  if (isTrainer) nav.push({ name: 'Trainer', path: '/trainer', icon: Users });
  if (isAdmin) nav.push({ name: 'Admin', path: '/admin', icon: ShieldCheck });
  return nav;
}

function getPageTitle(pathname: string): string {
  return ROUTE_TO_TITLE[pathname] ?? (pathname.slice(1) || 'Dashboard');
}

export function Base44Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const { user } = useApp();
  const { logout } = useAuth();
  const { hasAiAccess } = useSubscription();

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };
  const sidebarNav = useMemo(() => getSidebarNav(user?.role === 'admin', user?.role === 'trainer'), [user?.role]);

  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-40 lg:hidden"
          aria-hidden
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-50
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 pb-4">
            <Link
              to="/"
              className="flex items-center gap-3"
              aria-label="TrackVibe home"
            >
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-md">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">TrackVibe</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium">Life Balance</p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-2">
            <p className="px-3 mb-2 text-xs uppercase tracking-[0.15em] text-muted-foreground font-semibold">Navigate</p>
            <div className="space-y-0.5">
              {sidebarNav.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.98]
                      ${isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-[1.01]'
                      }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg transition-all duration-200
                        ${isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted group-hover:bg-primary/15 group-hover:text-primary'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{item.name}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="p-4 mx-3 mb-3 rounded-2xl bg-muted border border-border">
            <p className="text-xs font-medium text-muted-foreground">Your wellness journey</p>
            <p className="text-xs text-muted-foreground mt-0.5">Every step counts</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-72 min-h-screen">
        <header
          className={`sticky top-0 z-30 transition-all duration-300
            ${scrolled ? 'bg-card/80 backdrop-blur-xl shadow-sm border-b border-border/50' : 'bg-transparent'}`}
        >
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 min-h-[4rem]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((o) => !o)}
                className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <h2 className="text-lg font-semibold">{pageTitle}</h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 shrink-0"
                  aria-label="Open user menu"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{user?.name ?? 'Account'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rotate-90" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[10rem]">
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 cursor-pointer text-muted-foreground focus:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="hidden sm:flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                  <Sun className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{dateStr}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 pb-28 lg:pb-8 pt-2 animate-fade-up">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav with center "+" */}
      <BottomNavigation
        items={BOTTOM_NAV_ITEMS}
        currentPath={pathname}
        onCenterPress={() => setQuickAddOpen(true)}
      />

      <QuickAddMenu open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      {pathname !== '/' && <VoiceAgentButton />}

      {/* AI Chat FAB — bottom-right, below mic button */}
      {hasAiAccess && pathname !== '/insights' && (
        <Button
          size="icon"
          onClick={() => setAiChatOpen(true)}
          className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg transition-all md:right-6 lg:bottom-6"
          aria-label="Open AI Coach"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      )}
      <AiChatPanel open={aiChatOpen} onOpenChange={setAiChatOpen} />
    </div>
  );
}
