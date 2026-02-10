import type { OnboardingStatus } from './AuthProvider';

/**
 * Determines the next route based on onboarding status.
 *
 * This function centralizes the routing logic for the authentication
 * and onboarding flow. It returns the appropriate route based on
 * how far the user has progressed through onboarding.
 *
 * Route priority (in order):
 * 1. No status / not authenticated -> /auth/phone
 * 2. No profile created yet -> /onboarding/profile
 * 3. No farm membership yet -> /onboarding/farm/create
 * 4. Fully onboarded -> /app/dashboard
 *
 * @param status - The user's current onboarding status, or null if not authenticated
 * @returns The route path the user should be redirected to
 */
export function resolveNextRoute(status: OnboardingStatus | null): string {
  // No status means user is not authenticated or status couldn't be fetched
  if (!status) {
    return '/auth/phone';
  }

  // User hasn't created their profile yet
  if (!status.hasProfile) {
    return '/onboarding/profile';
  }

  // User has profile but isn't associated with a farm yet
  if (!status.hasFarmMembership) {
    return '/onboarding/farm/create';
  }

  // User is fully onboarded - send to main app
  return '/app/dashboard';
}

/**
 * Checks if a user has completed all onboarding steps.
 *
 * @param status - The user's current onboarding status
 * @returns true if the user has a profile and farm membership
 */
export function isOnboardingComplete(status: OnboardingStatus | null): boolean {
  if (!status) return false;
  return status.hasProfile && status.hasFarmMembership;
}

/**
 * Checks if a route is an onboarding route.
 *
 * @param pathname - The current route pathname
 * @returns true if the route is part of the onboarding flow
 */
export function isOnboardingRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/onboarding/') || pathname.startsWith('/auth/')
  );
}

/**
 * Checks if a route is a protected app route (requires full onboarding).
 *
 * @param pathname - The current route pathname
 * @returns true if the route requires the user to be fully onboarded
 */
export function isProtectedAppRoute(pathname: string): boolean {
  return pathname.startsWith('/app/');
}
