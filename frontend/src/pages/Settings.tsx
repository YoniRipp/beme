import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { AccountSection } from '@/components/settings/AccountSection';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { CycleSection } from '@/components/settings/CycleSection';
import { useProfile } from '@/hooks/useProfile';
import { DateFormatSection } from '@/components/settings/DateFormatSection';
import { UnitsSection } from '@/components/settings/UnitsSection';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { DataManagementSection } from '@/components/settings/DataManagementSection';
import { SubscriptionSection } from '@/components/settings/SubscriptionSection';
import { storage } from '@/lib/storage';
import { PendingInvitations } from '@/components/trainer/PendingInvitations';

export function Settings() {
  const { updateSettings } = useSettings();
  const { profile } = useProfile();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleClearData = () => {
    try {
      storage.clear();
      toast.success('All data cleared');
      window.location.reload();
    } catch {
      toast.error('Could not clear data. Please try again.');
    }
  };

  const handleResetSettings = () => {
    try {
      updateSettings(DEFAULT_SETTINGS);
      toast.success('Settings reset to defaults');
    } catch {
      toast.error('Could not reset settings. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="font-display text-[28px] md:text-[32px] font-medium tracking-tight leading-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1.5">Manage your account, preferences, and data.</p>
      </div>
      <SubscriptionSection />
      <AccountSection />
      <ProfileSection />
      {profile.sex === 'female' && <CycleSection />}
      <DateFormatSection />
      <UnitsSection />
      <AppearanceSection />
      <NotificationsSection />
      <PendingInvitations />
      <DataManagementSection
        onResetClick={() => setShowResetConfirm(true)}
        onClearClick={() => setShowClearConfirm(true)}
      />

      <ConfirmationDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Clear All Data"
        message="Are you sure you want to delete all your data? This action cannot be undone. All workouts, food entries, and other data will be permanently deleted."
        onConfirm={handleClearData}
        confirmLabel="Clear All Data"
        cancelLabel="Cancel"
        variant="destructive"
      />

      <ConfirmationDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Reset Settings"
        message="Are you sure you want to reset all settings to their default values? Your data will not be affected."
        onConfirm={handleResetSettings}
        confirmLabel="Reset Settings"
        cancelLabel="Cancel"
        variant="default"
      />
    </div>
  );
}
