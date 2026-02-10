import { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
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
  const { isAuthReady, session } = useAuth();
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
