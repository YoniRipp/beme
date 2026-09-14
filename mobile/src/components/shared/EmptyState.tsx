import React from 'react';
import { View } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'plus-circle-outline', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useThemeContext();
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    title: { marginTop: 16, color: colors.text, textAlign: 'center' },
    subtitle: { marginTop: 8, color: colors.textMuted, textAlign: 'center' },
    button: { marginTop: 16 },
  }));
  return (
    <View style={styles.container}>
      <Icon source={icon} size={48} color={colors.textMuted} />
      <Text variant="titleMedium" style={styles.title}>{title}</Text>
      {subtitle && <Text variant="bodyMedium" style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
