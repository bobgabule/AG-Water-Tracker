import { useState, useEffect, useRef } from 'react';

/**
 * Hook to track geolocation permission state using the Permissions API.
 * Returns 'prompt' | 'granted' | 'denied'
 * Falls back to 'prompt' if Permissions API is not supported.
 */
export function useGeolocationPermission(): PermissionState {
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Permissions API not supported - fall back to prompt
    if (!navigator.permissions) {
      return;
    }

    let permissionStatus: PermissionStatus | null = null;

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (!isMountedRef.current) return;

        permissionStatus = status;
        setPermission(status.state);

        // Listen for permission changes
        status.onchange = () => {
          if (isMountedRef.current) {
            setPermission(status.state);
          }
        };
      })
      .catch(() => {
        // Permissions API query failed - keep default 'prompt' state
      });

    // Cleanup listener on unmount
    return () => {
      isMountedRef.current = false;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  return permission;
}
