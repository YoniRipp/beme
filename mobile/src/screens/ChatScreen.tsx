import React, { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ActivityIndicator, Icon, Text, TextInput, TouchableRipple } from 'react-native-paper';
import { withAlpha } from '@trackvibe/shared/tokens';
import { IconButton } from '../components/ui';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { EmptyState } from '../components/shared/EmptyState';
import { ErrorNotice } from '../components/shared/ErrorNotice';
import { LoadingView } from '../components/shared/LoadingView';
import { useChat } from '../hooks/useChat';
import {
  MAX_CHAT_MESSAGE_LENGTH,
  QUOTA_EXHAUSTED_MESSAGE,
  type ApiChatMessage,
} from '../core/api/chat';
import { fonts, radius, spacing } from '../theme';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useThemeContext } from '../theme/ThemeContext';

/**
 * The AI coach, as a screen.
 *
 * The web reaches this from a Sparkles button pinned to every page
 * (`frontend/src/components/layout/Base44Layout.tsx`), which opens `AiChatPanel` as a
 * bottom sheet. A sheet over a tab bar is not the native idiom and there is nowhere global
 * to pin a FAB here, so the same always-reachable entry point becomes a tab; the contents
 * are the web panel's, part for part — its loading line, its first-run copy and its three
 * suggestions, its bubbles, its composer, its clear-history control.
 *
 * ONE DELIBERATE DIVERGENCE, and it is the quota. `AI_MONTHLY_LIMIT` is unset in
 * production and defaults to 10 calls per calendar month across chat, voice, insights and
 * food lookup (`backend/src/config/index.ts`), so running out is the ordinary case, not
 * the edge. The web has no handling for it at all — `grep -rn free_quota_exhausted
 * frontend/src` is empty — so an exhausted web user is told "Failed to send message.
 * Please try again", which is both wrong and an invitation to spend a call proving it.
 * Here it is its own panel, the composer locks, and nothing retries.
 *
 * WHAT IS DELIBERATELY MISSING, both from the same cause. The web's composer has a mic,
 * and `useSpeechRecognition` is sitting unused in `src/hooks/`, which makes wiring it look
 * free. It is not: `expo-speech-recognition` resolves its native module at import time, so
 * the first screen that imports that hook makes a dev client mandatory for every developer
 * and breaks `npm start` against Expo Go (`mobile/CLAUDE.md`, "Don't"). Adding the first
 * AI screen and retiring Expo Go are two decisions, and this PR is only one of them.
 * Streaming is absent for an unrelated transport reason — see `core/api/chat.ts`.
 */

/** The three examples the web's first-run panel offers, verbatim, in its order. */
export const CHAT_SUGGESTIONS = [
  'Log 3 eggs and toast for breakfast',
  'What did I eat yesterday?',
  'Am I hitting my protein goal?',
] as const;

/** What the screen should draw, given the state of its chat hook. */
export interface ChatViewState {
  /** The full-screen spinner. Nothing else in the transcript area renders while this is true. */
  loading: boolean;
  /** The allowance is spent and it is what stopped the transcript loading. */
  quotaBlocked: boolean;
  /** The first-run panel. Never true at the same time as `list`. */
  empty: boolean;
  /** The transcript — real messages, the optimistic one, or both. */
  list: boolean;
}

/**
 * Precedence: the history spinner wins; a quota refusal on the READ means there is no
 * transcript to draw at all, so it outranks both remaining states; an account with no
 * messages and nothing in flight gets the first-run panel; everything else is the
 * transcript.
 *
 * Two of those four terms are the ones worth stating.
 *
 * `pending`, because without it the very first message a user ever sends replaces their
 * own optimistic bubble with the "Your AI Fitness Agent" panel for the length of the round
 * trip — the list is still empty at that moment, since the send has not returned and
 * nothing has been refetched.
 *
 * `quotaBlocked`, because `GET /api/chat/history` is behind `requireAiAccess` and that
 * guard still refuses an exhausted account even though the read spends nothing. The fetch
 * fails, `messages` falls back to `[]`, and without this branch the screen would show a
 * cheerful first-run panel to a user who has a full conversation on the server and cannot
 * reach it — the same "a failed request is not an empty account" mistake `GoalsScreen`'s
 * view state was written to stop.
 *
 * Exported as a pure function, following `GoalsScreen`'s `goalsViewState`, so the
 * precedence can be pinned without a QueryClient (an unresolved query left in a test hangs
 * jest — see `hooks/useWorkouts.ts`'s note).
 */
