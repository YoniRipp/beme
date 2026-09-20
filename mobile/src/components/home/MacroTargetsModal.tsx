import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Dialog, Portal, Text, TextInput } from 'react-native-paper';
import {
  caloriesFromMacros,
  MACRO_TARGET_MAX,
  SUGGESTED_MACRO_TARGETS,
  type DailyTargets,
} from '@trackvibe/shared/domain';
import { Button } from '../ui';
import { fonts, spacing } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

/**
 * Protein / carbs / fat grams, the half of the daily targets this client could not set.
 *
 * The macro bars on `FuelCard` have always rendered against these numbers and there was no
 * way to enter them here, so for an Expo-only account they sat permanently at zero — a bar
 * that can fill but never does. The web reaches them through `DailyTargetsModal`, which
 * writes grams to the PROFILE (`useDailyTargets.ts`); calories are a separate store, the
 * goals table's `calories`/`daily` row, and keep their own editor.
 *
 * Deliberately macros only, where the web's one modal covers both. The calorie affordance
 * on this client already exists and already works, and folding it in here would mean two
 * ways to set the same number with two different validation paths.
 */

type MacroKey = 'protein' | 'carbs' | 'fat';

const FIELDS: ReadonlyArray<{ key: MacroKey; label: string }> = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
];

export interface MacroTargetsInput {
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface MacroTargetsModalProps {
  visible: boolean;
  onDismiss: () => void;
  targets: DailyTargets;
  onSave: (next: MacroTargetsInput) => void | Promise<void>;
  saving?: boolean;
}

/**
 * Blank means "no target", which is NOT the same as zero — `resolveDailyTargets` treats a
 * non-positive value as unset anyway, so a typed 0 and an empty field must reach the server
 * the same way: as `null`, clearing the column. Anything unparseable is also `null` rather
 * than `NaN`, which would serialise to JSON `null` by accident rather than by decision.
 */
export function parseMacroField(raw: string, key: MacroKey): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(Math.round(n), MACRO_TARGET_MAX[key]);
}

export function MacroTargetsModal({
  visible,
  onDismiss,
  targets,
  onSave,
  saving = false,
}: MacroTargetsModalProps) {
  const [values, setValues] = useState<Record<MacroKey, string>>({
    protein: '',
    carbs: '',
    fat: '',
  });

  /**
   * Seeded on OPEN, not on every `targets` change. The object is rebuilt each render by
   * `resolveDailyTargets`, so keying this on it would overwrite whatever the user had typed
   * on the next parent render — the same trap the web's modal calls out at its own
   * `useEffect`.
   */
  useEffect(() => {
    if (!visible) return;
    setValues({
      protein: targets.protein != null ? String(targets.protein) : '',
      carbs: targets.carbs != null ? String(targets.carbs) : '',
      fat: targets.fat != null ? String(targets.fat) : '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const parsed: MacroTargetsInput = {
    protein: parseMacroField(values.protein, 'protein'),
    carbs: parseMacroField(values.carbs, 'carbs'),
    fat: parseMacroField(values.fat, 'fat'),
  };

  // Only shown once all three are set — two out of three is not a calorie figure, it is a
  // smaller one presented as if it were the total.
  const impliedCalories = caloriesFromMacros(parsed);

  const styles = useThemedStyles((c) => ({
    intro: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: c.textMuted,
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    label: {
      fontFamily: fonts.medium,
      fontSize: 14,
      color: c.text,
      width: 72,
    },
    input: {
      flex: 1,
      backgroundColor: c.surface,
    },
    implied: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: c.textMuted,
      marginTop: spacing.sm,
    },
    hint: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: c.textMuted,
      marginTop: spacing.xs,
    },
  }));

  const suggest = () =>
    setValues({
      protein: String(SUGGESTED_MACRO_TARGETS.protein),
      carbs: String(SUGGESTED_MACRO_TARGETS.carbs),
      fat: String(SUGGESTED_MACRO_TARGETS.fat),
    });

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Daily macro targets</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.intro}>
            Grams per day. Leave a field empty to remove its target.
          </Text>

          {FIELDS.map((field) => (
            <View key={field.key} style={styles.row}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={styles.input}
                mode="outlined"
                dense
                accessibilityLabel={`${field.label} target in grams`}
                keyboardType="number-pad"
                value={values[field.key]}
                onChangeText={(text) =>
                  setValues((prev) => ({ ...prev, [field.key]: text }))
                }
                right={<TextInput.Affix text="g" />}
                editable={!saving}
              />
            </View>
          ))}

          {impliedCalories != null ? (
            <Text style={styles.implied}>That adds up to {impliedCalories} kcal a day.</Text>
          ) : (
            <Text style={styles.hint}>
              Set all three to see the calories they add up to.
            </Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="text" onPress={suggest} disabled={saving}>
            Suggest
          </Button>
          <Button mode="text" onPress={onDismiss} disabled={saving}>
            Cancel
          </Button>
          <Button mode="contained" onPress={() => onSave(parsed)} loading={saving} disabled={saving}>
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
