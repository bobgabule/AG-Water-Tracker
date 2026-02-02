import { useState, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router';
import { Bars3Icon } from '@heroicons/react/24/outline';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FarmSetupPage from './pages/FarmSetupPage';
import ProtectedRoute from './components/ProtectedRoute';
import AuthGuard from './components/AuthGuard';
import { useAuth } from './lib/AuthContext';

function DashboardPlaceholder() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-white p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">AG Water Tracker</h1>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 rounded hover:bg-white/20">
            <Bars3Icon className="h-7 w-7" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
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
      <Route path="/login" element={<AuthGuard guardType="guest"><LoginPage /></AuthGuard>} />
      <Route path="/register" element={<AuthGuard guardType="needsProfile"><RegisterPage /></AuthGuard>} />
      <Route path="/setup" element={<AuthGuard guardType="needsFarm"><FarmSetupPage /></AuthGuard>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPlaceholder />} />
      </Route>
    </Routes>
  );
}
