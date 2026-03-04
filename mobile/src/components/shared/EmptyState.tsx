import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'plus-circle-outline', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Icon source={icon} size={48} color="#9ca3af" />
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

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { marginTop: 16, color: '#374151', textAlign: 'center' },
  subtitle: { marginTop: 8, color: '#9ca3af', textAlign: 'center' },
  button: { marginTop: 16 },
});
