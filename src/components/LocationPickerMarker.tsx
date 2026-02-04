import { memo } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { MapPinIcon } from '@heroicons/react/24/solid';

interface LocationPickerMarkerProps {
  latitude: number;
  longitude: number;
}

export default memo(function LocationPickerMarker({
  latitude,
  longitude,
}: LocationPickerMarkerProps) {
  return (
    <Marker latitude={latitude} longitude={longitude} anchor="bottom">
      <div className="flex flex-col items-center">
        {/* Pulsing circle effect */}
        <div className="absolute -top-1 w-12 h-12 rounded-full bg-blue-500/30 animate-ping" />
        <div className="absolute -top-1 w-12 h-12 rounded-full bg-blue-500/20" />
        {/* Blue pin marker */}
        <div className="relative w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shadow-lg border-2 border-white z-10">
          <MapPinIcon className="w-5 h-5 text-white" />
        </div>
      </div>
    </Marker>
  );
});
