import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/core/api/admin';

/** Live runtime metrics from the in-process collector. Polls every 10s. */
export function useMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => adminApi.getMetrics(),
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

/** BullMQ queue health (waiting / active / failed / DLQ). Polls every 10s. */
export function useQueues() {
  return useQuery({
    queryKey: ['admin', 'queues'],
    queryFn: () => adminApi.getQueues(),
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}
