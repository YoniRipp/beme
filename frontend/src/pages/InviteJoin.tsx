import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { groupsApi } from '@/core/api/groups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface InvitationInfo {
  groupId: string;
  groupName: string;
  email: string;
}

export function InviteJoin() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const { user, authLoading, login, register } = useAuth();

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!token.trim()) {
      setInviteError('Invalid link');
      setInviteLoading(false);
      return;
    }
    groupsApi
      .getInvitationByToken(token)
      .then((data) => setInvitation(data))
      .catch((err) => setInviteError(err instanceof Error ? err.message : 'Invitation not found or expired'))
      .finally(() => setInviteLoading(false));
  }, [token]);

  useEffect(() => {
    if (!invitation || !user || authLoading) return;
    const userEmailNorm = (user.email || '').trim().toLowerCase();
    const invEmailNorm = (invitation.email || '').trim().toLowerCase();
    if (userEmailNorm !== invEmailNorm) return;

    setAcceptLoading(true);
    setAcceptError(null);
    groupsApi
      .acceptInviteByToken(token)
      .then(() => navigate(`/groups/${invitation.groupId}`, { replace: true }))
      .catch((err) => {
        setAcceptError(err instanceof Error ? err.message : 'Could not join group. Please try again.');
      })
      .finally(() => setAcceptLoading(false));
  }, [invitation, user, authLoading, token, navigate]);

  useEffect(() => {
    if (invitation) {
      setEmail(invitation.email);
    }
  }, [invitation]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setFormError('Password must contain at least one uppercase letter, one lowercase letter, and one digit');
      return;
    }
    setFormLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      // useEffect will run when user is set and call acceptInviteByToken + navigate
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await login(email.trim(), password);
      // useEffect will run when user is set and call acceptInviteByToken + navigate
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  if (inviteLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  if (inviteError || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid or expired link</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired. You can try logging in or ask for a new invite.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="default">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Go home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && (user.email || '').trim().toLowerCase() === (invitation.email || '').trim().toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            {acceptError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{acceptError}</p>
                <Button asChild variant="outline">
                  <Link to={`/groups/${invitation.groupId}`}>Open group</Link>
                </Button>
              </div>
            ) : acceptLoading ? (
              <LoadingSpinner text="Joining group..." />
            ) : (
              <LoadingSpinner text="Redirecting..." />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const invEmailNorm = (invitation.email || '').trim().toLowerCase();
  const showWrongUser =
    user && (user.email || '').trim().toLowerCase() !== invEmailNorm;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <img src="/logo.png" alt="BeMe" className="mx-auto max-w-[160px] w-auto h-16 rounded-full object-contain" />
          <CardTitle>Join {invitation.groupName}</CardTitle>
          <CardDescription>
            You're invited to join this group. Sign up or log in with <strong>{invitation.email}</strong> to join.
          </CardDescription>
          {showWrongUser && (
            <p className="text-sm text-muted-foreground">
              This invite was sent to {invitation.email}. Log out and sign in with that email, or use the form below.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 border-b">
            <Button
              type="button"
              variant={mode === 'signup' ? 'default' : 'ghost'}
              className="flex-1"
              onClick={() => setMode('signup')}
            >
              Sign up
            </Button>
            <Button
              type="button"
              variant={mode === 'login' ? 'default' : 'ghost'}
              className="flex-1"
              onClick={() => setMode('login')}
            >
              Log in
            </Button>
          </div>

          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}

          {mode === 'signup' ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  readOnly
                  className="bg-muted"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={formLoading}>
                {formLoading ? 'Signing up...' : 'Sign up and join'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={formLoading}>
                {formLoading ? 'Logging in...' : 'Log in and join'}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="underline hover:text-foreground">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
