import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../lib/AuthProvider';

interface RequireNotOnboardedProps {
  children?: React.ReactNode;
}

/**
 * Forward guard: redirects already-onboarded users away from /onboarding/* routes.
 * This is the inverse of RequireOnboarded — it prevents fully onboarded users
 * from re-entering the onboarding flow.
 *
 * Only redirects when BOTH hasProfile AND hasFarmMembership are true.
 * Does NOT redirect during loading/null states — lets RequireAuth handle those.
 */
export default function RequireNotOnboarded({ children }: RequireNotOnboardedProps) {
  const { onboardingStatus } = useAuth();

  // If fully onboarded (has profile AND farm membership), redirect to dashboard
  if (onboardingStatus?.hasProfile && onboardingStatus?.hasFarmMembership) {
    return <Navigate to="/" replace />;
  }

  // Not fully onboarded — allow access to onboarding routes
  return children ? <>{children}</> : <Outlet />;
}
