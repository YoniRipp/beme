import { AdminUsersTable } from '@/components/admin/AdminUsersTable';
import { AdminLogs } from '@/components/admin/AdminLogs';

export function Admin() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <AdminUsersTable />
      <AdminLogs />
    </div>
  );
}
