import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { Button } from '../components/ui';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEnergy } from '../hooks/useEnergy';
import { useThemedStyles } from '../theme/useThemedStyles';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';

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
      if (existing) {
        await updateCheckIn(existing.id, { sleepHours: h });
      } else {
        await addCheckIn({ date: new Date(), sleepHours: h });
      }
      Toast.show({ type: 'success', text1: existing ? 'Sleep updated' : 'Sleep logged' });
      navigation.goBack();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text variant="bodyMedium" style={styles.date}>
          {format(existing?.date || new Date(), 'EEEE, MMMM d, yyyy')}
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
