import { memo } from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface LocationPermissionBannerProps {
  onDismiss: () => void;
}

export default memo(function LocationPermissionBanner({ onDismiss }: LocationPermissionBannerProps) {
  return (
    <div className="absolute top-20 left-4 right-4 z-10 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">Location access needed</p>
          <p className="text-sm text-amber-700 mt-1">
            Enable location to center the map on your position and find nearby wells.
            Go to your browser settings to allow location access for this site.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded-md text-amber-500 hover:text-amber-700 hover:bg-amber-100 transition-colors"
          aria-label="Dismiss"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});
