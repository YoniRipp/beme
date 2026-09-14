import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authApi } from '@/features/auth/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/shared/ToastProvider';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { SettingsSection } from './SettingsSection';

/**
 * Typed rather than clicked. Deletion has to be reachable; nothing requires it to be
 * reachable by accident. Kept identical to the Expo screen's phrase so the two clients ask
 * for the same thing (`mobile/src/screens/SettingsScreen.tsx`).
 */
export const DELETE_ACCOUNT_CONFIRMATION_PHRASE = 'DELETE';

/**
 * Web counterpart of the Expo "Delete account" settings section. App Store Guideline
 * 5.1.1(v) is what forces this to exist on the native client; it lands here too because the
 * two clients are meant to offer the same settings, and because the web app can create
 * accounts as well.
 */
export function DeleteAccountSection() {
  const { user, logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await authApi.deleteAccount();
      toast.success('Your account has been deleted');
      // The server has already blocklisted this token, so the session is dead whatever
      // happens next. `logout` clears the local caches and the offline queue too — leaving
      // a deleted account's rows in IndexedDB would be its own small privacy failure.
      await logout();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Could not delete your account. Please try again.',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SettingsSection icon={Trash2} title="Delete account" iconColor="text-destructive">
      <p className="mb-4 text-sm text-muted-foreground">
        Permanently deletes your account and everything in it — workouts, food entries, sleep,
        weight, water and cycle history, and any photos you uploaded. This cannot be undone.
      </p>
      <Button
        variant="destructive"
        className="w-full"
        disabled={deleting}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete my account
      </Button>

      <ConfirmationDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete account"
        message={`This permanently deletes the account for ${user?.email ?? 'this user'} and all of its data.`}
        warning="This cannot be undone, and your data cannot be recovered."
        confirmationPhrase={DELETE_ACCOUNT_CONFIRMATION_PHRASE}
        confirmLabel="Delete permanently"
        onConfirm={handleDelete}
        busy={deleting}
        variant="destructive"
      />
    </SettingsSection>
  );
}