export function chatViewState({
  historyLoading,
  historyUnavailable,
  messageCount,
  pending,
}: {
  historyLoading: boolean;
  historyUnavailable: boolean;
  messageCount: number;
  pending: boolean;
}): ChatViewState {
  if (historyLoading) return { loading: true, quotaBlocked: false, empty: false, list: false };
  if (historyUnavailable) return { loading: false, quotaBlocked: true, empty: false, list: false };
  if (messageCount === 0 && !pending) {
    return { loading: false, quotaBlocked: false, empty: true, list: false };
  }
  return { loading: false, quotaBlocked: false, empty: false, list: true };
}

export function ChatScreen() {
  const {
    messages,
    historyLoading,
    pendingMessage,
    sending,
    clearing,
    quotaExhausted,
    historyUnavailable,
    chatError,
    sendMessage,
    clearHistory,
  } = useChat();
  const [input, setInput] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { colors } = useThemeContext();
  const styles = useChatStyles();

  const view = chatViewState({
    historyLoading,
    historyUnavailable,
    messageCount: messages.length,
    pending: pendingMessage != null,
  });

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    // Cleared before the await, as the web does: the composer belongs to the next message
    // the moment this one is on its way, and a send that fails is reported in words rather
    // than by silently restoring the box.
    setInput('');
    await sendMessage(trimmed);
  }, [input, sending, sendMessage]);

  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {messages.length > 0 && (
          <View style={styles.toolbar}>
            <IconButton
              icon="trash-can-outline"
              iconColor={colors.danger}
              disabled={clearing}
              onPress={() => setConfirmingClear(true)}
              accessibilityLabel="Clear chat history"
            />
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.transcript}
          keyboardShouldPersistTaps="handled"
          // The web scrolls an anchor div into view on every new message; this is the same
          // behaviour without an anchor, and it also fires as a bubble grows during layout.
          onContentSizeChange={scrollToEnd}
        >
          {view.loading && <LoadingView message="Loading conversation..." />}

          {view.quotaBlocked && (
            <EmptyState
              icon="timer-sand-empty"
              title="You're out of AI calls this month"
              subtitle={`${QUOTA_EXHAUSTED_MESSAGE} Your conversation is safe — it comes back when the allowance resets at the start of next month.`}
            />
          )}

          {view.empty && (
            <View style={styles.emptyPanel}>
              <EmptyState
                icon="message-text-outline"
                title="Your AI Fitness Agent"
                subtitle="I can coach you, answer questions about your data, AND take actions — log food, workouts, sleep, and manage goals, all through chat."
              />
              {/* Not part of `EmptyState`: it has no slot for them, and these are the point
                  of this particular panel — a first-run user who does not know the agent
                  can take actions will not discover it from prose. */}
              <View style={styles.suggestions}>
                {CHAT_SUGGESTIONS.map((suggestion) => (
                  <TouchableRipple
                    key={suggestion}
                    style={styles.suggestion}
                    onPress={() => setInput(suggestion)}
                    accessibilityRole="button"
                    accessibilityLabel={suggestion}
                  >
                    <Text variant="bodySmall" style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableRipple>
                ))}
              </View>
            </View>
          )}

          {view.list && (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {pendingMessage != null && (
                <>
                  <MessageBubble
                    message={{
                      id: 'pending-user',
                      role: 'user',
                      content: pendingMessage,
                      created_at: new Date().toISOString(),
                    }}
                  />
                  <View style={styles.row}>
                    <CoachAvatar />
                    <View style={[styles.bubble, styles.bubbleAssistant]}>
                      <ActivityIndicator size="small" accessibilityLabel="Waiting for a reply" />
                    </View>
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* Below the transcript rather than inside it: a send that failed left no bubble to
            attach the message to, and the user's eyes are already at the composer. */}
        {chatError != null && (
          <View style={styles.composerNotice}>
            <ErrorNotice message={chatError} />
          </View>
        )}

        {/* The refusal that arrived from a SEND rather than the history read. The transcript
            is intact behind it, so this is a line above the composer instead of the panel. */}
        {quotaExhausted && !view.quotaBlocked && (
          <View style={styles.composerNotice}>
            <Text variant="bodySmall" style={styles.quotaNotice} accessibilityRole="alert">
              {QUOTA_EXHAUSTED_MESSAGE}
            </Text>
          </View>
        )}

        <View style={styles.composer}>
          <TextInput
            mode="outlined"
            style={styles.input}
            placeholder="Ask your coach..."
            accessibilityLabel="Message"
            value={input}
            onChangeText={setInput}
            multiline
            // The controller rejects a longer message with a 400 — but `requireAiQuota` runs
            // first, so that 400 costs a call. Capping the field is what stops a user paying
            // 1/10 of their month to be told they typed too much.
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
            disabled={sending || quotaExhausted}
          />
          <IconButton
            icon="send"
            mode="contained"
            disabled={!input.trim() || sending || quotaExhausted}
            onPress={handleSend}
            accessibilityLabel="Send message"
          />
        </View>
      </View>

      {/* The web asks with `window.confirm`; this client's equivalent is `ConfirmDialog`,
          which every other destructive action here already goes through. */}
      <ConfirmDialog
        visible={confirmingClear}
        onDismiss={() => setConfirmingClear(false)}
        title="Clear chat history?"
        message="This deletes the whole conversation, including what the coach remembers of it. It cannot be undone."
        confirmLabel="Clear"
        destructive
        onConfirm={() => { void clearHistory(); }}
      />
    </KeyboardAvoidingView>
  );
}

/**
 * One sheet for the screen and its two local components, so the bubble does not rebuild a
 * second copy of the palette on every message. Split out of `ChatScreen` only so
 * `MessageBubble` and `CoachAvatar` can call it too.
 */
function useChatStyles() {
  return useThemedStyles((colors) => ({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },
    // Right-aligned on its own row rather than in the navigation header: the tab's header
    // is configured in `MainTabs`, and other work is in flight in that file.
    toolbar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.sm },
    transcript: { padding: spacing.lg, gap: spacing.md },
    emptyPanel: { paddingVertical: spacing.xxl, gap: spacing.md },
    suggestions: { gap: spacing.sm, alignSelf: 'center' },
    // No `backgroundColor` on purpose — the web's suggestion buttons are a bare bordered
    // row over the panel, and a surface fill here would make each one read as a card.
    suggestion: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    suggestionText: { color: colors.textMuted },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    rowUser: { flexDirection: 'row-reverse' },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      // `bg-primary/10` on the web. Computed rather than written as a constant because
      // `primary` is the user's accent choice, resolved at runtime (see `tokens/alpha.ts`).
      backgroundColor: withAlpha(colors.primary, 0.1),
    },
    bubble: {
      maxWidth: '85%',
      borderRadius: radius.xxl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    bubbleUser: { backgroundColor: colors.primary },
    bubbleAssistant: { backgroundColor: colors.muted },
    bubbleTextUser: { color: colors.primaryForeground },
    bubbleTextAssistant: { color: colors.text },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    input: { flex: 1, backgroundColor: colors.background },
    composerNotice: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
    quotaNotice: { color: colors.textMuted, fontFamily: fonts.medium, fontWeight: '500' },
  }));
}

/** The coach's glyph, matching the web's `MessageCircle` in a `bg-primary/10` disc. */
function CoachAvatar() {
  const styles = useChatStyles();
  const { colors } = useThemeContext();

  return (
    <View style={styles.avatar}>
      <Icon source="message-text" size={14} color={colors.primary} />
    </View>
  );
}

function MessageBubble({ message }: { message: ApiChatMessage }) {
  const styles = useChatStyles();
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && <CoachAvatar />}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text
          variant="bodyMedium"
          style={isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}
