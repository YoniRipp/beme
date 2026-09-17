import React from 'react';
import { StyleSheet, View } from 'react-native';
import { List, RadioButton, SegmentedButtons, Text } from 'react-native-paper';
import { Button, Card } from '../components/ui';
import {
  BALANCE_DISPLAY_COLORS,
  type BalanceDisplayColor,
  type Theme,
  type Units,
} from '@trackvibe/shared/settings';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useSettings';
import { useProfile } from '../hooks/useProfile';
import { MobileScreen } from '../components/shared/MobileScreen';
import { fonts, spacing } from '../theme';
import { useThemeContext } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

const ACCOUNT_TITLE = 'Account';
const UNITS_TITLE = 'Units';
const APPEARANCE_TITLE = 'Appearance';

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
 */
export const SETTINGS_SECTION_TITLES = [ACCOUNT_TITLE, UNITS_TITLE, APPEARANCE_TITLE] as const;

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
  const { updateProfile } = useProfile();

  /**
   * Save the unit choice on the device, and report it to the server.
   *
   * Settings are device-local by design and that does not change here — `AppSettings.units`
   * stays what the UI reads. The server copy exists because `getWeightUnit` relabels `kg` to
   * `lbs` without converting, so imperial users' weights sit in a kilograms field, and until
   * now nothing server-side knew which accounts those were. See `docs/HANDOFF.md`,
   * "Needs the owner".
   *
   * Best-effort: a failed report must not undo the user's choice or surface an error at them,
   * so it is logged rather than thrown or swallowed.
   */
  const reportUnits = (units: Units) => {
    updateSettings({ units });
    void updateProfile({ units }).catch((error) => {
      console.warn('Could not report unit preference to the server', error);
    });
  };

  return (
    <MobileScreen title="Settings" subtitle="Manage your account, preferences, and data.">
      <SettingsCard title={ACCOUNT_TITLE}>
        <List.Item title="Name" description={user?.name || '--'} left={(props) => <List.Icon {...props} icon="account" />} />
        <List.Item title="Email" description={user?.email || '--'} left={(props) => <List.Icon {...props} icon="email" />} />
      </SettingsCard>

      <SettingsCard title={UNITS_TITLE}>
        <RadioButton.Group
          onValueChange={(value) => reportUnits(value as Units)}
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
    </MobileScreen>
  );
}

function SettingsCard({ title, children }: { title: SettingsSectionTitle; children: React.ReactNode }) {
  const styles = useThemedStyles((colors) => ({
    card: {},
    sectionTitle: {
      color: colors.text,
      fontFamily: fonts.bold,
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
});
