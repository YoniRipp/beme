import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi, setToken } from '@/features/auth/api';

/**
 * Handles OAuth callback (e.g. Twitter redirect flow). Exchanges auth code for token
 * via secure POST, stores it, then closes popup (postMessage to opener) or navigates to /.
 */
export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const code = searchParams.get('code');

  useEffect(() => {
    const handleCallback = async () => {
      if (!code) {
        if (window.opener) {
          window.opener.postMessage({ type: 'auth', error: 'missing_code' }, window.location.origin);
          window.close();
        } else {
          navigate('/login', { replace: true });
        }
        return;
      }

      try {
        const res = await authApi.exchangeCode(code);
        // Keep the token the exchange just handed us. Dropping it meant this flow leaned
        // entirely on the cookie, so an OAuth sign-in didn't survive a cold start.
        if (res.token) setToken(res.token);
        if (window.opener) {
          window.opener.postMessage({ type: 'auth' }, window.location.origin);
          window.close();
        } else {
          navigate('/', { replace: true });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not complete sign-in. The link may have expired.';
        setError(message);
        if (window.opener) {
          window.opener.postMessage({ type: 'auth', error: message }, window.location.origin);
          window.close();
        } else {
          navigate('/login', { replace: true });
        }
      }
    };

    handleCallback();
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">
        {error ? `Error: ${error}` : 'Signing you in...'}
      </p>
    </div>
  );
}
