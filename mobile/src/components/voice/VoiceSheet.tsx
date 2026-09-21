import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Icon, Modal, Portal, Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui';
import { fonts, radius, spacing } from '../../theme';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { voiceApi, type VoiceUnderstandResponse } from '../../core/api/voice';
import {
  MIC_UNSUPPORTED,
  classifyMicFailure,
  classifyVoiceFailure,
  invalidationRootsFor,
  summariseVoiceOutcome,
  type VoiceFailure,
  type VoiceOutcome,
} from '../../lib/voiceCommandState';

/**
 * The voice capture sheet: hold a conversation with the device's own recognizer, then send
 * the TEXT — never the audio — to `POST /api/voice/understand`.
 *
 * **Audio never leaves the handset.** `useSpeechRecognition` wraps `SFSpeechRecognizer` on
 * iOS and `SpeechRecognizer` on Android (`mobile/CLAUDE.md`: "Speech is the platform
 * recognizer, not a server round-trip"). What crosses the network is the transcript the
 * recognizer produced, in a JSON body, and nothing else. The backend's `/api/voice/understand`
 * also accepts base64 audio — that is the WEB's path, where a browser has no on-device
 * recognizer — and `core/api/voice.ts` deliberately does not model it.
 *
 * **THIS FILE MAKES A DEV CLIENT MANDATORY, once something renders it.**
 * `expo-speech-recognition` resolves its native module at import time, so the first screen
 * that pulls this component into its module graph is the point at which `npm start` stops
 * working against Expo Go — exactly the rule in `mobile/CLAUDE.md`'s "Don't" section, and the
 * reason `useSpeechRecognition` has sat with zero importers since it was written. On this
 * branch nothing under `mobile/src` imports `VoiceSheet` yet, so Expo Go still opens the app;
 * the branch that adds the tab-bar button is where that changes, and whoever merges it owes
 * everyone a `eas build --profile development`.
 *
 * **Every send spends one of ten.** `requireAiQuota` debits before the handler runs, the
 * allowance is `AI_MONTHLY_LIMIT` (unset in production, default 10 per calendar month) and it
 * is shared with chat, insights and food lookup. Three rules follow, and they are the reason
 * this sheet is shaped the way it is rather than as a one-tap mic:
 *
 *   1. **Nothing sends on mount, or on a transcript arriving.** The user reads what was heard
 *      and presses Send. A recognizer that mis-hears is normal; a recognizer that mis-hears
 *      and immediately spends a tenth of the month is not.
 *   2. **Nothing retries itself.** Not on a 502, not on a timeout. The failed attempt was
 *      already charged, so an automatic retry doubles the bill to re-learn the same thing.
 *   3. **The cost is stated before the button, not after.** Same reading as the insights
 *      screen's "Uses one of your monthly AI calls" — a control that quietly spends a tenth of
 *      an allowance is not one a user can consent to.
 *
 * The component owns no visibility of its own: the parent renders it and passes `visible`, so
 * the tab bar (or anything else) can open it without this file knowing what a tab bar is.
 */

/**
 * The recognizer's locale, and the `lang` the parser is told about, from one constant.
 *
 * They have to agree. The server interpolates `lang` straight into the Gemini prompt
 * ("User transcript (lang: …)"), so a sheet that listened in one locale and declared another
 * is actively misinforming the parser. The prompt itself handles Hebrew and English
 * (`backend/src/services/voice.ts:VOICE_PROMPT`); wiring the recognizer to the user's own
 * locale is a follow-up that needs a settings key this client does not have yet, and guessing
 * one from the device would change which language the recognizer accepts without telling
 * anybody.
 */
const VOICE_LANG = 'en-US';

/** Matches the insights screen's wording, so the two AI surfaces price themselves the same way. */
const COST_NOTE = 'Uses one of your monthly AI calls.';

