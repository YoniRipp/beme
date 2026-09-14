import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, List, RadioButton, SegmentedButtons, Text } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {
  BALANCE_DISPLAY_COLORS,
  type BalanceDisplayColor,
  type Theme,
  type Units,
} from '@trackvibe/shared/settings';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useSettings';
import { authApi } from '../core/api/auth';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { MobileScreen } from '../components/shared/MobileScreen';
import { radius, spacing } from '../theme';
import { useThemeContext } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

const ACCOUNT_TITLE = 'Account';
const UNITS_TITLE = 'Units';
const APPEARANCE_TITLE = 'Appearance';
const DELETE_ACCOUNT_TITLE = 'Delete account';

/**
 * Typed rather than tapped. App Store Guideline 5.1.1(v) requires deletion to be reachable
 * in-app; nothing requires it to be reachable by accident.
 */
export const DELETE_ACCOUNT_CONFIRMATION_PHRASE = 'DELETE';

/**
 * Titles of the settings sections this screen renders, in render order. Exported so a test
 * can check the screen's section structure without rendering it.
 *
 * This list is load-bearing, not decorative: `SettingsCard` accepts only a title drawn from
 * it, so adding a section to the JSX without adding it here is a compile error, and adding
 * it here fails the test. That closed the loop on the "Data" section (a Clear All Data
 * control whose confirm handler deleted nothing) in the previous phase, and closes it here
 * on "Notifications" (a switch that persisted nothing and had no web counterpart at all —
 * `frontend/src/pages/Settings.tsx` has no setting it backs). "Appearance" is new, matching
 * `frontend/src/components/settings/AppearanceSection.tsx`. The three remaining titles are
 * in the same relative order the web renders them in.
 *
 * "Delete account" is last, and matches `frontend/src/components/settings/
 * DeleteAccountSection.tsx`. It exists because App Store Guideline 5.1.1(v) requires an app
 * that can create an account to let the user delete it from inside the app, and it is
 * deliberately the final section: a destructive, irreversible control does not belong
 * between two preference pickers.
 */
export const SETTINGS_SECTION_TITLES = [
  ACCOUNT_TITLE,
  UNITS_TITLE,
  APPEARANCE_TITLE,
  DELETE_ACCOUNT_TITLE,
] as const;

type SettingsSectionTitle = (typeof SETTINGS_SECTION_TITLES)[number];

// Matches `AppearanceSection.tsx`'s three-way theme buttons (Light/Dark/System with
// Sun/Moon/Monitor icons). `Theme` (not a raw string) keeps this list and the `updateSettings`
// call below in sync with `@trackvibe/shared/settings`.
const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: 'weather-sunny' },
  { value: 'dark', label: 'Dark', icon: 'weather-night' },
  { value: 'system', label: 'System', icon: 'monitor' },
];

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const { colors } = useThemeContext();
  const { settings, updateSettings } = useSettings();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await authApi.deleteAccount();
    } catch {
      Toast.show({ type: 'error', text1: 'Could not delete your account. Please try again.' });
      setDeleting(false);
      return;
    }

    Toast.show({ type: 'success', text1: 'Your account has been deleted' });
    // Cleared *before* logout, not after. `logout` swaps the navigator to the signed-out
    // stack and unmounts this screen, so a reset afterwards would set state on a screen
    // that is going away — and if the stack ever kept it mounted instead, the button would
    // stay disabled with no way to retry.
    setDeleting(false);
    // The server has blocklisted the whole user, so the local session is dead whatever
    // happens next. (`logout` here is synchronous and returns void — unlike the web
    // AuthContext's — so there is nothing to await or catch.)
    logout();
  };

  return (
    <MobileScreen title="Settings" subtitle="Manage your account, preferences, and data.">
      <SettingsCard title={ACCOUNT_TITLE}>
        <List.Item title="Name" description={user?.name || '--'} left={(props) => <List.Icon {...props} icon="account" />} />
        <List.Item title="Email" description={user?.email || '--'} left={(props) => <List.Icon {...props} icon="email" />} />
      </SettingsCard>

      <SettingsCard title={UNITS_TITLE}>
        <RadioButton.Group
          onValueChange={(value) => updateSettings({ units: value as Units })}
          value={settings.units}
        >
          <RadioButton.Item label="Metric (kg, cm)" value="metric" />
          <RadioButton.Item label="Imperial (lbs, in)" value="imperial" />
        </RadioButton.Group>
      </SettingsCard>

      <SettingsCard title={APPEARANCE_TITLE}>
        <Text variant="labelLarge" style={styles.groupLabel}>Theme</Text>
        <SegmentedButtons
          value={settings.theme}
          onValueChange={(value) => updateSettings({ theme: value as Theme })}
          buttons={THEME_OPTIONS}
          style={styles.segment}
        />

        <Text variant="labelLarge" style={styles.groupLabel}>Accent color</Text>
        <RadioButton.Group
          onValueChange={(value) => updateSettings({ balanceDisplayColor: value as BalanceDisplayColor })}
          value={settings.balanceDisplayColor}
        >
          {BALANCE_DISPLAY_COLORS.map((option) => (
            <RadioButton.Item key={option.value} label={option.label} value={option.value} />
          ))}
        </RadioButton.Group>
      </SettingsCard>

      <Button mode="contained" onPress={logout} buttonColor={colors.danger} style={styles.signOutButton}>
        Sign Out
      </Button>

      <SettingsCard title={DELETE_ACCOUNT_TITLE}>
        <Text variant="bodyMedium" style={styles.deleteBlurb}>
          Permanently deletes your account and everything in it — workouts, food entries,
          sleep, weight, water and cycle history, and any photos you uploaded. This cannot be
          undone.
        </Text>
        <Button
          mode="outlined"
          onPress={() => setDeleteVisible(true)}
          textColor={colors.danger}
          disabled={deleting}
          style={styles.deleteButton}
        >
          Delete my account
        </Button>
      </SettingsCard>

      <ConfirmDialog
        visible={deleteVisible}
        onDismiss={() => setDeleteVisible(false)}
        title="Delete account"
        message={`This permanently deletes the account for ${user?.email || 'this user'} and all of its data.`}
        warning="This cannot be undone, and your data cannot be recovered."
        confirmationPhrase={DELETE_ACCOUNT_CONFIRMATION_PHRASE}
        confirmLabel="Delete permanently"
        onConfirm={handleDeleteAccount}
        destructive
      />
    </MobileScreen>
  );
}

function SettingsCard({ title, children }: { title: SettingsSectionTitle; children: React.ReactNode }) {
  const styles = useThemedStyles((colors) => ({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      color: colors.text,
      fontWeight: '800',
      marginBottom: spacing.sm,
    },
    sectionBody: {
      marginHorizontal: -spacing.sm,
    },
  }));

  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionBody}>{children}</View>
      </Card.Content>
    </Card>
  );
}

// `signOutButton`/`groupLabel`/`segment` have no colour dependency (only `spacing`), so —
// unlike `SettingsCard`'s styles above — they don't need to move off `StyleSheet.create`;
// the frozen-palette bug this migration fixes only affects styles that read `colors`.
const styles = StyleSheet.create({
  signOutButton: {
    marginTop: spacing.sm,
  },
  groupLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  segment: {
    marginBottom: spacing.sm,
  },
  deleteBlurb: {
    marginBottom: spacing.md,
  },
  deleteButton: {
    marginBottom: spacing.xs,
  },
});
