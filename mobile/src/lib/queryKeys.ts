export const queryKeys = {
  goals: ['goals'] as const,
  workouts: ['workouts'] as const,
  checkIns: ['checkIns'] as const,
  foodEntries: ['foodEntries'] as const,
  // Matches the web's key exactly (frontend/src/lib/queryClient.ts) so the two clients
  // cache the same single-row read under the same name.
  profile: ['profile'] as const,
};
