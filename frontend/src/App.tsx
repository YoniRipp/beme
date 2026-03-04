import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from 'next-themes';
import { Providers } from './Providers';
import { AppRoutes } from './routes';
import { InstallPrompt } from './components/pwa/InstallPrompt';

const googleClientId = (import.meta as { env?: { VITE_GOOGLE_CLIENT_ID?: string } }).env
  ?.VITE_GOOGLE_CLIENT_ID;

function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId || 'placeholder.apps.googleusercontent.com'}>
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
        <Providers>
          <AppRoutes />
          <InstallPrompt />
        </Providers>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
