import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import RequireAuth from './components/RequireAuth';
import RequireOnboarded from './components/RequireOnboarded';
import RequireRole from './components/RequireRole';
import AppLayout from './components/AppLayout';
import PageLoader from './components/PageLoader';
import LazyErrorBoundary from './components/LazyErrorBoundary';

// Lazy-loaded page components — each becomes its own chunk
const PhonePage = lazy(() => import('./pages/auth/PhonePage'));
const VerifyPage = lazy(() => import('./pages/auth/VerifyPage'));
const NoSubscriptionPage = lazy(() => import('./pages/NoSubscriptionPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const WellDetailPage = lazy(() => import('./pages/WellDetailPage'));
const WellEditPage = lazy(() => import('./pages/WellEditPage'));
const WellAllocationsPage = lazy(() => import('./pages/WellAllocationsPage'));
const WellListPage = lazy(() => import('./pages/WellListPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const LanguagePage = lazy(() => import('./pages/LanguagePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));

/** Per-route Suspense + error boundary wrapper */
function LazyRoute({
  children,
  routePath,
  fullScreen = false,
}: {
  children: ReactNode;
  routePath: string;
  fullScreen?: boolean;
}) {
  return (
    <LazyErrorBoundary key={routePath}>
      <Suspense fallback={<PageLoader fullScreen={fullScreen} />}>
        {children}
      </Suspense>
    </LazyErrorBoundary>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Auth routes - redirect if already logged in (handled by PhonePage) */}
      <Route path="/auth/phone" element={
        <LazyRoute routePath="/auth/phone" fullScreen>
          <PhonePage />
        </LazyRoute>
      } />
      <Route path="/auth/verify" element={
        <LazyRoute routePath="/auth/verify" fullScreen>
          <VerifyPage />
        </LazyRoute>
      } />

      {/* Legacy redirect */}
      <Route path="/auth" element={<Navigate to="/auth/phone" replace />} />
      <Route path="/login" element={<Navigate to="/auth/phone" replace />} />

      {/* No subscription page - requires auth but no farm membership */}
      <Route element={<RequireAuth />}>
        <Route path="/no-subscription" element={
          <LazyRoute routePath="/no-subscription" fullScreen>
            <NoSubscriptionPage />
          </LazyRoute>
        } />
      </Route>

      {/* Protected app routes - require session + farm membership */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireOnboarded />}>
          {/* Wrap with layout that includes Header/SideMenu */}
          <Route element={<AppLayout />}>
            <Route path="/" element={
              <LazyRoute routePath="/">
                <DashboardPage />
              </LazyRoute>
            } />
            <Route path="/app/dashboard" element={
              <LazyRoute routePath="/app/dashboard">
                <DashboardPage />
              </LazyRoute>
            } />
            <Route path="/wells" element={
              <LazyRoute routePath="/wells">
                <WellListPage />
              </LazyRoute>
            } />
            <Route path="/reports" element={
              <LazyRoute routePath="/reports">
                <ReportsPage />
              </LazyRoute>
            } />
            <Route element={<RequireRole action="manage_farm" />}>
              <Route path="/subscription" element={
                <LazyRoute routePath="/subscription">
                  <SubscriptionPage />
                </LazyRoute>
              } />
            </Route>
            <Route element={<RequireRole action="manage_users" />}>
              <Route path="/users" element={
                <LazyRoute routePath="/users">
                  <UsersPage />
                </LazyRoute>
              } />
            </Route>
            <Route path="/language" element={
              <LazyRoute routePath="/language">
                <LanguagePage />
              </LazyRoute>
            } />
            <Route path="/settings" element={
              <LazyRoute routePath="/settings">
                <SettingsPage />
              </LazyRoute>
            } />
            <Route path="/wells/:id" element={
              <LazyRoute routePath="/wells/:id">
                <WellDetailPage />
              </LazyRoute>
            } />
            <Route element={<RequireRole action="edit_well" fallbackPath={(params) => `/wells/${params.id}`} />}>
              <Route path="/wells/:id/edit" element={
                <LazyRoute routePath="/wells/:id/edit">
                  <WellEditPage />
                </LazyRoute>
              } />
            </Route>
            <Route element={<RequireRole action="manage_allocations" fallbackPath={(params) => `/wells/${params.id}`} />}>
              <Route path="/wells/:id/allocations" element={
                <LazyRoute routePath="/wells/:id/allocations">
                  <WellAllocationsPage />
                </LazyRoute>
              } />
            </Route>
          </Route>
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
