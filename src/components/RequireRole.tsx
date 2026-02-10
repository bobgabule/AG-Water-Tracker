import { Navigate, Outlet } from 'react-router';
import { useUserRole } from '../hooks/useUserRole';
import { hasPermission, type Action } from '../lib/permissions';

interface RequireRoleProps {
  action: Action;
  fallbackPath?: string;
  children?: React.ReactNode;
}

/**
 * Route guard that checks if the current user's role has permission
 * for the given action. Renders nothing while role is loading (null),
 * redirects to fallbackPath when unauthorized, and renders children
 * or Outlet when authorized.
 */
export default function RequireRole({
  action,
  fallbackPath = '/',
  children,
}: RequireRoleProps) {
  const role = useUserRole();

  // Role still loading from PowerSync - render nothing
  if (role === null) return null;

  // User does not have permission - redirect silently
  if (!hasPermission(role, action)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Authorized - render children or outlet
  return children ? <>{children}</> : <Outlet />;
}
