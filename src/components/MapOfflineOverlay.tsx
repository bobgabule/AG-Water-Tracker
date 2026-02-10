import { memo } from 'react';
import { WifiIcon, ArrowPathIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface MapOfflineOverlayProps {
  isOnline: boolean;
  wellCount: number;
  onRetry: () => void;
}

/**
 * Overlay displayed when Mapbox tiles fail to load.
 * Shows offline/error message while keeping well markers visible underneath.
 */
export default memo(function MapOfflineOverlay({
  isOnline,
  wellCount,
  onRetry,
}: MapOfflineOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Semi-transparent background to indicate degraded state */}
      <div className="absolute inset-0 bg-gray-900/30" />

      {/* Info card */}
      <div
        className="absolute top-20 left-4 right-4 pointer-events-auto"
        role="alert"
        aria-live="polite"
      >
        <div className="bg-gray-800/95 border border-gray-700 rounded-lg p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <WifiIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                {isOnline ? 'Map tiles unavailable' : "You're offline"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {wellCount > 0
                  ? `${wellCount} well location${wellCount !== 1 ? 's' : ''} ${wellCount !== 1 ? 'are' : 'is'} still visible.`
                  : 'Connect to load the map.'}
              </p>
              {isOnline && (
                <button
                  onClick={onRetry}
                  className="mt-3 flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition-colors"
                  aria-label="Retry loading map tiles"
                >
                  <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
                  Try again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend showing markers are still active */}
      {wellCount > 0 && (
        <div className="absolute bottom-24 left-4 pointer-events-auto">
          <div className="bg-gray-800/90 rounded-lg px-3 py-2 flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 text-teal-500" aria-hidden="true" />
            <span className="text-xs text-gray-300">Well markers visible</span>
          </div>
        </div>
      )}
    </div>
  );
});
