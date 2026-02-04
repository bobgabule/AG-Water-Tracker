import { useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../lib/AuthContext';
import { PowerSyncProvider } from '../lib/PowerSyncContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function ProtectedRoute() {
  const { user, userProfile, loading, profileFetchFailed, profileError, refreshProfile } = useAuth();
  const isOnline = useOnlineStatus();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await refreshProfile();
    } finally {
      setRetrying(false);
    }
  };

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

  // Profile fetch failed (existing user) or offline - show retry UI instead of redirecting
  // profileFetchFailed distinguishes between "fetch threw error" vs "profile doesn't exist (new user)"
  if (!userProfile && (profileFetchFailed || !isOnline)) {
    const message = !isOnline
      ? 'Unable to load your profile while offline.'
      : 'Unable to load your profile.';
    const subMessage = !isOnline
      ? 'Please connect to the internet to continue.'
      : profileError;

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center px-4">
          <p className="text-gray-600 font-medium">{message}</p>
          {subMessage && <p className="text-gray-500 text-sm mt-2">{subMessage}</p>}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {retrying ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Retrying...
              </span>
            ) : (
              'Retry'
            )}
          </button>
        </div>
      </div>
    );
  }

  // No profile and no error - legitimate new user, redirect to complete registration
  if (!userProfile) {
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