export function VoiceSheet({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const { colors } = useThemeContext();
  const queryClient = useQueryClient();
  const {
    isAvailable,
    isListening,
    transcript,
    error: micError,
    startListening,
    stopListening,
    cancelListening,
  } = useSpeechRecognition({ lang: VOICE_LANG, interimResults: true, continuous: false });

  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<VoiceOutcome | null>(null);
  const [sendFailure, setSendFailure] = useState<VoiceFailure | null>(null);
  /**
   * Whether a capture has begun since this opening of the sheet.
   *
   * Needed because `transcript` belongs to the hook and OUTLIVES the sheet: the hook is
   * mounted for as long as this component is, and it only clears the text at the start of the
   * next `startListening()`. Without this flag, closing the sheet after logging a meal and
   * reopening it lands straight in the review state, showing the previous sentence above a
   * live Send button — one tap from spending a call on a command the user did not just give.
   * The hook has no `reset`, and adding one would change a tested module for the sake of its
   * first caller, so the sheet tracks its own session instead.
   */
  const [captureStarted, setCaptureStarted] = useState(false);

  // Listening is also evidence of a capture: this sheet is the hook's only mount, so the
  // recognizer is only running because something here started it. Belt and braces with
  // `startOver`, which covers the frame before this effect has flushed.
  useEffect(() => {
    if (isListening) setCaptureStarted(true);
  }, [isListening]);

  const micFailure = classifyMicFailure(micError);
  const spoken = captureStarted || isListening ? transcript.trim() : '';

  /**
   * Closing the sheet has to release the microphone and forget everything about the attempt.
   *
   * The hook's own cleanup only fires on UNMOUNT, and this component is not unmounted when it
   * closes — the parent keeps rendering it with `visible={false}`. Without the abort the audio
   * session stays captured after the sheet is gone and the next `start()` fails with `busy`,
   * which is the failure the hook's unmount cleanup exists to prevent, one layer up.
   *
   * Forgetting matters for a different reason: reopening must not show last night's "Logged
   * weight: 72.5 kg" as though it had just happened, and must not re-offer last night's
   * sentence as something to send.
   */
  useEffect(() => {
    if (visible) return;
    if (isListening) cancelListening();
    setOutcome(null);
    setSendFailure(null);
    setCaptureStarted(false);
  }, [visible, isListening, cancelListening]);

  const startOver = useCallback(() => {
    setOutcome(null);
    setSendFailure(null);
    setCaptureStarted(true);
    void startListening();
  }, [startListening]);

  /**
   * The one place a call is spent. Only ever reached from a press.
   *
   * The empty guard is not defensive tidiness: an empty transcript is a 400 from the
   * controller, and `requireAiQuota` has already debited by the time that 400 is written. A
   * blank send therefore costs a real call to be told the obvious, so it is stopped here
   * rather than diagnosed there.
   */
  const send = useCallback(async () => {
    if (!spoken || sending) return;
    setSending(true);
    setSendFailure(null);
    setOutcome(null);
    try {
      const response: VoiceUnderstandResponse = await voiceApi.understand(spoken, { lang: VOICE_LANG });
      setOutcome(summariseVoiceOutcome(response));
      // The server wrote to the database directly (`services/voiceExecutor.ts`), so nothing
      // in this client's cache knows. Without this the logged meal is invisible on Home until
      // something else happens to refetch, and voice reads as silently broken.
      for (const root of invalidationRootsFor(response.results ?? [])) {
        queryClient.invalidateQueries({ queryKey: [root] });
      }
    } catch (error) {
      // No retry here, and none in React Query either — this is a plain call, not a
      // `useMutation`, precisely so no library default can decide to spend a second call.
      setSendFailure(classifyVoiceFailure(error));
    } finally {
      setSending(false);
    }
  }, [spoken, sending, queryClient]);

  const styles = useThemedStyles((colors) => ({
    wrapper: { justifyContent: 'flex-end' },
    /**
     * NOT `ui/Card`, and not a hand-rolled one either — a sheet and a card are different
     * primitives on the web too (`ui/sheet.tsx` beside `ui/card.tsx`). A card floats: four
     * corners, a border all round, a shadow. This is attached to the bottom edge of the
     * screen, so it has two corners, one rule along its top, and no elevation. Wrapping it in
     * `ui/Card` would round the two corners that are off-screen and draw a border under the
     * home indicator.
     */
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      borderTopWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    title: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontWeight: '700' },
    body: { gap: spacing.sm, minHeight: 96 },
    /** The heard text, held apart from the app's own copy so it reads as a quotation. */
    heard: {
      backgroundColor: colors.muted,
      borderRadius: radius.md,
      padding: spacing.md,
      color: colors.text,
    },
    hint: { color: colors.textMuted },
    cost: { color: colors.textMuted, fontFamily: fonts.medium, fontWeight: '500' },
    stateTitle: { color: colors.text, fontFamily: fonts.semibold, fontWeight: '600' },
    resultLine: { color: colors.textMuted },
    listening: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' },
  }));

  /**
   * Which of the eight states is on screen, in priority order.
   *
   * The order is the design. `sending` outranks the transcript so the text cannot be edited
   * out from under a request that has already been charged; `outcome` outranks the transcript
   * so a completed command does not still offer a Send that would spend a second call on the
   * same sentence; and `micFailure` outranks `idle` so a refusal is not re-offered as a mic
   * the user can tap forever.
   */
  const body = () => {
    if (!isAvailable) return <Blocked failure={MIC_UNSUPPORTED} styles={styles} />;

    if (sending) {
      return (
        <View style={styles.body} accessibilityLiveRegion="polite">
          <Text variant="bodyMedium" style={styles.heard}>{spoken}</Text>
          <View style={styles.listening}>
            <ActivityIndicator accessibilityLabel="Sending voice command" />
            <Text variant="bodyMedium" style={styles.hint}>Working out what to log…</Text>
          </View>
        </View>
      );
    }

    if (outcome) {
      return (
        <View style={styles.body} accessibilityLiveRegion="polite">
          <View style={styles.listening}>
            <Icon
              source={outcome.kind === 'applied' ? 'check-circle' : 'information'}
              size={20}
              color={outcome.kind === 'applied' ? colors.success : colors.textMuted}
            />
            <Text variant="titleSmall" style={styles.stateTitle}>{outcome.title}</Text>
          </View>
          {outcome.lines.map((line) => (
            <Text key={line} variant="bodySmall" style={styles.resultLine}>{line}</Text>
          ))}
        </View>
      );
    }

    if (sendFailure) {
      return (
        <View style={styles.body} accessibilityLiveRegion="polite">
          <Text variant="titleSmall" style={[styles.stateTitle, { color: colors.danger }]}>
            {sendFailure.title}
          </Text>
          <Text variant="bodySmall" style={styles.resultLine}>{sendFailure.detail}</Text>
          {spoken ? <Text variant="bodyMedium" style={styles.heard}>{spoken}</Text> : null}
        </View>
      );
    }

    if (micFailure) return <Blocked failure={micFailure} styles={styles} />;

    if (isListening) {
      return (
        <View style={styles.body} accessibilityLiveRegion="polite">
          <View style={styles.listening}>
            <ActivityIndicator accessibilityLabel="Listening" />
            <Text variant="titleSmall" style={styles.stateTitle}>Listening…</Text>
          </View>
          {/* The interim transcript, which is why `interimResults` is on: without it the sheet
              is a spinner, and the user cannot tell a recognizer that is mis-hearing from one
              that is not hearing at all until after they have paid to find out. */}
          <Text variant="bodyMedium" style={spoken ? styles.heard : styles.hint}>
            {spoken || 'Say something like "I ate 200 grams of rice" or "slept 7 hours".'}
          </Text>
        </View>
      );
    }

    if (spoken) {
      return (
        <View style={styles.body}>
          <Text variant="bodySmall" style={styles.hint}>Heard:</Text>
          <Text variant="bodyMedium" style={styles.heard}>{spoken}</Text>
          <Text variant="bodySmall" style={styles.cost}>{COST_NOTE}</Text>
        </View>
      );
    }

    return (
      <View style={styles.body}>
        <Text variant="bodyMedium" style={styles.hint}>
          Tap the microphone and say what you did. Nothing is sent until you press Send — the
          recognizer runs on this device and your audio never leaves it.
        </Text>
        <Text variant="bodySmall" style={styles.cost}>{COST_NOTE}</Text>
      </View>
    );
  };

  /**
   * The controls, chosen from the same state the body was.
   *
   * Every label is also its `accessibilityLabel`, which is not redundant on Paper's `Button`:
   * the visible label is a child `Text`, and naming the control explicitly is what lets a
   * screen reader — and a test — address it as one thing.
   */
  const actions = () => {
    if (!isAvailable) return <Button onPress={onDismiss} accessibilityLabel="Close">Close</Button>;

    if (sending) {
      // No cancel. Aborting the fetch would not abort the server, which has already been paid
      // and is still writing rows — so a Cancel button here would hide a result, not prevent
      // one. The sheet is also `dismissable={false}` for the same reason.
      return null;
    }

    if (outcome) {
      return (
        <>
          <Button onPress={startOver} accessibilityLabel="New command">New command</Button>
          <Button mode="contained" onPress={onDismiss} accessibilityLabel="Done">Done</Button>
        </>
      );
    }

    if (sendFailure) {
      return (
        <>
          <Button onPress={onDismiss} accessibilityLabel="Close">Close</Button>
          {/* Labelled with its price. `retryable` is false for quota, an unconfigured server
              and an expired session — three refusals that cannot change from in here, and
              where a Try again would spend another call to be refused identically. */}
          {sendFailure.retryable && (
            <Button mode="contained" onPress={send} accessibilityLabel="Send again">
              Send again (1 call)
            </Button>
          )}
        </>
      );
    }

    if (micFailure) {
      return (
        <>
          <Button onPress={onDismiss} accessibilityLabel="Close">Close</Button>
          {micFailure.canRetry && (
            <Button mode="contained" onPress={startOver} accessibilityLabel="Start listening">
              Try again
            </Button>
          )}
        </>
      );
    }

    if (isListening) {
      return (
        <>
          <Button onPress={cancelListening} accessibilityLabel="Cancel">Cancel</Button>
          <Button mode="contained" onPress={stopListening} accessibilityLabel="Stop listening">
            Done speaking
          </Button>
        </>
      );
    }

    if (spoken) {
      return (
        <>
          <Button onPress={startOver} accessibilityLabel="Record again">Record again</Button>
          <Button mode="contained" icon="send" onPress={send} accessibilityLabel="Send voice command">
            Send
          </Button>
        </>
      );
    }

    return (
      <Button mode="contained" icon="microphone" onPress={startOver} accessibilityLabel="Start listening">
        Start listening
      </Button>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        // A send in flight has already been charged and the server is still working; letting
        // a backdrop tap close the sheet would throw away the only report of what it did.
        dismissable={!sending}
        onDismiss={onDismiss}
        style={styles.wrapper}
        contentContainerStyle={styles.sheet}
      >
        <View style={styles.header}>
          <Icon source="microphone" size={20} color={colors.primary} />
          <Text variant="titleMedium" style={styles.title}>Voice command</Text>
        </View>
        {body()}
        <View style={styles.actions}>{actions()}</View>
      </Modal>
    </Portal>
  );
}

/**
 * The shape both "the device cannot" states share.
 *
 * Separate from a send failure on purpose: nothing has been spent, nothing is wrong with the
 * account, and the next step is on the device rather than on us. Rendering it in the same red
 * treatment as a server error would tell the user their data is at risk when their microphone
 * is merely off.
 */
function Blocked({
  failure,
  styles,
}: {
  failure: { title: string; detail: string };
  styles: { body: object; stateTitle: object; resultLine: object };
}) {
  return (
    <View style={styles.body} accessibilityLiveRegion="polite">
      <Text variant="titleSmall" style={styles.stateTitle}>{failure.title}</Text>
      <Text variant="bodySmall" style={styles.resultLine}>{failure.detail}</Text>
    </View>
  );
}
