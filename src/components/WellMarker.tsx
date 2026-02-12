import { memo, useCallback, useMemo } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { MapPinIcon } from '@heroicons/react/24/solid';
import type { WellWithReading } from '../hooks/useWells';

interface WellMarkerProps {
  well: WellWithReading;
  onClick?: (wellId: string) => void;
}

/**
 * Calculate status text based on createdAt and updatedAt timestamps.
 * - Same timestamps = "Newly added"
 * - Updated within 24h = "Updated Today"
 * - Updated 24-48h ago = "Updated Yesterday"
 * - Older = "Updated N days ago" or "Updated N weeks ago"
 */
function getStatusText(createdAt: string, updatedAt: string): string {
  // If createdAt and updatedAt are the same, it's a new well
  const createdTime = new Date(createdAt).getTime();
  const updatedTime = new Date(updatedAt).getTime();

  // Handle invalid dates
  if (isNaN(createdTime) || isNaN(updatedTime)) {
    return 'Newly added';
  }

  // If timestamps are equal (within 1 second tolerance), show "Newly added"
  if (Math.abs(updatedTime - createdTime) < 1000) {
    return 'Newly added';
  }

  const now = Date.now();
  const diffMs = now - updatedTime;

  // Future date edge case
  if (diffMs < 0) {
    return 'Updated Today';
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 24) {
    return 'Updated Today';
  }

  if (hours < 48) {
    return 'Updated Yesterday';
  }

  if (days < 7) {
    return `Updated ${days} days ago`;
  }

  const weeks = Math.floor(days / 7);
  return `Updated ${weeks} week${weeks > 1 ? 's' : ''} ago`;
}

export default memo(function WellMarker({ well, onClick }: WellMarkerProps) {
  const handleClick = useCallback(() => {
    onClick?.(well.id);
  }, [onClick, well.id]);

  // Future: calculate from used / allocated
  const allocationPercentage = 100;

  // Get status text based on timestamps
  const statusText = useMemo(() => {
    return getStatusText(well.createdAt, well.updatedAt);
  }, [well.createdAt, well.updatedAt]);

  if (!well.location) return null;

  return (
    <Marker
      latitude={well.location.latitude}
      longitude={well.location.longitude}
      anchor="bottom-left"
    >
      <button
        type="button"
        onClick={handleClick}
        className="flex items-end cursor-pointer group"
        aria-label={`Well: ${well.name}`}
      >
        {/* Map Pin - at exact coordinates */}
        <div className="group-hover:scale-110 transition-transform">
          <MapPinIcon className="w-8 h-10 text-teal-500 drop-shadow-lg" />
        </div>

        {/* Small gap */}
        <div className="w-0.5" />

        {/* Gauge + Info Overlay - connected as one unit */}
        <div className="flex items-stretch">
          {/* Water Gauge - cylinder/tube shape with grey border */}
          <div className="w-2.5 h-10 bg-gray-700 rounded-full overflow-hidden flex flex-col justify-end border border-white/50">
            <div
              className="w-full bg-blue-500 rounded-b-full transition-all duration-300"
              style={{ height: `${allocationPercentage}%` }}
            />
          </div>

          {/* Info Overlay - attached to gauge */}
          <div className="bg-gray-900/80 rounded-r-lg px-2.5 py-1 flex flex-col justify-center whitespace-nowrap backdrop-blur-sm shadow-lg">
            <p className="text-white text-xs font-bold leading-tight text-left">{well.name}</p>
            <p className="text-white/60 text-[10px] leading-tight text-left">{statusText}</p>
          </div>
        </div>
      </button>
    </Marker>
  );
});
