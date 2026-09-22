import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Button } from '../../components/ui';
import { messageFor } from '../../lib/errorMessage';
import {
  WIZARD_SKIP_PAYLOAD,
  emptyWizardForm,
  wizardFinishPayload,
  type WizardFormValues,
} from '../../domain/profileForm';
import { useProfile } from '../../hooks/useProfile';
import { useSettings } from '../../hooks/useSettings';
import { spacing } from '../../theme';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { WelcomeStep } from './steps/WelcomeStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { BodyStatsStep } from './steps/BodyStatsStep';
import { ActivityStep } from './steps/ActivityStep';
import { CompleteStep } from './steps/CompleteStep';

/**
 * First run, mirroring `frontend/src/components/onboarding/SetupWizard.tsx`.
 *
 * Expo had no first-run flow of any kind, so a user who only ever used the phone had a
 * `user_profiles` row that was never created. What that cost is mostly the AI: with no row,
 * `backend/src/services/insights.ts:161` puts the literal string "User profile: Not set up
 * yet." into the model prompt and `chat.ts:206` does the same — so the coach that is this
 * product's differentiator was told, in as many words, that it knew nothing about the user.
 *
 * **No `onComplete` callback, unlike the web's.** The web's reloads the page
 * (`Home.tsx:150`). Here the gate in `RootNavigator` reads the same React Query cache this
 * screen writes: `updateProfile` seeds it with the server's response via `setQueryData`, and
 * that response carries both an `id` and `setupCompleted: true`, so the gate stops matching
 * and this screen unmounts on its own. One source of truth, no second signal to keep in
 * step with it.
 *
 * **Nothing is persisted to the device.** No "has onboarded" flag in AsyncStorage: the
 * server row is the only record, or a reinstall would re-run the wizard and a user who set
 * up in the browser would get it a second time.
 */

const STEPS = ['Welcome', 'Basic Info', 'Body Stats', 'Activity', 'Complete'] as const;

const LAST_STEP = STEPS.length - 1;

export function SetupWizardScreen() {
  const styles = useThemedStyles((colors) => ({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    segment: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.muted,
    },
    segmentDone: {
      backgroundColor: colors.primary,
    },
    counter: {
      color: colors.textMuted,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.md,
      paddingHorizontal: spacing.lg,
    },
  }));

  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { updateProfile, isUpdating } = useProfile();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardFormValues>(emptyWizardForm);

  const setField = <K extends keyof WizardFormValues>(
    key: K,
    value: WizardFormValues[K]
  ) => setForm((previous) => ({ ...previous, [key]: value }));

  const handleSkip = async () => {
    try {
      await updateProfile(WIZARD_SKIP_PAYLOAD);
    } catch (error) {
      Toast.show({ type: 'error', text1: messageFor(error, 'Something went wrong') });
    }
  };

  const handleFinish = async () => {
    try {
      await updateProfile(wizardFinishPayload(form, settings.units));
      Toast.show({ type: 'success', text1: 'Profile setup complete!' });
    } catch (error) {
      Toast.show({ type: 'error', text1: messageFor(error, 'Could not save profile') });
    }
  };

  const stepProps = { form, setField };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Five segments, filled up to the current step — `SetupWizard.tsx:76-83`. */}
      <View style={layout.progress}>
        {STEPS.map((name, index) => (
          <View
            key={name}
            style={[styles.segment, index <= step && styles.segmentDone]}
          />
        ))}
      </View>

      <ScrollView
        style={layout.scroll}
        contentContainerStyle={layout.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && <WelcomeStep />}
        {step === 1 && <BasicInfoStep {...stepProps} />}
        {step === 2 && <BodyStatsStep {...stepProps} />}
        {step === 3 && <ActivityStep {...stepProps} />}
        {step === 4 && <CompleteStep {...stepProps} />}
      </ScrollView>

      {/*
        Skip on the first step, Back on every later one, the counter in the middle, and
        Next / Get Started on the right (`SetupWizard.tsx:274-286`). Skip is offered once and
        then replaced rather than kept alongside Back: two ways out of the same corner would
        make the counter meaningless, and leaving a Skip on step four invites abandoning
        work already done.
      */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {step === 0 ? (
          <Button mode="text" onPress={handleSkip} disabled={isUpdating}>
            Skip
          </Button>
        ) : (
          <Button mode="text" onPress={() => setStep(step - 1)} disabled={isUpdating}>
            Back
          </Button>
        )}

        <Text variant="bodySmall" style={styles.counter}>
          {step + 1} of {STEPS.length}
        </Text>

        {step === LAST_STEP ? (
          <Button
            mode="contained"
            onPress={handleFinish}
            disabled={isUpdating}
            loading={isUpdating}
          >
            Get Started
          </Button>
        ) : (
          <Button mode="contained" onPress={() => setStep(step + 1)}>
            Next
          </Button>
        )}
      </View>
    </View>
  );
}

// No colour dependency — only styles that read `colors` have to live on `useThemedStyles`.
const layout = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
