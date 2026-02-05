import { useState, useEffect, useRef, useCallback } from 'react';

const LOCATION_CACHE_KEY = 'user-geolocation-cache';
const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

interface CachedLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  enableCache?: boolean;
}

interface UseGeolocationResult {
  location: { lat: number; lng: number } | null;
  loading: boolean;
  error: GeolocationPositionError | null;
  retry: () => void;
}

function getCachedLocation(): { lat: number; lng: number } | null {
  try {
    const cached = sessionStorage.getItem(LOCATION_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as unknown;

    // Validate parsed data structure
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('lat' in parsed) ||
      !('lng' in parsed) ||
      !('timestamp' in parsed) ||
      typeof (parsed as CachedLocation).lat !== 'number' ||
      typeof (parsed as CachedLocation).lng !== 'number' ||
      typeof (parsed as CachedLocation).timestamp !== 'number'
    ) {
      sessionStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }

    const validParsed = parsed as CachedLocation;
    const age = Date.now() - validParsed.timestamp;

    if (age > CACHE_MAX_AGE_MS) {
      sessionStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }

    return { lat: validParsed.lat, lng: validParsed.lng };
  } catch {
    return null;
  }
}

function setCachedLocation(lat: number, lng: number): void {
  try {
    const cached: CachedLocation = { lat, lng, timestamp: Date.now() };
    sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Session storage may be unavailable (private browsing, etc.)
  }
}

/**
 * Hook for fetching user's geolocation with proper React StrictMode handling.
 *
 * Uses a request ID pattern instead of isMountedRef to handle the double-mount
 * behavior of StrictMode. Also caches location in sessionStorage for instant
 * subsequent loads.
 */
export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationResult {
  const {
    enableHighAccuracy = true,
    timeout = 5000,
    maximumAge = 0,
    enableCache = true,
  } = options;

  // Get cached location once during initialization
  const cachedLocation = enableCache ? getCachedLocation() : null;

  // Initialize with cached location if available
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    cachedLocation
  );
  // Don't show loading if we have a cached location to display
  const [loading, setLoading] = useState(!cachedLocation);
  const [error, setError] = useState<GeolocationPositionError | null>(null);

  // Track request ID to handle StrictMode double-mount
  // Only the latest request should update state
  const requestIdRef = useRef(0);

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('[useGeolocation] Geolocation API not available');
      setLoading(false);
      return;
    }

    // Increment request ID - stale requests will be ignored
    const currentRequestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Ignore if a newer request has been made (handles StrictMode double-mount)
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setLocation(newLocation);
        setLoading(false);

        if (enableCache) {
          setCachedLocation(newLocation.lat, newLocation.lng);
        }
      },
      (err) => {
        // Ignore if a newer request has been made
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        console.warn('[useGeolocation] Error:', {
          code: err.code,
          message: err.message,
        });

        setError(err);
        setLoading(false);
      },
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, timeout, maximumAge, enableCache]);

  // Fetch location on mount
  useEffect(() => {
    fetchLocation();

    // Cleanup: invalidate any pending requests when unmounting
    return () => {
      requestIdRef.current++;
    };
  }, [fetchLocation]);

  const retry = useCallback(() => {
    fetchLocation();
  }, [fetchLocation]);

  return { location, loading, error, retry };
}
