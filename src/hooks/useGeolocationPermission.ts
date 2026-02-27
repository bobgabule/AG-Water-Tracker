import { useState, useEffect, useRef } from 'react';

interface GeolocationPermissionResult {
  permission: PermissionState;
  isResolved: boolean;
}

/**
 * Hook to track geolocation permission state using the Permissions API.
 * Returns { permission, isResolved } where isResolved is true once the
 * async Permissions API query has completed.
 * Falls back to 'prompt' if Permissions API is not supported.
 */
export function useGeolocationPermission(): GeolocationPermissionResult {
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [isResolved, setIsResolved] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Permissions API not supported - fall back to prompt, mark as resolved
    if (!navigator.permissions) {
      setIsResolved(true);
      return;
    }

    let permissionStatus: PermissionStatus | null = null;

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (!isMountedRef.current) return;

        permissionStatus = status;
        setPermission(status.state);
        setIsResolved(true);

        // Listen for permission changes
        status.onchange = () => {
          if (isMountedRef.current) {
            setPermission(status.state);
          }
        };
      })
      .catch(() => {
        // Permissions API query failed - keep default 'prompt' state
        if (isMountedRef.current) {
          setIsResolved(true);
        }
      });

    // Cleanup listener on unmount
    return () => {
      isMountedRef.current = false;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  return { permission, isResolved };
}
