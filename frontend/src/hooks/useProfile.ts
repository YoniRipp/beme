import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, type ApiProfile } from '@/core/api/health';
import { queryKeys } from '@/lib/queryClient';

export function useProfile() {
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: queryKeys.profile,
    staleTime: 5 * 60 * 1000,
    queryFn: () => profileApi.get(),
  });

  const upsertMutation = useMutation({
    mutationFn: (data: Partial<ApiProfile>) => profileApi.upsert(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile, updated);
    },
  });

  const updateProfile = useCallback(
    (data: Partial<ApiProfile>) => upsertMutation.mutateAsync(data),
    [upsertMutation]
  );

  return {
    profile: profile ?? { setupCompleted: false, waterGoalGlasses: 8, cycleTrackingEnabled: false } as ApiProfile,
    profileLoading,
    profileError: profileError ? (profileError instanceof Error ? profileError.message : 'Could not load profile') : null,
    updateProfile,
    isUpdating: upsertMutation.isPending,
  };
}
