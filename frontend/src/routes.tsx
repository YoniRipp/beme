import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useSettings } from './hooks/useSettings';
import { useThemeEffect } from './hooks/useThemeEffect';
import { Base44Layout } from './components/layout/Base44Layout';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { LocalErrorBoundary } from './components/shared/LocalErrorBoundary';
import { AppProviders } from './Providers';

const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const Schedule = lazy(() => import('./pages/Schedule').then((m) => ({ default: m.Schedule })));
const Money = lazy(() => import('./pages/Money').then((m) => ({ default: m.Money })));
const Body = lazy(() => import('./pages/Body').then((m) => ({ default: m.Body })));
const Energy = lazy(() => import('./pages/Energy').then((m) => ({ default: m.Energy })));
const Groups = lazy(() => import('./pages/Groups').then((m) => ({ default: m.Groups })));
const GroupDetail = lazy(() => import('./pages/GroupDetail').then((m) => ({ default: m.GroupDetail })));
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Insights = lazy(() => import('./pages/Insights').then((m) => ({ default: m.Insights })));
const Goals = lazy(() => import('./pages/Goals').then((m) => ({ default: m.Goals })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then((m) => ({ default: m.Signup })));
const AuthCallback = lazy(() =>
  import('./pages/AuthCallback').then((m) => ({ default: m.AuthCallback }))
);
const InviteJoin = lazy(() =>
  import('./pages/InviteJoin').then((m) => ({ default: m.InviteJoin }))
);
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword }))
);
const Pricing = lazy(() =>
  import('./pages/Pricing').then((m) => ({ default: m.Pricing }))
);
const Landing = lazy(() =>
  import('./pages/Landing').then((m) => ({ default: m.Landing }))
);
const Privacy = lazy(() =>
  import('./pages/Privacy').then((m) => ({ default: m.Privacy }))
);
const Terms = lazy(() =>
  import('./pages/Terms').then((m) => ({ default: m.Terms }))
);
const NotFound = lazy(() =>
  import('./pages/NotFound').then((m) => ({ default: m.NotFound }))
);

function ProtectedRoutes() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <AppProviders>
      <ProtectedAppRoutes />
    </AppProviders>
  );
}

function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function ProtectedAppRoutes() {
  const { settings } = useSettings();
  useThemeEffect(settings.theme, settings.balanceDisplayColor);

  return (
    <Routes>
      <Route path="/" element={<Base44Layout />}>
        <Route
          index
          element={
            <Suspense fallback={<LoadingSpinner text="Loading dashboard..." />}>
              <Home />
            </Suspense>
          }
        />
        <Route
          path="schedule"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading schedule..." />}>
              <Schedule />
            </Suspense>
          }
        />
        <Route
          path="money"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading money page..." />}>
              <Money />
            </Suspense>
          }
        />
        <Route
          path="body"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading body page..." />}>
              <Body />
            </Suspense>
          }
        />
        <Route
          path="energy"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading energy page..." />}>
              <Energy />
            </Suspense>
          }
        />
        <Route
          path="groups"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading groups page..." />}>
              <Groups />
            </Suspense>
          }
        />
        <Route
          path="groups/:id"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading group..." />}>
              <GroupDetail />
            </Suspense>
          }
        />
        <Route
          path="insights"
          element={
            <LocalErrorBoundary label="Insights">
              <Suspense fallback={<LoadingSpinner text="Loading insights..." />}>
                <Insights />
              </Suspense>
            </LocalErrorBoundary>
          }
        />
        <Route
          path="goals"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading goals..." />}>
              <Goals />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading settings..." />}>
              <Settings />
            </Suspense>
          }
        />
        <Route
          path="admin"
          element={
            <AdminRouteGuard>
              <Suspense fallback={<LoadingSpinner text="Loading admin..." />}>
                <Admin />
              </Suspense>
            </AdminRouteGuard>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading..." />}>
              <NotFound />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}

export function AppRoutes() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading..." />}>
              <Login />
            </Suspense>
          }
        />
        <Route
          path="/signup"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading..." />}>
              <Signup />
            </Suspense>
          }
        />
        <Route
          path="/auth/callback"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading..." />}>
              <AuthCallback />
            </Suspense>
          }
        />
        <Route
          path="/invite/join"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading..." />}>
              <InviteJoin />
            </Suspense>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading..." />}>
              <ForgotPassword />
            </Suspense>
          }
        />
        <Route
          path="/pricing"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading..." />}>
              <Pricing />
            </Suspense>
          }
        />
        <Route
          path="/welcome"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading..." />}>
              <Landing />
            </Suspense>
          }
        />
        <Route
          path="/privacy"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading..." />}>
              <Privacy />
            </Suspense>
          }
        />
        <Route
          path="/terms"
          element={
            <Suspense fallback={<LoadingSpinner text="Loading..." />}>
              <Terms />
            </Suspense>
          }
        />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
