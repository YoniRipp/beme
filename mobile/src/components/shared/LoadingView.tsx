import React from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface LoadingViewProps {
  message?: string;
}

export function LoadingView({ message = 'Loading...' }: LoadingViewProps) {
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    text: { marginTop: 16, color: colors.textMuted },
  }));
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text variant="bodyMedium" style={styles.text}>{message}</Text>
    </View>
  );
}
