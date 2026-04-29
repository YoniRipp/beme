import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, List, RadioButton, Switch, Text } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { MobileScreen } from '../components/shared/MobileScreen';
import { colors, radius, spacing } from '../theme';

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [notifications, setNotifications] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  return (
    <MobileScreen title="Settings" subtitle="Manage your account, preferences, and data.">
      <SettingsCard title="Account">
        <List.Item title="Name" description={user?.name || '--'} left={(props) => <List.Icon {...props} icon="account" />} />
        <List.Item title="Email" description={user?.email || '--'} left={(props) => <List.Icon {...props} icon="email" />} />
      </SettingsCard>

      <SettingsCard title="Units">
        <RadioButton.Group onValueChange={(v) => setWeightUnit(v as 'kg' | 'lbs')} value={weightUnit}>
          <RadioButton.Item label="Kilograms (kg)" value="kg" />
          <RadioButton.Item label="Pounds (lbs)" value="lbs" />
        </RadioButton.Group>
      </SettingsCard>

      <SettingsCard title="Notifications">
        <List.Item
          title="Push Notifications"
          description="Workout, food, and goal reminders"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={() => <Switch value={notifications} onValueChange={setNotifications} />}
        />
      </SettingsCard>

      <SettingsCard title="Data">
        <Button
          mode="outlined"
          icon="trash-can-outline"
          textColor={colors.danger}
          onPress={() => setShowClearDialog(true)}
          style={styles.dangerButton}
        >
          Clear All Data
        </Button>
      </SettingsCard>

      <Button mode="contained" onPress={logout} buttonColor={colors.danger} style={styles.signOutButton}>
        Sign Out
      </Button>

      <ConfirmDialog
        visible={showClearDialog}
        onDismiss={() => setShowClearDialog(false)}
        title="Clear All Data"
        message="This will permanently delete all your workouts, food entries, sleep logs, and goals. This cannot be undone."
        confirmLabel="Clear All"
        destructive
        onConfirm={() => setShowClearDialog(false)}
      />
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
  dangerButton: {
    borderColor: colors.danger,
    marginHorizontal: spacing.sm,
  },
  signOutButton: {
    marginTop: spacing.sm,
  },
});
