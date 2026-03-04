import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Home,
  Dumbbell,
  Zap,
  Target,
  Settings,
  TrendingUp,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/body', icon: Dumbbell, label: 'Body' },
  { path: '/energy', icon: Zap, label: 'Energy' },
  { path: '/goals', icon: Target, label: 'Goals' },
  { path: '/insights', icon: TrendingUp, label: 'Insights' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar side="left" collapsible="offcanvas">
      <SidebarHeader>
        <Link
          to="/"
          className="flex items-center gap-2 px-2 py-2 min-w-0"
          aria-label="BeMe home"
        >
          <img src="/logo.png" alt="" className="h-7 w-auto rounded-full object-contain" />
          <span className="font-semibold text-lg truncate">BeMe</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <SidebarMenuItem key={path}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                    <Link to={path}>
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
