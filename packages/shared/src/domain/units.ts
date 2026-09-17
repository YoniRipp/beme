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

/**
 * The weight unit LABEL for a user's chosen measurement system.
 *
 * **It relabels; it does not convert, and no conversion exists anywhere in this repo.** So an
 * imperial user is shown a kilogram number with "lbs" after it, and — because the same label
 * sits above the weight INPUT on both clients — types a pound number into a field the domain
 * defines as kilograms. The value is stored raw. That is a data problem, not a display one:
 * every metric user's view, the MCP server and the AI paths all read those rows as kilograms.
 *
 * **Do not "just add conversion" here.** Converting now re-interprets rows that already exist:
 * a user's stored `135` would start rendering as 297 lbs. And the rows cannot be identified —
 * `units` lives only in device-local storage (`trackvibe_settings`, localStorage on the web
 * and AsyncStorage on Expo), so the server has never learned which users are imperial and
 * cannot find them. The fix needs a migration decision, and it is written up under
 * "Needs the owner" in `docs/HANDOFF.md`.
 *
 * Until then this stays a pure label, which is at least self-consistent within one device.
 */
export function getWeightUnit(units: Units): string {
  return units === 'metric' ? 'kg' : 'lbs';
}
