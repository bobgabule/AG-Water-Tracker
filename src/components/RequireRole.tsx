import { Navigate, Outlet, useParams } from 'react-router';
import { useUserRole } from '../hooks/useUserRole';
import { hasPermission, type Action } from '../lib/permissions';

interface RequireRoleProps {
  action: Action;
  fallbackPath?: string | ((params: Record<string, string | undefined>) => string);
  children?: React.ReactNode;
}

/**
 * Route guard that checks if the current user's role has permission
 * for the given action. Renders nothing while role is loading (null),
 * redirects to fallbackPath when unauthorized, and renders children
 * or Outlet when authorized.
 *
 * fallbackPath can be a static string or a function that receives
 * route params (e.g. to redirect /wells/:id/edit back to /wells/:id).
 */
export default function RequireRole({
  action,
  fallbackPath = '/',
  children,
}: RequireRoleProps) {
  const role = useUserRole();
  const params = useParams();

  // Role still loading from PowerSync - render nothing
  if (role === null) return null;

  // User does not have permission - redirect silently
  if (!hasPermission(role, action)) {
    const resolvedPath = typeof fallbackPath === 'function' ? fallbackPath(params) : fallbackPath;
    return <Navigate to={resolvedPath} replace />;
  }

  // Authorized - render children or outlet
  return children ? <>{children}</> : <Outlet />;
}
