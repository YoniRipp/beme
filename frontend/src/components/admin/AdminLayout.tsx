import { NavLink, Outlet } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, Users, Activity, Server, Image, UtensilsCrossed, ClipboardList } from 'lucide-react';

const tabs = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
  { to: '/admin/user-data', label: 'User Data', icon: ClipboardList, end: false },
  { to: '/admin/activity', label: 'Activity', icon: Activity, end: false },
  { to: '/admin/foods', label: 'Foods', icon: UtensilsCrossed, end: false },
  { to: '/admin/system', label: 'System', icon: Server, end: false },
  { to: '/admin/images', label: 'Images', icon: Image, end: false },
];

export function AdminLayout() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      <nav className="border-b border-border overflow-x-auto">
        <div className="flex gap-1">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
