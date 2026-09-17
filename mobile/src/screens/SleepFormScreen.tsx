import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { Button } from '../components/ui';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEnergy } from '../hooks/useEnergy';
import { useThemedStyles } from '../theme/useThemedStyles';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';
import { messageFor } from '../lib/errorMessage';
import { DayPicker } from '../components/shared/DayPicker';

export function SleepFormScreen() {
  const styles = useThemedStyles((colors) => ({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background, padding: 16 },
    date: { color: colors.textMuted, marginBottom: 16 },
    input: { marginBottom: 16 },
    saveButton: { backgroundColor: colors.primary },
  }));
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const checkInId = route.params?.checkInId;
  const { getCheckInById, addCheckIn, updateCheckIn } = useEnergy();
  const existing = checkInId ? getCheckInById(checkInId) : undefined;

  const [date, setDate] = useState(existing?.date || new Date());
  // Captured once per mount rather than per render, so the row cannot shift under the user's
  // finger if a form is left open across midnight.
  const [today] = useState(() => new Date());
  const [hours, setHours] = useState(existing?.sleepHours?.toString() || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: existing ? 'Edit Sleep' : 'Log Sleep' });
  }, [existing, navigation]);

  const handleSave = async () => {
    const h = parseFloat(hours);
    if (!hours || isNaN(h) || h < 0 || h > 24) {
      Toast.show({ type: 'error', text1: 'Enter valid hours (0-24)' });
      return;
    }
    setSaving(true);
    try {
      // The date travels on both paths. `updateCheckIn` has always accepted one and this
      // screen never sent it, so an entry logged on the wrong day could not be moved.
      if (existing) {
        await updateCheckIn(existing.id, { sleepHours: h, date });
      } else {
        await addCheckIn({ date, sleepHours: h });
      }
      Toast.show({ type: 'success', text1: existing ? 'Sleep updated' : 'Sleep logged' });
      navigation.goBack();
    } catch (error) {
      Toast.show({ type: 'error', text1: messageFor(error, 'Failed to save') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <DayPicker value={date} onChange={setDate} today={today} />
        <Text variant="bodyMedium" style={styles.date}>
          {format(date, 'EEEE, MMMM d, yyyy')}
        </Text>
        <TextInput
          mode="outlined"
          label="Sleep hours"
          value={hours}
          onChangeText={setHours}
          keyboardType="numeric"
          placeholder="e.g. 7.5"
          right={<TextInput.Affix text="hrs" />}
          style={styles.input}
        />
        <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.saveButton}>
          {existing ? 'Update' : 'Log Sleep'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
