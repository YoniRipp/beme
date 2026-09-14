import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, type ApiProfile } from '../core/api/health';
import { queryKeys } from '../lib/queryKeys';

/**
 * The user's profile — one row, one request. Mirrors `frontend/src/hooks/useProfile.ts`:
 * same query key, same 5-minute staleTime, same `setQueryData` on upsert, same
 * unloaded-profile fallback, error as a display string.
 *
 * Home needs it for the macro grams behind the protein/carb/fat targets. The daily
 * calorie target does not come from here — it is the `goals` table's calories/daily row.
 */
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
    profile: profile ?? UNLOADED_PROFILE,
    profileLoading,
    profileError: profileError
      ? (profileError instanceof Error ? profileError.message : 'Could not load profile')
      : null,
    updateProfile,
    isUpdating: upsertMutation.isPending,
  };
}

/**
 * What a screen sees before the profile query resolves. Byte-for-byte the web's fallback
 * (frontend/src/hooks/useProfile.ts) so the two clients cannot drift; `waterGoalGlasses: 8`
 * mirrors the column's `NOT NULL DEFAULT 8`, and the macro fields are deliberately absent
 * — an unloaded profile has no macro targets, it does not have suggested ones.
 */
export const UNLOADED_PROFILE = {
  setupCompleted: false,
  waterGoalGlasses: 8,
  cycleTrackingEnabled: false,
} as ApiProfile;
