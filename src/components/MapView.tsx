import { useMemo } from 'react';
import Map, { NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import WellMarker from './WellMarker';
import type { WellWithReading } from '../hooks/useWells';

interface MapViewProps {
  wells: WellWithReading[];
  onWellClick?: (wellId: string) => void;
}

function computeInitialViewState(wells: WellWithReading[]) {
  const located = wells.filter((w) => w.location !== null);

  if (located.length === 0) {
    return { latitude: 38.5, longitude: -98.5, zoom: 4 };
  }

  if (located.length === 1) {
    return {
      latitude: located[0].location!.latitude,
      longitude: located[0].location!.longitude,
      zoom: 14,
    };
  }

  const lats = located.map((w) => w.location!.latitude);
  const lngs = located.map((w) => w.location!.longitude);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const spread = Math.max(
    Math.max(...lats) - Math.min(...lats),
    Math.max(...lngs) - Math.min(...lngs),
  );
  const zoom = spread < 0.01 ? 15 : spread < 0.1 ? 13 : spread < 1 ? 10 : 6;

  return { latitude: centerLat, longitude: centerLng, zoom };
}

export default function MapView({ wells, onWellClick }: MapViewProps) {
  const initialViewState = useMemo(() => computeInitialViewState(wells), [wells]);

  return (
    <div className="absolute inset-0">
      <Map
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" style={{ marginTop: 80 }} />
        {wells
          .filter((w) => w.location)
          .map((well) => (
            <WellMarker key={well.id} well={well} onClick={onWellClick} />
          ))}
      </Map>
    </div>
  );
}
