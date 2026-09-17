import React from 'react';
import { Text } from 'react-native-paper';
import { useThemedStyles } from '../../theme/useThemedStyles';

/**
 * The one way this app says "that did not load".
 *
 * `accessibilityRole="alert"` is the load-bearing part: VoiceOver announces it when it
 * appears, so the message reaches a user who is not looking at the top of the screen. Copied
 * from `GoalsScreen`, which was the only screen rendering an error at all.
 *
 * Renders nothing for a null message, so a call site can pass the hook's error straight
 * through without a conditional of its own.
 */
export function ErrorNotice({ message }: { message: string | null }) {
  const styles = useThemedStyles((colors) => ({
    error: { color: colors.danger },
  }));

  if (!message) return null;

  return (
    <Text variant="bodySmall" style={styles.error} accessibilityRole="alert">
      {message}
    </Text>
  );
}
