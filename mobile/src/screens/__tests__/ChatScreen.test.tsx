import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsProvider } from '../../context/SettingsContext';
import { ThemeProvider } from '../../theme/ThemeContext';
import { QUOTA_EXHAUSTED_MESSAGE } from '../../core/api/chat';
import { ChatScreen, CHAT_SUGGESTIONS, chatViewState } from '../ChatScreen';
import type { UseChatResult } from '../../hooks/useChat';

/**
 * Note `await render(...)` and `findBy*` throughout. RNTL 14 made `render` async — without
 * the await every query on the result comes back undefined, which surfaces as a confusing
 * "cannot read property of undefined" rather than a missing element. Same note as
 * `SettingsScreen.test.tsx` and `SettingsContext.test.tsx`.
 *
 * `useChat` is mocked rather than backed by a QueryClient, following
 * `WorkoutFormScreen.test.tsx`'s treatment of `useWorkouts`: the hook's own wiring is
 * covered by `chatViewState` and `invalidationsFor` as pure functions, and an unresolved
 * query left behind by a screen test hangs jest.
 */

const mockSendMessage = jest.fn();
const mockClearHistory = jest.fn();

let mockChatState: UseChatResult;

jest.mock('../../hooks/useChat', () => ({
  useChat: () => mockChatState,
}));

function chatResult(overrides: Partial<UseChatResult> = {}): UseChatResult {
  return {
    messages: [],
    historyLoading: false,
    pendingMessage: null,
    sending: false,
    clearing: false,
    quotaExhausted: false,
    historyUnavailable: false,
    chatError: null,
    sendMessage: mockSendMessage,
    clearHistory: mockClearHistory,
    ...overrides,
  };
}

// `ThemeProvider` resolves `PaperProvider` (and with it the Portal host `ConfirmDialog`
// needs) and requires `useSettings()` above it — the same stack `App.tsx` mounts.
const renderScreen = () =>
  render(
    <SettingsProvider>
      <ThemeProvider>
        <ChatScreen />
      </ThemeProvider>
    </SettingsProvider>,
  );

beforeEach(async () => {
  // `SettingsProvider` reads AsyncStorage on mount and renders nothing until it resolves.
  await AsyncStorage.clear();
  mockSendMessage.mockReset().mockResolvedValue(undefined);
  mockClearHistory.mockReset().mockResolvedValue(undefined);
  mockChatState = chatResult();
});

/**
 * The precedence, pinned without rendering. Each of the four branches exists because the
 * three-branch version of it was wrong in a way a user would see.
 */
describe('chatViewState', () => {
  const base = { historyLoading: false, historyUnavailable: false, messageCount: 0, pending: false };

  it('shows the spinner and nothing else while history is loading', () => {
    expect(chatViewState({ ...base, historyLoading: true })).toEqual({
      loading: true,
      quotaBlocked: false,
      empty: false,
      list: false,
    });
  });

  it('shows the first-run panel for an account with no conversation', () => {
    expect(chatViewState(base)).toMatchObject({ empty: true, list: false, quotaBlocked: false });
  });

  /**
   * Without the `pending` term the first message anyone ever sends swaps their own bubble
   * for the "Your AI Fitness Agent" panel: the list is genuinely still empty during the
   * round trip, because nothing is written client-side and nothing has been refetched.
   */
  it('shows the transcript, not the first-run panel, while the very first send is in flight', () => {
    expect(chatViewState({ ...base, pending: true })).toMatchObject({ empty: false, list: true });
  });

  /**
   * `GET /api/chat/history` is behind `requireAiAccess`, which spends nothing but still
   * refuses an exhausted account. The fetch fails, `messages` falls back to `[]`, and
   * without this branch a user with a full conversation on the server is shown a cheerful
   * first-run panel — a failed request rendered as an empty account, the same mistake
   * `GoalsScreen`'s view state was written to stop.
   */
  it('never mistakes a quota-refused history read for an empty account', () => {
    expect(chatViewState({ ...base, historyUnavailable: true })).toEqual({
      loading: false,
      quotaBlocked: true,
      empty: false,
      list: false,
    });
  });

  it('keeps loading ahead of the quota refusal, so the two panels never race', () => {
    expect(
      chatViewState({ ...base, historyLoading: true, historyUnavailable: true }),
    ).toMatchObject({ loading: true, quotaBlocked: false });
  });
});

