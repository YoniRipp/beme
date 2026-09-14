import React from 'react';
import { View } from 'react-native';
import { Card, Icon, Text, TouchableRipple } from 'react-native-paper';
import { radius, spacing } from '../../theme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

export type CardTone = 'primary' | 'food' | 'workout' | 'sleep';

interface SectionCardProps {
  /** MaterialCommunityIcons name for the tinted glyph beside the title. */
  icon?: string;
  title?: string;
  tone?: CardTone;
  /** Right-hand slot in the header row — a value, a hint, a small control. */
  trailing?: React.ReactNode;
  /** Makes the whole card a control, the way the web's `WeightProgress` card is. */
  onPress?: () => void;
  accessibilityLabel?: string;
  children?: React.ReactNode;
}

/**
 * The card shell every Home section sits in: the app's surface, border and radius, with an
 * optional tinted-icon header.
 *
 * Home gained five cards at once, and without this each of them would have carried its own
 * copy of the same six style rules — which is how the surface/border/radius drift between
 * cards that `agent-os/standards/frontend/components.md` warns about starts. `MetricCard` is
 * the stat tile and stays as it is; this is its full-width sibling, not a replacement.
 *
 * `TouchableRipple` rather than a `Pressable` wrapper so the press state is Paper's, and
 * inside the card so the ripple is clipped to the rounded corners.
 */
export function SectionCard({
  icon,
  title,
  tone = 'primary',
  trailing,
  onPress,
  accessibilityLabel,
  children,
}: SectionCardProps) {
  const { colors } = useThemeContext();

  const toneColor: Record<CardTone, string> = {
    primary: colors.primary,
    food: colors.food,
    workout: colors.workout,
    sleep: colors.sleep,
  };
  const toneBg: Record<CardTone, string> = {
    primary: colors.primarySoft,
    food: colors.foodSoft,
    workout: colors.workoutSoft,
    sleep: colors.sleepSoft,
  };

  const styles = useThemedStyles((colors) => ({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    content: {
      gap: spacing.md,
      paddingVertical: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      color: colors.text,
      fontWeight: '800',
    },
  }));

  const body = (
    <Card.Content style={styles.content}>
      {(icon || title || trailing) && (
        <View style={styles.header}>
          {icon && (
            <View style={[styles.iconWrap, { backgroundColor: toneBg[tone] }]}>
              <Icon source={icon} size={16} color={toneColor[tone]} />
            </View>
          )}
          {title && (
            <Text variant="titleMedium" style={styles.title}>
              {title}
            </Text>
          )}
          {trailing}
        </View>
      )}
      {children}
    </Card.Content>
  );

  return (
    <Card mode="contained" style={styles.card}>
      {onPress ? (
        <TouchableRipple
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? title}
        >
          {body}
        </TouchableRipple>
      ) : (
        body
      )}
    </Card>
  );
}
