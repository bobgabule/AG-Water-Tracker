import { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../lib/AuthProvider';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import OfflineMessage from './OfflineMessage';

interface RequireAuthProps {
  children?: React.ReactNode;
  fallbackPath?: string;
}

export default function RequireAuth({
  children,
  fallbackPath = '/auth/phone',
}: RequireAuthProps) {
  const { isAuthReady, session, sessionExpired, clearSessionExpired } = useAuth();
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  // Slow-load detection: show message after 5 seconds of waiting
  useEffect(() => {
    if (isAuthReady) return;

    const timer = setTimeout(() => setShowSlowMessage(true), 5000);
    return () => clearTimeout(timer);
  }, [isAuthReady]);

  // Still initializing auth state - show loader
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          {showSlowMessage && (
            <p className="text-gray-400 text-sm">Taking longer than usual...</p>
          )}
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    // Session expired (forced sign-out from revoked account)
    if (sessionExpired) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
          <div className="text-center px-6">
            <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">
              Session Expired
            </h1>
            <p className="text-gray-400 max-w-sm mb-6">
              Your session has expired. Please sign in again.
            </p>
            <button
              onClick={() => {
                clearSessionExpired();
                // Navigate is handled by the re-render after clearing expired state
              }}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium text-white transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      );
    }

    // Offline and not authenticated - can't do OTP
    if (!isOnline) {
      return <OfflineMessage />;
    }
    // Online - redirect to auth
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Authenticated - render children or outlet
  return children ? <>{children}</> : <Outlet />;
}
