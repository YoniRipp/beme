import { AdminOverviewCards } from '@/components/admin/AdminOverviewCards';
import { AdminCharts } from '@/components/admin/AdminCharts';
import { AdminFlaggedUsers } from '@/components/admin/AdminFlaggedUsers';
import { AdminOperationsPanel } from '@/components/admin/AdminOperationsPanel';

export default function AdminOverview() {
  return (
    <div className="space-y-6">
      <AdminOverviewCards />
      <AdminCharts />
      <AdminOperationsPanel />
      <AdminFlaggedUsers />
    </div>
  );
}
