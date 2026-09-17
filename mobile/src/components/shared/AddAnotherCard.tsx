import React from 'react';
import { Pressable } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { fonts, radius, spacing } from '../../theme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface AddAnotherCardProps {
  onPress: () => void;
  icon?: string;
  label: string;
}

/**
 * The dashed "add another" affordance that closes a list, ported from the web's
 * `frontend/src/components/shared/AddAnotherCard.tsx`. It reads as part of the list
 * rather than as a competing primary action, which a filled button at the end of a
 * scroll does not.
 */
export function AddAnotherCard({ onPress, icon = 'plus', label }: AddAnotherCardProps) {
  const { colors } = useThemeContext();
  const styles = useThemedStyles((colors) => ({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      minHeight: 44,
      paddingVertical: spacing.lg,
      // `rounded-2xl` on the web, same as a real card -- it sits in a list of them. It keeps
      // its own dashed border and no shadow, so it stays a Pressable rather than `ui/Card`.
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    label: {
      color: colors.textMuted,
      fontFamily: fonts.semibold,
      fontWeight: '600',
    },
  }));

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Icon source={icon} size={16} color={colors.textMuted} />
      <Text variant="bodyMedium" style={styles.label}>{label}</Text>
    </Pressable>
  );
}
