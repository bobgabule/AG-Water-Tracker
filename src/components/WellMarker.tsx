import { memo, useCallback } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { MapPinIcon } from '@heroicons/react/24/solid';
import type { WellWithReading } from '../hooks/useWells';

interface WellMarkerProps {
  well: WellWithReading;
  onClick?: (wellId: string) => void;
}

function timeAgo(dateString: string | null): string {
  if (!dateString) return 'No readings';
  const now = Date.now();
  const then = new Date(dateString).getTime();
  if (isNaN(then)) return 'No readings';
  const diffMs = now - then;
  if (diffMs < 0) return 'Just now';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Updated ${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Updated ${weeks} week${weeks > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Updated ${months} month${months > 1 ? 's' : ''} ago`;
  return `Updated ${Math.floor(days / 365)}y ago`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-status-ok';
    case 'inactive':
      return 'bg-accent';
    case 'needs_attention':
      return 'bg-status-warning';
    default:
      return 'bg-gray-400';
  }
}

export default memo(function WellMarker({ well, onClick }: WellMarkerProps) {
  const handleClick = useCallback(() => {
    onClick?.(well.id);
  }, [onClick, well.id]);

  if (!well.location) return null;

  return (
    <Marker
      latitude={well.location.latitude}
      longitude={well.location.longitude}
      anchor="bottom"
    >
      <button
        type="button"
        onClick={handleClick}
        className="flex flex-col items-center cursor-pointer group"
        aria-label={`Well: ${well.name}`}
      >
        <div
          className={`w-9 h-9 rounded-full ${getStatusColor(well.status)} flex items-center justify-center shadow-lg border-2 border-white group-hover:scale-110 transition-transform`}
        >
          <MapPinIcon className="w-5 h-5 text-white" />
        </div>
        <div className="mt-1 bg-black/70 rounded-lg px-2.5 py-1 text-center whitespace-nowrap backdrop-blur-sm">
          <p className="text-white text-xs font-semibold">{well.name}</p>
          <p className="text-white/70 text-[10px] leading-tight">{timeAgo(well.lastReadingDate)}</p>
        </div>
      </button>
    </Marker>
  );
});
