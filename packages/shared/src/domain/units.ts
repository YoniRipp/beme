/**
 * Unit presentation and conversion.
 *
 * The domain stores weight in kilograms (`agent-os/standards/global/domain-conventions.md`
 * — "Weight — kilograms, in workouts and in voice parsing"), so the unit a user *sees* is a
 * presentation concern resolved from `AppSettings.units`.
 *
 * This file used to hold `getWeightUnit` and nothing else, with a docblock saying not to add
 * conversion. That warning was right at the time and is worth restating, because it explains
 * the shape of what is here now:
 *
 *   Converting a stored number is only safe if you know what unit it is in. Until weight rows
 *   carried a unit, they did not — `units` lived in device-local storage, the server never
 *   learned who was imperial, and an imperial user's pounds sat in a column the whole system
 *   reads as kilograms. Converting then would have re-read every stored `135` as 297 lbs.
 *
 * So conversion here is deliberately NOT a function of the user's preference alone. Every
 * entry point takes the unit the value is actually STORED in, and a row only carries that
 * once it has been tagged. Untagged history is `kg` — which is exactly how every existing
 * consumer already reads it, so tagging re-interprets nothing.
 */
import type { Units } from '../settings/types';

/** The unit a weight is stored or displayed in. Distinct from `Units`, the user's system. */
export type WeightUnit = 'kg' | 'lbs';

/**
 * The internationally exact pound: 0.45359237 kg, defined rather than measured, so this is
 * the whole conversion and not an approximation of it.
 */
const KG_PER_LB = 0.45359237;

/** Weights are shown to one decimal throughout the app — 78.4 kg, not 78.43. */
const DISPLAY_DECIMALS = 1;

function roundForDisplay(value: number): number {
  const factor = 10 ** DISPLAY_DECIMALS;
  return Math.round(value * factor) / factor;
}

export function kgToLbs(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbsToKg(lbs: number): number {
  return lbs * KG_PER_LB;
}

/**
 * Convert between units, rounded to what the UI shows.
 *
 * Same unit in and out is an identity, not a round trip through the factor — so a value that
 * is never converted is never nudged by floating point.
 */
export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  return roundForDisplay(to === 'lbs' ? kgToLbs(value) : lbsToKg(value));
}

/** The unit a user's chosen measurement system weighs in. */
export function unitForSystem(units: Units): WeightUnit {
  return units === 'metric' ? 'kg' : 'lbs';
}

/**
 * The weight unit LABEL for a user's chosen measurement system.
 *
 * Kept, and now honest: with `displayWeight` converting the number alongside it, the label
 * and the value finally agree. Do not use it on a number you have not converted — that
 * pairing is the bug this file exists to have fixed.
 */
export function getWeightUnit(units: Units): string {
  return unitForSystem(units);
}

/**
 * What to actually render: a stored value, converted into the user's system, with the unit
 * that then applies.
 *
 * `storedUnit` is the unit the ROW is in, not the user's preference. Rows written before
 * tagging have none, and default to `kg` — the reading every existing consumer already
 * takes, so nothing a user has already logged changes meaning.
 */
export function displayWeight(
  value: number,
  storedUnit: WeightUnit | undefined,
  system: Units
): { value: number; unit: WeightUnit } {
  const from = storedUnit ?? 'kg';
  const to = unitForSystem(system);
  return { value: convertWeight(value, from, to), unit: to };
}
