import { AdminOverviewCards } from '@/components/admin/AdminOverviewCards';
import { AdminCharts } from '@/components/admin/AdminCharts';

export default function AdminOverview() {
  return (
    <div className="space-y-6">
      <AdminOverviewCards />
      <AdminCharts />
    </div>
  );
}
