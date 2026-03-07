import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // Per-query overrides (e.g. GoalsContext) can extend for low-churn data
      retry: 1,
    },
  },
});

export const queryKeys = {
  goals: ['goals'] as const,
  workouts: ['workouts'] as const,
  checkIns: ['checkIns'] as const,
  foodEntries: ['foodEntries'] as const,
  trainerClients: ['trainerClients'] as const,
  trainerInvitations: ['trainerInvitations'] as const,
  myTrainer: ['myTrainer'] as const,
  pendingTrainerInvitations: ['pendingTrainerInvitations'] as const,
  trainerClientData: (clientId: string) => ['trainerClientData', clientId] as const,
};
