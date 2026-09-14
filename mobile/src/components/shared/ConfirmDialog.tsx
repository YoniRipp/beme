import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Dialog, Portal, Button, Text, TextInput } from 'react-native-paper';
import { spacing } from '../../theme';
import { useThemeContext } from '../../theme/ThemeContext';

interface ConfirmDialogProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
  /**
   * When set, the confirm button stays disabled until the user types this word exactly.
   *
   * A tap-through dialog is the right weight for "delete this workout"; it is not the right
   * weight for an irreversible account deletion, which is why this is opt-in per call site
   * rather than the default. Password re-entry was the alternative and is not usable here:
   * `users.password_hash` is nullable and Google, Facebook and Twitter sign-ins have none.
   */
  confirmationPhrase?: string;
  /** Extra warning shown under the message, for irreversible actions. */
  warning?: string;
  /** Disables the confirm button while a request is in flight. */
  busy?: boolean;
}

export function ConfirmDialog({
  visible,
  onDismiss,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  destructive = false,
  confirmationPhrase,
  warning,
  busy = false,
}: ConfirmDialogProps) {
  const { colors } = useThemeContext();
  const [typed, setTyped] = useState('');

  // Reopening the dialog must not inherit the phrase typed the last time it was open, or the
  // second attempt is a single tap.
  useEffect(() => {
    if (!visible) setTyped('');
  }, [visible]);

  const unconfirmed = confirmationPhrase != null && typed.trim() !== confirmationPhrase;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
          {warning ? (
            <Text variant="bodyMedium" style={[styles.warning, { color: colors.danger }]}>
              {warning}
            </Text>
          ) : null}
          {confirmationPhrase ? (
            <TextInput
              mode="outlined"
              style={styles.input}
              label={`Type ${confirmationPhrase} to confirm`}
              accessibilityLabel={`Type ${confirmationPhrase} to confirm`}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            onPress={() => { onConfirm(); onDismiss(); }}
            disabled={unconfirmed || busy}
            loading={busy}
            textColor={destructive ? colors.danger : undefined}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

// Spacing only, no colour dependency, so these can stay on a module-scope StyleSheet --
// the warning's colour is applied inline from the resolved palette above.
const styles = StyleSheet.create({
  warning: {
    marginTop: spacing.sm,
    fontWeight: '700',
  },
  input: {
    marginTop: spacing.md,
  },
});
