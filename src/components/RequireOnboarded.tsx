import { useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../lib/AuthProvider';

interface RequireOnboardedProps {
  children?: React.ReactNode;
}

export default function RequireOnboarded({ children }: RequireOnboardedProps) {
  const { authStatus, isFetchingAuth, session, refreshAuthStatus } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);

  // Auth status fetch still in-flight - show loading spinner (not error UI)
  if (!authStatus && session && isFetchingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        </div>
      </div>
    );
  }

  // Auth ready and fetch completed but RPC failed (null status with active session) - show retry UI
  if (!authStatus && session && !isFetchingAuth) {
    const handleRetry = async () => {
      setIsRetrying(true);
      try {
        await refreshAuthStatus();
      } finally {
        setIsRetrying(false);
      }
    };

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Something went wrong</p>
          <p className="text-gray-400 text-sm mb-6">
            We couldn't load your account info
          </p>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors"
          >
            {isRetrying ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Retrying...
              </span>
            ) : (
              'Tap to try again'
            )}
          </button>
        </div>
      </div>
    );
  }

  // No session at all - redirect to auth (shouldn't normally happen since RequireAuth catches this)
  if (!authStatus) {
    return <Navigate to="/auth/phone" replace />;
  }

  // No farm membership - redirect to no-subscription page
  if (!authStatus.hasFarmMembership) {
    return <Navigate to="/no-subscription" replace />;
  }

  // Authenticated with farm membership - render children or outlet
  return children ? <>{children}</> : <Outlet />;
}
