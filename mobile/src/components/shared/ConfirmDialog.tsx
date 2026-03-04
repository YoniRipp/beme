import React from 'react';
import { Dialog, Portal, Button, Text } from 'react-native-paper';

interface ConfirmDialogProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  visible,
  onDismiss,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            onPress={() => { onConfirm(); onDismiss(); }}
            textColor={destructive ? '#ef4444' : undefined}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
