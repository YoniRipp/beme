import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/core/api/admin';

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
