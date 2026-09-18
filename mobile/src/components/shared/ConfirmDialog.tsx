import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { Button } from '../ui';
import { fonts, spacing } from '../../theme';
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
}

// No `busy` prop. Confirming dismisses the dialog synchronously, before the caller's own
// state update can re-render it, so an in-flight flag passed down here could never be
// observed — it would render as a spinner that never appears and a guard that never guards.
// Callers disable their own trigger button for the duration instead, which does work.

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
}: ConfirmDialogProps) {
  const { colors } = useThemeContext();
  const [typed, setTyped] = useState('');

  // Reopening the dialog must not inherit the phrase typed the last time it was open, or the
  // second attempt is a single tap.
  useEffect(() => {
    if (!visible) setTyped('');
  }, [visible]);

  // Case-insensitive, matching `frontend/src/components/shared/ConfirmationDialog.tsx`.
  // `autoCapitalize="characters"` below already uppercases most input here, but it has no
  // web equivalent, and the two clients must accept the same keystrokes.
  const unconfirmed =
    confirmationPhrase != null &&
    typed.trim().toLowerCase() !== confirmationPhrase.toLowerCase();

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
            disabled={unconfirmed}
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
    // A weight is a family here, not a number -- `fontWeight: '700'` on its own renders in
    // the system font. See the mapping table in `theme.ts`.
    fontFamily: fonts.bold,
    fontWeight: '700',
  },
  input: {
    marginTop: spacing.md,
  },
});