describe('ChatScreen transcript', () => {
  it('tells the user it is fetching the conversation rather than showing an empty one', async () => {
    mockChatState = chatResult({ historyLoading: true });

    const r = await renderScreen();

    expect(await r.findByText('Loading conversation...')).toBeTruthy();
  });

  it('offers the web panel first-run copy and its three suggestions', async () => {
    const r = await renderScreen();

    expect(await r.findByText('Your AI Fitness Agent')).toBeTruthy();
    for (const suggestion of CHAT_SUGGESTIONS) {
      expect(await r.findByText(suggestion)).toBeTruthy();
    }
  });

  it('drops a tapped suggestion into the composer instead of sending it unread', async () => {
    const r = await renderScreen();

    fireEvent.press(await r.findByText(CHAT_SUGGESTIONS[0]));

    expect(await r.findByDisplayValue(CHAT_SUGGESTIONS[0])).toBeTruthy();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('renders both sides of a stored conversation', async () => {
    mockChatState = chatResult({
      messages: [
        { id: '1', role: 'user', content: 'how many workouts this week?', created_at: '2026-09-20T10:00:00Z' },
        { id: '2', role: 'assistant', content: 'Three so far — nice work.', created_at: '2026-09-20T10:00:04Z' },
      ],
    });

    const r = await renderScreen();

    expect(await r.findByText('how many workouts this week?')).toBeTruthy();
    expect(await r.findByText('Three so far — nice work.')).toBeTruthy();
  });

  it('shows the in-flight message and a waiting indicator while the turn is running', async () => {
    mockChatState = chatResult({ pendingMessage: 'log 3 eggs', sending: true });

    const r = await renderScreen();

    expect(await r.findByText('log 3 eggs')).toBeTruthy();
    expect(await r.findByLabelText('Waiting for a reply')).toBeTruthy();
  });
});

describe('ChatScreen composer', () => {
  it('sends the typed message and clears the box', async () => {
    const r = await renderScreen();

    fireEvent.changeText(await r.findByLabelText('Message'), 'am I hitting my protein goal?');
    fireEvent.press(await r.findByLabelText('Send message'));

    await waitFor(() => expect(mockSendMessage).toHaveBeenCalledWith('am I hitting my protein goal?'));
    expect((await r.findByLabelText('Message')).props.value).toBe('');
  });

  it('will not spend a call on whitespace', async () => {
    const r = await renderScreen();

    fireEvent.changeText(await r.findByLabelText('Message'), '   ');
    fireEvent.press(await r.findByLabelText('Send message'));

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  /**
   * `requireAiQuota` debits BEFORE the handler validates, so a 2001-character message is a
   * spent call that returns a 400. The field is capped at the controller's own limit so
   * that cannot happen.
   */
  it('caps the field where the controller caps the message', async () => {
    const r = await renderScreen();

    expect((await r.findByLabelText('Message')).props.maxLength).toBe(2000);
  });

  it('reports a failed send in the server\'s own words', async () => {
    mockChatState = chatResult({ chatError: 'AI chat not configured (missing GEMINI_API_KEY)' });

    const r = await renderScreen();

    expect(await r.findByText('AI chat not configured (missing GEMINI_API_KEY)')).toBeTruthy();
  });
});

/**
 * The allowance is 10 calls per calendar month in production (`AI_MONTHLY_LIMIT` is unset
 * and `backend/src/config/index.ts` defaults it to 10), shared across chat, voice,
 * insights and food lookup — so this is an ordinary state, not an edge case. The web has
 * no handling for it at all and shows "Failed to send message. Please try again", which
 * invites the user to spend another call proving it.
 */
describe('ChatScreen out of AI calls', () => {
  it('explains the refusal in words, never as the code the transport hands over', async () => {
    mockChatState = chatResult({ quotaExhausted: true, historyUnavailable: true });

    const r = await renderScreen();

    expect(await r.findByText(new RegExp(QUOTA_EXHAUSTED_MESSAGE.slice(0, 30)))).toBeTruthy();
    expect(r.queryByText(/free_quota_exhausted/)).toBeNull();
  });

  it('reassures the user the conversation still exists when the read is what was refused', async () => {
    mockChatState = chatResult({ quotaExhausted: true, historyUnavailable: true });

    const r = await renderScreen();

    expect(await r.findByText(/Your conversation is safe/)).toBeTruthy();
    // Not the first-run panel: this account has a conversation it simply cannot reach.
    expect(r.queryByText('Your AI Fitness Agent')).toBeNull();
  });

  it('locks the composer, so a tap cannot spend a call that is certain to be refused', async () => {
    mockChatState = chatResult({
      quotaExhausted: true,
      messages: [{ id: '1', role: 'user', content: 'hi', created_at: '2026-09-20T10:00:00Z' }],
    });

    const r = await renderScreen();

    fireEvent.changeText(await r.findByLabelText('Message'), 'one more question');
    fireEvent.press(await r.findByLabelText('Send message'));

    expect(mockSendMessage).not.toHaveBeenCalled();
    // The transcript survived — only the send was refused, so the messages still render.
    expect(await r.findByText('hi')).toBeTruthy();
  });
});

describe('ChatScreen clear history', () => {
  const withMessages = () =>
    chatResult({
      messages: [{ id: '1', role: 'user', content: 'hi', created_at: '2026-09-20T10:00:00Z' }],
    });

  it('offers no clear control for a conversation that does not exist yet', async () => {
    const r = await renderScreen();

    expect(r.queryByLabelText('Clear chat history')).toBeNull();
  });

  /** Destructive and irreversible — it drops the rolling summary too — so it asks first. */
  it('asks before deleting, and deletes nothing until confirmed', async () => {
    mockChatState = withMessages();

    const r = await renderScreen();
    fireEvent.press(await r.findByLabelText('Clear chat history'));

    expect(await r.findByText('Clear chat history?')).toBeTruthy();
    expect(mockClearHistory).not.toHaveBeenCalled();

    fireEvent.press(await r.findByText('Clear'));

    await waitFor(() => expect(mockClearHistory).toHaveBeenCalled());
  });

  it('leaves the conversation alone when the dialog is dismissed', async () => {
    mockChatState = withMessages();

    const r = await renderScreen();
    fireEvent.press(await r.findByLabelText('Clear chat history'));
    fireEvent.press(await r.findByText('Cancel'));

    expect(mockClearHistory).not.toHaveBeenCalled();
  });
});
