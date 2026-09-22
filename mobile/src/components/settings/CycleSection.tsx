import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Switch, Text, TextInput } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { Button } from '../ui';
import { messageFor } from '../../lib/errorMessage';
import { useProfile } from '../../hooks/useProfile';
import { spacing } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

/**
 * Cycle tracking, mirroring `frontend/src/components/settings/CycleSection.tsx`.
 *
 * Rendered by `SettingsScreen` only when `profile.sex === 'female'`, the same condition the
 * web applies at `frontend/src/pages/Settings.tsx:64`.
 *
 * This switch is the reason the whole feature was unreachable on this client.
 * `HomeScreen:388` renders `CycleCard` only when `profile.cycleTrackingEnabled`, and Expo
 * had no way to set it. The workaround — "turn it on in the browser" — did not work either,
 * because the web hides its copy of this section unless `sex` is female and `sex` was
 * itself unreachable from the phone.
 */

/** The web's range (`CycleSection.tsx:69-77`). */
export const MIN_CYCLE_LENGTH_DAYS = 15;
export const MAX_CYCLE_LENGTH_DAYS = 60;

/** The web's default, and `CycleCard`'s own fallback. */
const DEFAULT_CYCLE_LENGTH_DAYS = 28;

const RANGE_MESSAGE =
  `Enter a length between ${MIN_CYCLE_LENGTH_DAYS} and ${MAX_CYCLE_LENGTH_DAYS} days.`;

export function CycleSection() {
  const styles = useThemedStyles((colors) => ({
    rowLabel: {
      color: colors.text,
    },
    rowHint: {
      color: colors.textMuted,
    },
  }));

  const { profile, updateProfile, isUpdating } = useProfile();
  /**
   * The switch is DERIVED from the profile, with an override that lives only as long as the
   * write does. It is deliberately not a `useState` mirrored off the profile by an effect.
   *
   * The web does mirror it (`CycleSection.tsx:15-20`), and that is a bug it gets away with
   * because its profile is usually already cached. Mirroring makes every arrival of the
   * profile a write to the switch, so any read that lands mid-toggle — a first load the
   * user got ahead of, or a background refetch — sets the switch back to the value the
   * server has not been told about yet, and the user watches their own toggle undo itself.
   *
   * Deriving also makes the failure path correct for free. On success the mutation has
   * already written the new profile into the cache via `setQueryData`, and on failure it
   * has not; either way, dropping the override falls back to the truth rather than to a
   * hand-computed `!next` that can disagree with it.
   */
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
  const enabled = pendingEnabled ?? profile.cycleTrackingEnabled;

  const [cycleLength, setCycleLength] = useState(String(DEFAULT_CYCLE_LENGTH_DAYS));
  const [rangeError, setRangeError] = useState(false);

  // The length is genuinely form state — the user edits it — so it is seeded rather than
  // derived. Safe where the switch was not: this section only mounts once the profile has
  // loaded, because `SettingsScreen` gates it on `profile.sex === 'female'`.
  useEffect(() => {
    setCycleLength(String(profile.averageCycleLength ?? DEFAULT_CYCLE_LENGTH_DAYS));
  }, [profile]);

  const handleToggle = async (next: boolean) => {
    setPendingEnabled(next);
    setRangeError(false);
    try {
      await updateProfile({
        cycleTrackingEnabled: next,
        // Meaningless with tracking off, and sending it would write a number the user never
        // confirmed (`CycleSection.tsx:28`).
        averageCycleLength: next ? Number(cycleLength) : undefined,
      });
      Toast.show({
        type: 'success',
        text1: next ? 'Cycle tracking enabled' : 'Cycle tracking disabled',
      });
    } catch (error) {
      Toast.show({ type: 'error', text1: messageFor(error, 'Could not update setting') });
    } finally {
      setPendingEnabled(null);
    }
  };

  const handleSaveLength = async () => {
    const days = Number(cycleLength);
    /**
     * Checked here because nothing else will. The web spends this range on `<input min/max>`,
     * which a browser treats as advisory, and a React Native `TextInput` has no equivalent at
     * all — so without this a zero reaches `CycleCard`, whose day-of-cycle arithmetic divides
     * by it.
     */
    if (!Number.isFinite(days) || days < MIN_CYCLE_LENGTH_DAYS || days > MAX_CYCLE_LENGTH_DAYS) {
      setRangeError(true);
      return;
    }
    setRangeError(false);
    try {
      await updateProfile({ averageCycleLength: days });
      Toast.show({ type: 'success', text1: 'Cycle length updated' });
    } catch (error) {
      Toast.show({ type: 'error', text1: messageFor(error, 'Could not update cycle length') });
    }
  };

  return (
    <View>
      <View style={layout.row}>
        <View style={layout.rowText}>
          <Text variant="bodyMedium" style={styles.rowLabel}>Enable cycle tracking</Text>
          <Text variant="bodySmall" style={styles.rowHint}>
            Track your menstrual cycle and get predictions
          </Text>
        </View>
        <Switch
          accessibilityLabel="Enable cycle tracking"
          value={enabled}
          onValueChange={handleToggle}
          disabled={isUpdating}
        />
      </View>

      {enabled && (
        <View style={layout.lengthBlock}>
          <TextInput
            mode="outlined"
            label="Average cycle length (days)"
            accessibilityLabel="Average cycle length (days)"
            keyboardType="number-pad"
            value={cycleLength}
            onChangeText={(value) => {
              setCycleLength(value);
              setRangeError(false);
            }}
          />
          {rangeError && (
            <HelperText type="error" visible>
              {RANGE_MESSAGE}
            </HelperText>
          )}
          <Button
            mode="contained"
            onPress={handleSaveLength}
            disabled={isUpdating}
            style={layout.save}
          >
            Save
          </Button>
        </View>
      )}
    </View>
  );
}

// No colour dependency — only styles that read `colors` have to live on `useThemedStyles`.
const layout = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  lengthBlock: {
    marginTop: spacing.sm,
  },
  save: {
    marginTop: spacing.sm,
  },
});
