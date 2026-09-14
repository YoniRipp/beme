import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  /**
   * When set, the confirm button stays disabled until the user types this word exactly.
   *
   * A click-through dialog is the right weight for "delete this goal"; it is not the right
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

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  confirmationPhrase,
  warning,
  busy = false,
}: ConfirmationDialogProps) {
  const [typed, setTyped] = useState('');

  // Reopening the dialog must not inherit the phrase typed the last time it was open, or the
  // second attempt is a single click.
  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const unconfirmed = confirmationPhrase != null && typed.trim() !== confirmationPhrase;

  const handleConfirm = () => {
    if (unconfirmed || busy) return;
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        {warning ? (
          <p className="text-sm font-semibold text-destructive">{warning}</p>
        ) : null}
        {confirmationPhrase ? (
          <div className="space-y-2">
            <Label htmlFor="confirmation-phrase">
              Type {confirmationPhrase} to confirm
            </Label>
            <Input
              id="confirmation-phrase"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            disabled={unconfirmed || busy}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
