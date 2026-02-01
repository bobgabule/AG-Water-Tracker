import { Routes, Route } from 'react-router';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FarmSetupPage from './pages/FarmSetupPage';
import ProtectedRoute from './components/ProtectedRoute';

function DashboardPlaceholder() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white p-4">
        <h1 className="text-2xl font-bold">AG Water Tracker</h1>
      </header>
      <main className="p-4">
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600">Dashboard coming soon. Authentication is working.</p>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/setup" element={<FarmSetupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPlaceholder />} />
      </Route>
    </Routes>
  );
}
