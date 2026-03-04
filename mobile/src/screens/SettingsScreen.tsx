import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { List, Button, Divider, Text, Switch, RadioButton, Card } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [notifications, setNotifications] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.section} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Account</Text>
          <List.Item title="Name" description={user?.name || '--'} left={(props) => <List.Icon {...props} icon="account" />} />
          <List.Item title="Email" description={user?.email || '--'} left={(props) => <List.Icon {...props} icon="email" />} />
        </Card.Content>
      </Card>

      <Card style={styles.section} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Units</Text>
          <RadioButton.Group onValueChange={(v) => setWeightUnit(v as 'kg' | 'lbs')} value={weightUnit}>
            <RadioButton.Item label="Kilograms (kg)" value="kg" />
            <RadioButton.Item label="Pounds (lbs)" value="lbs" />
          </RadioButton.Group>
        </Card.Content>
      </Card>

      <Card style={styles.section} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Notifications</Text>
          <List.Item
            title="Push Notifications"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => <Switch value={notifications} onValueChange={setNotifications} />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.section} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Data</Text>
          <Button
            mode="outlined"
            icon="trash-can-outline"
            textColor="#ef4444"
            onPress={() => setShowClearDialog(true)}
            style={styles.dangerButton}
          >
            Clear All Data
          </Button>
        </Card.Content>
      </Card>

      <Button mode="contained" onPress={logout} buttonColor="#ef4444" style={styles.signOutButton}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },
  dangerButton: { borderColor: '#ef4444' },
  signOutButton: { marginTop: 8, marginBottom: 32 },
});
