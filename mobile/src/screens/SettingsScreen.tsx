import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, List, RadioButton, Switch, Text } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { MobileScreen } from '../components/shared/MobileScreen';
import { radius, spacing } from '../theme';
import { useThemeContext } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

const ACCOUNT_TITLE = 'Account';
const UNITS_TITLE = 'Units';
const NOTIFICATIONS_TITLE = 'Notifications';

/**
 * Titles of the settings sections this screen renders, in render order. Exported so a test
 * can check the screen's section structure without rendering it.
 *
 * This list is load-bearing, not decorative: `SettingsCard` accepts only a title drawn from
 * it, so adding a section to the JSX without adding it here is a compile error, and adding
 * it here fails the test. That closes the loop on the "Data" section, which existed solely
 * to host a Clear All Data control whose confirm handler deleted nothing.
 */
export const SETTINGS_SECTION_TITLES = [ACCOUNT_TITLE, UNITS_TITLE, NOTIFICATIONS_TITLE] as const;

type SettingsSectionTitle = (typeof SETTINGS_SECTION_TITLES)[number];

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const { colors } = useThemeContext();
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [notifications, setNotifications] = useState(false);

  return (
    <MobileScreen title="Settings" subtitle="Manage your account, preferences, and data.">
      <SettingsCard title={ACCOUNT_TITLE}>
        <List.Item title="Name" description={user?.name || '--'} left={(props) => <List.Icon {...props} icon="account" />} />
        <List.Item title="Email" description={user?.email || '--'} left={(props) => <List.Icon {...props} icon="email" />} />
      </SettingsCard>

      <SettingsCard title={UNITS_TITLE}>
        <RadioButton.Group onValueChange={(v) => setWeightUnit(v as 'kg' | 'lbs')} value={weightUnit}>
          <RadioButton.Item label="Kilograms (kg)" value="kg" />
          <RadioButton.Item label="Pounds (lbs)" value="lbs" />
        </RadioButton.Group>
      </SettingsCard>

      <SettingsCard title={NOTIFICATIONS_TITLE}>
        <List.Item
          title="Push Notifications"
          description="Workout, food, and goal reminders"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={() => <Switch value={notifications} onValueChange={setNotifications} />}
        />
      </SettingsCard>

      <Button mode="contained" onPress={logout} buttonColor={colors.danger} style={styles.signOutButton}>
        Sign Out
      </Button>
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

// `signOutButton` has no colour dependency (only `spacing`), so — unlike `SettingsCard`'s
// styles above — it doesn't need to move off `StyleSheet.create`; the frozen-palette bug
// this migration fixes only affects styles that read `colors`.
const styles = StyleSheet.create({
  signOutButton: {
    marginTop: spacing.sm,
  },
});
