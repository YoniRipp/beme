import React from 'react';
import { Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { fonts, spacing } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /**
   * Overrides the spoken name. The visible label is often a bare noun ("Cardio", "Chest")
   * that only makes sense next to the list it filters, so a screen says "Cardio workouts"
   * or "Chest exercises" here.
   */
  accessibilityLabel?: string;
}

/**
 * The pill that turns a facet on and off.
 *
 * Extracted from `BodyScreen`, which grew the first copy, at the moment the exercises
 * library needed the same three rows of them. `agent-os/standards/frontend/components.md`
 * calls the second copy of a surface a bug, and the sibling guard
 * `theme/__tests__/cardsUseThePrimitive.test.ts` exists because four components each grew
 * their own card before anyone noticed — a chip is the same story one size down, so it gets
 * a primitive before the third copy rather than after it.
 *
 * `minHeight: 44` is not decoration. The whole point of these is being tapped mid-set with
 * one hand, and 44pt is Apple's touch-target floor; the web's own chip carries `min-h-11`
 * for the same reason (`frontend/src/components/body/ExercisePickerSheet.tsx`).
 *
 * `accessibilityState.selected` rather than a colour alone: the fill is the only visual cue
 * that a facet is active, and a screen reader cannot see a fill.
 */
export function FilterChip({ label, selected, onPress, accessibilityLabel }: FilterChipProps) {
  const styles = useThemedStyles((colors) => ({
    chip: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      // `999` is how React Native spells `rounded-full`; it has no keyword for it.
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    label: {
      color: colors.textMuted,
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
    labelSelected: {
      color: colors.primaryForeground,
    },
  }));

  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text variant="labelMedium" style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}
