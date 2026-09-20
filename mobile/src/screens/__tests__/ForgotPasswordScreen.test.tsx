import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SettingsProvider } from '../../context/SettingsContext';
import { ThemeProvider } from '../../theme/ThemeContext';
import { authApi } from '../../core/api/auth';
import { ForgotPasswordScreen } from '../ForgotPasswordScreen';

jest.mock('../../core/api/auth', () => ({
  authApi: { forgotPassword: jest.fn() },
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
}));

const mockForgot = authApi.forgotPassword as jest.Mock;

jest.setTimeout(30_000);

// `render` resolves asynchronously in this setup, so every call site awaits it — the same
// note the other screen tests carry.
const renderScreen = () =>
  render(
    <SettingsProvider>
      <ThemeProvider>
        <ForgotPasswordScreen />
      </ThemeProvider>
    </SettingsProvider>
  );

beforeEach(() => {
  mockForgot.mockReset();
  mockGoBack.mockReset();
});

/**
 * The flow that had no route on this client at all: email+password is the only sign-in here
 * and the backend has no admin reset, so a forgotten password meant a permanently locked
 * account (`docs/HANDOFF.md`, owner item 1).
 *
 * The confirmation wording is the part worth pinning rather than the happy path. The endpoint
 * answers identically whether or not the address has an account, on purpose; a screen that
 * branched on the response — "no account found" — would hand an anonymous caller exactly the
 * account-enumeration oracle that wording exists to deny.
 */
describe('ForgotPasswordScreen', () => {
  it('asks the server for a reset link for the address typed', async () => {
    mockForgot.mockResolvedValue({ message: 'If an account exists, a reset link has been sent.' });
    const r = await renderScreen();

    // `findBy*`, not `getBy*`: the provider stack (settings, fonts, theme) resolves
    // asynchronously, so the tree is briefly empty and a synchronous query races it.
    fireEvent.changeText(await r.findByLabelText('Email'), '  yoni@example.com  ');
    fireEvent.press(await r.findByLabelText('Send reset link'));

    // Trimmed: a trailing space from an autocomplete or a paste must not become a different
    // address than the one the account was registered with.
    await waitFor(() => expect(mockForgot).toHaveBeenCalledWith('yoni@example.com'));
  });

  it('confirms without revealing whether the address has an account', async () => {
    mockForgot.mockResolvedValue({ message: 'If an account exists, a reset link has been sent.' });
    const r = await renderScreen();

    fireEvent.changeText(await r.findByLabelText('Email'), 'nobody@example.invalid');
    fireEvent.press(await r.findByLabelText('Send reset link'));

    expect(await r.findByText(/If an account exists/i)).toBeTruthy();
  });

  it('does not call the server without an address', async () => {
    const r = await renderScreen();

    fireEvent.press(await r.findByLabelText('Send reset link'));

    expect(await r.findByText(/Enter the email address/i)).toBeTruthy();
    expect(mockForgot).not.toHaveBeenCalled();
  });

  it('surfaces a failure instead of claiming the mail was sent', async () => {
    mockForgot.mockRejectedValue(new Error('Network request failed'));
    const r = await renderScreen();

    fireEvent.changeText(await r.findByLabelText('Email'), 'yoni@example.com');
    fireEvent.press(await r.findByLabelText('Send reset link'));

    expect(await r.findByText('Network request failed')).toBeTruthy();
    expect(r.queryByText(/If an account exists/i)).toBeNull();
  });
});
