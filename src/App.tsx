import { Routes, Route, Navigate } from 'react-router';
import RequireAuth from './components/RequireAuth';
import RequireOnboarded from './components/RequireOnboarded';
import RequireRole from './components/RequireRole';
import RequireNotOnboarded from './components/RequireNotOnboarded';

// Auth pages
import PhonePage from './pages/auth/PhonePage';
import VerifyPage from './pages/auth/VerifyPage';

// Onboarding pages
import ProfilePage from './pages/onboarding/ProfilePage';
import CreateFarmPage from './pages/onboarding/CreateFarmPage';

// App pages
import AppLayout from './components/AppLayout';
import DashboardPage from './pages/DashboardPage';
import WellDetailPage from './pages/WellDetailPage';
import WellEditPage from './pages/WellEditPage';
import WellListPage from './pages/WellListPage';
import ReportsPage from './pages/ReportsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import LanguagePage from './pages/LanguagePage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';

export default function App() {
  return (
    <Routes>
      {/* Auth routes - redirect if already logged in (handled by PhonePage) */}
      <Route path="/auth/phone" element={<PhonePage />} />
      <Route path="/auth/verify" element={<VerifyPage />} />

      {/* Legacy redirects */}
      <Route path="/auth" element={<Navigate to="/auth/phone" replace />} />
      <Route path="/login" element={<Navigate to="/auth/phone" replace />} />
      <Route path="/register" element={<Navigate to="/auth/phone" replace />} />
      <Route path="/setup" element={<Navigate to="/auth/phone" replace />} />

      {/* Onboarding routes - require session only + not already onboarded */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireNotOnboarded />}>
          <Route path="/onboarding/profile" element={<ProfilePage />} />
          <Route path="/onboarding/farm" element={<Navigate to="/onboarding/farm/create" replace />} />
          <Route path="/onboarding/farm/create" element={<CreateFarmPage />} />
        </Route>
      </Route>

      {/* Protected app routes - require session + completed onboarding */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireOnboarded />}>
          {/* Wrap with layout that includes Header/SideMenu */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/app/dashboard" element={<DashboardPage />} />
            <Route path="/wells" element={<WellListPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route element={<RequireRole action="manage_farm" />}>
              <Route path="/subscription" element={<SubscriptionPage />} />
            </Route>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/language" element={<LanguagePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/wells/:id" element={<WellDetailPage />} />
            <Route path="/wells/:id/edit" element={<WellEditPage />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
