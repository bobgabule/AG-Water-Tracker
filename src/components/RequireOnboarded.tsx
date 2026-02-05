import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../lib/AuthProvider';

interface RequireOnboardedProps {
  children?: React.ReactNode;
}

export default function RequireOnboarded({ children }: RequireOnboardedProps) {
  const { onboardingStatus } = useAuth();
  const location = useLocation();

  // No onboarding status yet - wait (RequireAuth handles the auth check)
  if (!onboardingStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Checking account status...</p>
        </div>
      </div>
    );
  }

  // Profile not complete - redirect to profile creation
  if (!onboardingStatus.hasProfile) {
    return (
      <Navigate to="/onboarding/profile" state={{ from: location }} replace />
    );
  }

  // No farm membership - redirect to farm setup
  if (!onboardingStatus.hasFarmMembership) {
    return <Navigate to="/onboarding/farm" state={{ from: location }} replace />;
  }

  // Fully onboarded - render children or outlet
  return children ? <>{children}</> : <Outlet />;
}
