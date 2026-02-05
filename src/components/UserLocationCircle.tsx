import { memo, useMemo } from 'react';
import { Source, Layer, Marker } from 'react-map-gl/mapbox';
import circle from '@turf/circle';

interface UserLocationCircleProps {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}

export default memo(function UserLocationCircle({
  latitude,
  longitude,
  radiusMeters = 10
}: UserLocationCircleProps) {
  const circleGeoJson = useMemo(() => {
    return circle([longitude, latitude], radiusMeters / 1000, {
      steps: 64,
      units: 'kilometers'
    });
  }, [latitude, longitude, radiusMeters]);

  return (
    <>
      {/* 10m radius circle */}
      <Source id="user-location-circle" type="geojson" data={circleGeoJson}>
        <Layer
          id="user-location-circle-fill"
          type="fill"
          paint={{
            'fill-color': '#3B82F6',
            'fill-opacity': 0.2
          }}
        />
        <Layer
          id="user-location-circle-stroke"
          type="line"
          paint={{
            'line-color': '#3B82F6',
            'line-width': 2,
            'line-opacity': 0.7
          }}
        />
      </Source>

      {/* Blue dot marker */}
      <Marker latitude={latitude} longitude={longitude} anchor="center">
        <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
      </Marker>
    </>
  );
});
