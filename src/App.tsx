import { Routes, Route } from 'react-router';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FarmSetupPage from './pages/FarmSetupPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import AuthGuard from './components/AuthGuard';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthGuard guardType="guest"><LoginPage /></AuthGuard>} />
      <Route path="/register" element={<AuthGuard guardType="needsProfile"><RegisterPage /></AuthGuard>} />
      <Route path="/setup" element={<AuthGuard guardType="needsFarm"><FarmSetupPage /></AuthGuard>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}
