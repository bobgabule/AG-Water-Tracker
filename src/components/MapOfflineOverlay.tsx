import { memo } from 'react';
import { WifiIcon, ArrowPathIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../hooks/useTranslation';

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
  const { t } = useTranslation();

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
        <div className="bg-surface-modal/95 border border-white/10 rounded-lg p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <WifiIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                {isOnline ? t('map.tilesUnavailable') : t('map.youreOffline')}
              </p>
              <p className="text-sm text-white/60 mt-1">
                {wellCount > 0
                  ? t('map.wellLocationsVisible', { count: wellCount })
                  : t('map.connectToLoad')}
              </p>
              {isOnline && (
                <button
                  onClick={onRetry}
                  className="mt-3 flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition-colors"
                >
                  <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
                  {t('map.tryAgain')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend showing markers are still active */}
      {wellCount > 0 && (
        <div className="absolute bottom-24 left-4 pointer-events-auto">
          <div className="bg-surface-modal/90 rounded-lg px-3 py-2 flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 text-teal-500" aria-hidden="true" />
            <span className="text-xs text-white/70">{t('map.wellMarkersVisible')}</span>
          </div>
        </div>
      )}
    </div>
  );
});
