import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../lib/AuthContext';
import { PowerSyncProvider } from '../lib/PowerSyncContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function ProtectedRoute() {
  const { user, userProfile, loading, refreshProfile } = useAuth();
  const isOnline = useOnlineStatus();

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
    return <Navigate to="/auth" replace />;
  }

  if (!userProfile) {
    // If offline, profile fetch may have failed — don't redirect to register
    if (!isOnline) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center px-4">
            <p className="text-gray-600 font-medium">Unable to load your profile while offline.</p>
            <p className="text-gray-500 text-sm mt-2">Please connect to the internet to continue.</p>
            <button
              onClick={refreshProfile}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return <Navigate to="/auth" replace />;
  }

  if (!userProfile.farm_id) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <PowerSyncProvider>
      <Outlet />
    </PowerSyncProvider>
  );
}
