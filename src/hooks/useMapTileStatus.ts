import { useState, useEffect, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';

const AUTO_CLEAR_DELAY_MS = 2000;

interface MapTileStatus {
  isOnline: boolean;
  hasTileError: boolean;
  setTileError: (hasError: boolean) => void;
}

/**
 * Hook to track map tile loading status.
 * Combines network online status with tile-specific error state.
 *
 * - hasTileError is true when device is offline OR tile loading failed
 * - Error auto-clears after delay when coming back online
 * - Use setTileError in Map's onError callback
 */
export function useMapTileStatus(): MapTileStatus {
  const isOnline = useOnlineStatus();
  const [hasTileError, setHasTileError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-clear tile error when coming back online
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // When online and had a tile error, schedule auto-clear
    if (isOnline && hasTileError) {
      timeoutRef.current = setTimeout(() => {
        setHasTileError(false);
        timeoutRef.current = null;
      }, AUTO_CLEAR_DELAY_MS);
    }

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isOnline, hasTileError]);

  return {
    isOnline,
    // Show error overlay when offline OR when tile loading failed
    hasTileError: !isOnline || hasTileError,
    setTileError: setHasTileError,
  };
}
