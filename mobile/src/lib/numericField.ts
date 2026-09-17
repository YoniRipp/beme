/**
 * A numeric form field that is allowed to be blank, but not allowed to be nonsense.
 *
 * The shape this replaces is `parseFloat(value) || 0`, which conflates two very different
 * inputs: an empty field, where 0 is the intended "I am not logging this", and a typo, where 0
 * is **a wrong number saved silently**. Someone who types `12o` calories gets an entry recorded
 * as 0 kcal, with a success toast, and no way to notice until their day's total is wrong.
 *
 * The shared `foodEntryFormSchema` is deliberately not used for this. It requires all four
 * macros, and this client has always let them be blank — adopting it wholesale would stop
 * people logging calories-only entries, which is a product change rather than a bug fix.
 *
 * `||` is also wrong for a legitimate zero: `parseFloat('0') || 0` only happens to be right
 * because the fallback is also 0. The moment a field's fallback is anything else, `|| ` silently
 * discards a real zero — which is why this returns a discriminated result rather than a number.
 */
export type NumericFieldResult =
  | { ok: true; value: number | undefined }
  | { ok: false; message: string };

/**
 * @param raw    the field's current string value
 * @param label  what to call it in the error a user reads
 * @param blank  what an empty field means — `0` for a macro, `undefined` for an optional amount
 */
export function parseNumericField(
  raw: string,
  label: string,
  blank: number | undefined,
): NumericFieldResult {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: true, value: blank };

  const parsed = Number(trimmed);
  // `Number` rather than `parseFloat`: `parseFloat('12o')` is 12, so the typo that started this
  // would still slip through and save a number the user never typed.
  if (!Number.isFinite(parsed)) {
    return { ok: false, message: `${label} must be a number` };
  }
  if (parsed < 0) {
    return { ok: false, message: `${label} cannot be negative` };
  }
  return { ok: true, value: parsed };
}
