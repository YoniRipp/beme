import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/core/api/auth';

/**
 * The landing page for the link `POST /api/auth/forgot-password` mails out —
 * `${FRONTEND_ORIGIN}/reset-password?token=…&email=…` (backend/src/services/auth.ts).
 *
 * Until this page existed the mailed link fell through the route table's catch-all to the
 * auth guard, which dropped `token` and `email` and dumped the user on /login, so nobody
 * could finish a reset on any client.
 *
 * Never render, log or store the entered password, and never render the raw token.
 */

/**
 * The token is `crypto.randomBytes(32).toString('hex')`, so a live one is lower-case hex.
 * This only skips a round-trip that is certain to fail — for a link an email client wrapped
 * or truncated — and the server stays the authority on whether a well-formed token is live.
 */
const TOKEN_PATTERN = /^[a-f0-9]{32,}$/i;

/**
 * The same rule `authService.resetPassword` enforces (min 8, one upper, one lower, one
 * digit), phrased the way `Signup.tsx` already phrases it client-side. Checking here saves a
 * round-trip; the server re-checks because it must never trust a client.
 */
function validateNewPassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one digit';
  }
  return null;
}

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const linkIsUsable = TOKEN_PATTERN.test(token) && email.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const policyError = validateNewPassword(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, email, password });
      // `replace` so Back cannot return to a form holding a token the server just spent.
      navigate('/login', {
        replace: true,
        state: { notice: 'Your password has been updated. Sign in with your new password.' },
      });
    } catch (err) {
      // The server's wording, verbatim — 'Invalid or expired reset token' for a token that
      // has lapsed, been used or never existed, and the password-policy message otherwise.
      setError(
        err instanceof Error
          ? err.message
          : 'Could not reset your password. Request a new link and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!linkIsUsable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>This reset link is no longer valid</CardTitle>
            <CardDescription>
              Reset links expire an hour after they're sent and can only be used once. Request a
              new one and we'll email it to you.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4">
            <Button asChild className="w-full h-[50px] text-base font-extrabold">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>Setting a new password for {email}.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                className="h-[50px] px-4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
                minLength={8}
                className="h-[50px] px-4"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full h-[50px] text-base font-extrabold" disabled={loading}>
              {loading ? 'Updating password...' : 'Update password'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Link expired?{' '}
              <Link to="/forgot-password" className="text-primary underline-offset-4 hover:underline">
                Request a new one
              </Link>
            </p>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Back to sign in
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
