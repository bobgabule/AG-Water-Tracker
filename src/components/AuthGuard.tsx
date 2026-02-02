import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../lib/AuthContext';

type GuardType = 'guest' | 'needsProfile' | 'needsFarm';

interface AuthGuardProps {
  guardType: GuardType;
  children: ReactNode;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" />
    </div>
  );
}

export default function AuthGuard({ guardType, children }: AuthGuardProps) {
  const { user, userProfile, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  function getAuthenticatedRedirect(): string {
    if (!userProfile) return '/register';
    if (!userProfile.farm_id) return '/setup';
    return '/';
  }

  switch (guardType) {
    case 'guest':
      // For /login — redirect away if already authenticated
      if (user) return <Navigate to={getAuthenticatedRedirect()} replace />;
      return <>{children}</>;

    case 'needsProfile':
      // For /register — must have user, must NOT have profile yet
      if (!user) return <Navigate to="/login" replace />;
      if (userProfile) return <Navigate to={userProfile.farm_id ? '/' : '/setup'} replace />;
      return <>{children}</>;

    case 'needsFarm':
      // For /setup — must have user + profile, must NOT have farm_id
      if (!user) return <Navigate to="/login" replace />;
      if (!userProfile) return <Navigate to="/register" replace />;
      if (userProfile.farm_id) return <Navigate to="/" replace />;
      return <>{children}</>;
  }
}
