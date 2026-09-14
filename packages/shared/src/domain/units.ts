/**
 * Unit presentation.
 *
 * The domain stores weight in kilograms (`agent-os/standards/global/domain-conventions.md`
 * — "Weight — kilograms, in workouts and in voice parsing"), so the unit a user *sees* is a
 * presentation concern resolved from `AppSettings.units`, never a stored value.
 *
 * Moved here verbatim from the web client (`frontend/src/lib/utils.ts`, which now re-exports
 * this) so both clients resolve it the same way. Expo's workout card hardcoded `kg` and
 * showed it to imperial users too.
 */
import type { Units } from '../settings/types';

/** The weight unit label for a user's chosen measurement system. */
export function getWeightUnit(units: Units): string {
  return units === 'metric' ? 'kg' : 'lbs';
}
