import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, List, RadioButton, Switch, Text } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { MobileScreen } from '../components/shared/MobileScreen';
import { colors, radius, spacing } from '../theme';

const ACCOUNT_TITLE = 'Account';
const UNITS_TITLE = 'Units';
const NOTIFICATIONS_TITLE = 'Notifications';

/**
 * Titles of the settings sections this screen renders, in the order they render, sourced
 * by the JSX below rather than duplicated from it. Exported so a test can check the
 * screen's actual section structure without rendering it (react-native component
 * rendering isn't wired up in this project's jest setup): in particular, that there is no
 * "Data" section, which used to exist solely to host a Clear All Data control whose
 * confirm handler deleted nothing.
 */
export const SETTINGS_SECTION_TITLES: string[] = [ACCOUNT_TITLE, UNITS_TITLE, NOTIFICATIONS_TITLE];

export function SettingsScreen() {
  const { user, logout } = useAuth();
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

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionBody}>{children}</View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
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
  signOutButton: {
    marginTop: spacing.sm,
  },
});
