/**
 * Whether the Insights screen has anything to draw.
 *
 * It used to ask only about workouts and food, so an account that logged sleep and nothing else
 * was told "No data yet" — while the screen was holding two stats computed from exactly that
 * sleep (average hours, and the consistency standard deviation). The web's equivalent test is
 * workouts OR food OR check-ins OR weight (`frontend/src/pages/Insights.tsx`).
 *
 * It lives here rather than in the screen for a mechanical reason worth knowing before moving it
 * back: `InsightsScreen.tsx` imports `react-native-gifted-charts`, which Jest cannot transform,
 * so anything importing that screen cannot be unit-tested at all. Screen-level pure helpers that
 * need tests belong outside a screen that pulls in a chart library.
 *
 * An error is the caller's problem, deliberately: an empty state must never stand in for a failed
 * request, which is the bug `lib/listViewState.ts` exists to prevent on the other screens.
 */
export function insightsHaveData(input: {
  workouts: readonly unknown[];
  foodEntries: readonly unknown[];
  checkIns: readonly unknown[];
}): boolean {
  return input.workouts.length > 0 || input.foodEntries.length > 0 || input.checkIns.length > 0;
}
