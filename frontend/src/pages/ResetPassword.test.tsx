import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ResetPassword } from './ResetPassword';
import { ApiError } from '@/core/api/client';

const { resetPasswordMock } = vi.hoisted(() => ({ resetPasswordMock: vi.fn() }));

vi.mock('@/core/api/auth', () => ({
  authApi: { resetPassword: resetPasswordMock },
}));

/** 64 lower-case hex chars — the shape of `crypto.randomBytes(32).toString('hex')`. */
const TOKEN = 'a1b2c3d4'.repeat(8);
const EMAIL = 'runner@example.com';

/** Stands in for the Login page so the test can assert what /reset-password hands it. */
function LoginStub() {
  const { notice } = (useLocation().state as { notice?: string } | null) ?? {};
  return <div>{notice ? <p role="status">{notice}</p> : 'sign in'}</div>;
}

function renderResetPassword(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/reset-password${search}`]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<LoginStub />} />
        <Route path="/forgot-password" element={<div>request a link</div>} />
      </Routes>
    </MemoryRouter>
  );
}

const validLink = `?token=${TOKEN}&email=${encodeURIComponent(EMAIL)}`;

async function fillAndSubmit(password: string, confirmation = password) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('New password'), password);
  await user.type(screen.getByLabelText('Confirm new password'), confirmation);
  await user.click(screen.getByRole('button', { name: /update password/i }));
}

describe('ResetPassword page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPasswordMock.mockResolvedValue({ message: 'Password has been reset successfully' });
  });

  it('posts the token, email and new password, then sends the user to sign in', async () => {
    renderResetPassword(validLink);

    await fillAndSubmit('NewPassw0rd');

    await waitFor(() =>
      expect(resetPasswordMock).toHaveBeenCalledWith({
        token: TOKEN,
        email: EMAIL,
        password: 'NewPassw0rd',
      })
    );
    expect(resetPasswordMock).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(/your password has been updated\. sign in with your new password\./i)
    ).toBeInTheDocument();
  });

  // The whole bug: the mailed link used to land on /login with the params stripped. A page
  // reached without a token must say so instead of rendering a form that cannot work.
  it('shows the invalid-link state and no form when the token is missing', () => {
    renderResetPassword(`?email=${encodeURIComponent(EMAIL)}`);

    expect(
      screen.getByRole('heading', { name: /this reset link is no longer valid/i })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a new link/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it('treats a truncated token as an invalid link rather than calling the API', () => {
    renderResetPassword(`?token=not-a-real-token&email=${encodeURIComponent(EMAIL)}`);

    expect(
      screen.getByRole('heading', { name: /this reset link is no longer valid/i })
    ).toBeInTheDocument();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  // An expired or already-used token is a 400 from the server, not a client-side condition,
  // so the only honest thing to show is what the server said.
  it('surfaces the server message verbatim when the token is rejected', async () => {
    resetPasswordMock.mockRejectedValue(new ApiError('Invalid or expired reset token', 400));

    renderResetPassword(validLink);
    await fillAndSubmit('NewPassw0rd');

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid or expired reset token');
    // Still on the page, still editable — a rejected token must not strand the user.
    expect(screen.getByLabelText('New password')).toBeEnabled();
    expect(screen.getByRole('button', { name: /update password/i })).toBeEnabled();
    expect(screen.getByRole('link', { name: /request a new one/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
  });

  it('rejects a password that fails the server policy before making a request', async () => {
    renderResetPassword(validLink);

    await fillAndSubmit('alllowercase1');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Password must contain at least one uppercase letter, one lowercase letter, and one digit'
    );
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it('requires the confirmation to match before making a request', async () => {
    renderResetPassword(validLink);

    await fillAndSubmit('NewPassw0rd', 'NewPassw0rd!');

    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match');
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });
});
