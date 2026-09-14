import React from 'react';
import { View } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface EmptyStateProps {
  /**
   * Tinted glyph above the title. Present for a first-run state ("you have nothing yet,
   * here is how to start"); omit for the quieter "nothing matched your filter" panel.
   */
  icon?: string;
  title: string;
  subtitle?: string;
  /** Label for the action button. Required for the button to render. */
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * The single empty state, with the same first-run / no-match split the web's
 * `frontend/src/components/shared/EmptyState.tsx` keys off `!!icon`. A filter that
 * matched nothing is not the same message as an account with nothing in it, and the
 * quieter treatment keeps the second from reading like the first.
 */
export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useThemeContext();
  const firstRun = !!icon;
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    title: { marginTop: 16, color: colors.text, textAlign: 'center', fontWeight: '800' },
    // Quieter, but still a heading rather than body copy — bodyMedium alone would render
    // it at regular weight.
    noMatchTitle: { fontWeight: '700' },
    subtitle: { marginTop: 8, color: colors.textMuted, textAlign: 'center' },
    button: { marginTop: 16 },
  }));
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      {icon && <Icon source={icon} size={48} color={colors.textMuted} />}
      <Text
        variant={firstRun ? 'titleMedium' : 'bodyMedium'}
        style={[styles.title, !firstRun && styles.noMatchTitle]}
      >
        {title}
      </Text>
      {subtitle && <Text variant="bodyMedium" style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Button
          mode={firstRun ? 'contained' : 'outlined'}
          onPress={onAction}
          style={styles.button}
          accessibilityLabel={actionLabel}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
