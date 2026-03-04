/**
 * Escape special characters in a LIKE/ILIKE pattern.
 */
export function escapeLike(s: string): string {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
