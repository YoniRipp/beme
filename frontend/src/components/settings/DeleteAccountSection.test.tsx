import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DeleteAccountSection,
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
} from './DeleteAccountSection';

const mockDeleteAccount = vi.fn();
const mockLogout = vi.fn();

vi.mock('@/features/auth/api', () => ({
  authApi: { deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args) },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'someone@example.com' }, logout: mockLogout }),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/components/shared/ToastProvider', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

/** Opens the confirmation dialog and returns a configured user-event instance. */
async function openDialog() {
  const user = userEvent.setup();
  render(<DeleteAccountSection />);
  await user.click(screen.getByRole('button', { name: /delete my account/i }));
  return user;
}

describe('DeleteAccountSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteAccount.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
  });

  it('does not delete on the first click — the dialog has to be confirmed', async () => {
    await openDialog();

    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('warns that the action is irreversible', async () => {
    await openDialog();

    expect(screen.getByText(/cannot be undone, and your data cannot be recovered/i)).toBeInTheDocument();
  });

  it('names the account being deleted, so it is not deleted off the wrong session', async () => {
    await openDialog();

    expect(screen.getByText(/someone@example\.com/)).toBeInTheDocument();
  });

  // A click-through confirmation is the right weight for deleting one goal; it is not the
  // right weight for deleting the account.
  it('keeps the confirm button disabled until the phrase is typed', async () => {
    await openDialog();

    expect(screen.getByRole('button', { name: /delete permanently/i })).toBeDisabled();
  });

  it('calls the delete endpoint once the phrase is typed', async () => {
    const user = await openDialog();

    await user.type(
      screen.getByLabelText(`Type ${DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm`),
      DELETE_ACCOUNT_CONFIRMATION_PHRASE,
    );
    await user.click(screen.getByRole('button', { name: /delete permanently/i }));

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it('ignores a phrase that is not the exact word', async () => {
    const user = await openDialog();

    await user.type(
      screen.getByLabelText(`Type ${DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm`),
      'delet',
    );

    expect(screen.getByRole('button', { name: /delete permanently/i })).toBeDisabled();
  });

  // The server blocklists the token before answering, so the local session is already dead.
  // Leaving the user on a signed-in shell full of a deleted account's cached rows would be
  // both broken and its own small privacy failure.
  it('clears the local session after a successful deletion', async () => {
    const user = await openDialog();

    await user.type(
      screen.getByLabelText(`Type ${DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm`),
      DELETE_ACCOUNT_CONFIRMATION_PHRASE,
    );
    await user.click(screen.getByRole('button', { name: /delete permanently/i }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('keeps the user signed in and says so when the request fails', async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error('Network unreachable'));
    const user = await openDialog();

    await user.type(
      screen.getByLabelText(`Type ${DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm`),
      DELETE_ACCOUNT_CONFIRMATION_PHRASE,
    );
    await user.click(screen.getByRole('button', { name: /delete permanently/i }));

    expect(mockToastError).toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  // Dismissing and reopening must not inherit the phrase typed the first time, or the second
  // attempt is a single click.
  it('forgets the typed phrase when the dialog is dismissed', async () => {
    const user = await openDialog();

    await user.type(
      screen.getByLabelText(`Type ${DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm`),
      DELETE_ACCOUNT_CONFIRMATION_PHRASE,
    );
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    await user.click(screen.getByRole('button', { name: /delete my account/i }));

    expect(screen.getByRole('button', { name: /delete permanently/i })).toBeDisabled();
  });
});
