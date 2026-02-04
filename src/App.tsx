import { Routes, Route, Navigate } from 'react-router';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import WellListPage from './pages/WellListPage';
import ReportsPage from './pages/ReportsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import LanguagePage from './pages/LanguagePage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/wells" element={<WellListPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/language" element={<LanguagePage />} />
      </Route>
      {/* Legacy redirects */}
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/register" element={<Navigate to="/auth" replace />} />
      <Route path="/setup" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}
