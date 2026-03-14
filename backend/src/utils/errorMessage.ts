/**
 * Extract error message from unknown caught value.
 */
export function extractErrorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}
