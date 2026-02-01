import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../lib/AuthContext';
import { PowerSyncProvider } from '../lib/PowerSyncContext';

export default function ProtectedRoute() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!userProfile) {
    return <Navigate to="/register" replace />;
  }

  if (!userProfile.organization_id) {
    return <Navigate to="/setup" replace />;
  }

  return (
    <PowerSyncProvider>
      <Outlet />
    </PowerSyncProvider>
  );
}
