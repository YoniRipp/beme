import React from 'react';
import { View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';
import { Card } from '../ui';
import { radius, spacing } from '../../theme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface QuickTileProps {
  /** MaterialCommunityIcons name. */
  icon: string;
  label: string;
  /**
   * What is already logged today — "7.5h", "82kg". Present so the action stays reachable
   * AFTER it has been used, which is the reason the web's grid comment gives
   * (`frontend/src/pages/Home.tsx:269-270`).
   */
  pill?: string;
  onPress: () => void;
}

/** The web's tile height (`frontend/src/components/ui/quick-tile.tsx:28`), well over the 44px minimum. */
export const QUICK_TILE_HEIGHT = 78;

/**
 * One tile in Home's quick-log grid: an icon, a label, and an optional logged-today pill.
 *
 * The Expo analogue of `frontend/src/components/ui/quick-tile.tsx`, same anatomy and the
 * same height. It replaces three stacked full-width `Button`s that had no pills, no weight
 * action, and a contained/outlined hierarchy the web does not have — logging food is not a
 * more primary action than logging a workout, and painting it that way said it was.
 */
export function QuickTile({ icon, label, pill, onPress }: QuickTileProps) {
  const { colors } = useThemeContext();
  const styles = useThemedStyles((colors) => ({
    wrapper: {
      flex: 1,
    },
    /**
     * The ripple is clipped here rather than on the card: `overflow: 'hidden'` clips a view's
     * own shadow on iOS too, so putting it on the card would delete the elevation the web's
     * tile has (`quick-tile.tsx` is `shadow-card`).
     */
    clip: {
      borderRadius: radius.xxl,
      overflow: 'hidden',
    },
    ripple: {
      height: QUICK_TILE_HEIGHT,
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    pill: {
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    pillText: {
      color: colors.textMuted,
      fontWeight: '700',
    },
    label: {
      color: colors.text,
      fontWeight: '700',
    },
  }));

  return (
    <Card style={styles.wrapper}>
      <View style={styles.clip}>
        <TouchableRipple
          onPress={onPress}
          accessibilityRole="button"
          // The pill is part of what the control says: "Log sleep, 7.5h logged today".
          accessibilityLabel={pill ? `${label}, ${pill} logged today` : label}
          style={styles.ripple}
        >
          <>
            <View style={styles.top}>
              <Icon source={icon} size={22} color={colors.text} />
              {pill != null && (
                <View style={styles.pill}>
                  <Text variant="labelSmall" style={styles.pillText} numberOfLines={1}>
                    {pill}
                  </Text>
                </View>
              )}
            </View>
            <Text variant="bodyMedium" style={styles.label} numberOfLines={1}>
              {label}
            </Text>
          </>
        </TouchableRipple>
      </View>
    </Card>
  );
}
