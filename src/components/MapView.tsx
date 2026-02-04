import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import Map, { NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import WellMarker from './WellMarker';
import LocationPickerMarker from './LocationPickerMarker';
import LocationPermissionBanner from './LocationPermissionBanner';
import type { WellWithReading } from '../hooks/useWells';
import { useGeolocationPermission } from '../hooks/useGeolocationPermission';

const USER_LOCATION_ZOOM = 18;

interface MapViewProps {
  wells: WellWithReading[];
  onWellClick?: (wellId: string) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  pickedLocation?: { latitude: number; longitude: number } | null;
  isPickingLocation?: boolean;
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

const BANNER_DISMISSED_KEY = 'location-banner-dismissed';

export default function MapView({
  wells,
  onWellClick,
  onMapClick,
  pickedLocation,
  isPickingLocation,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const isMountedRef = useRef(true);

  // State for user's geolocation (fetched before map renders)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Track geolocation permission state
  const permission = useGeolocationPermission();
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    sessionStorage.getItem(BANNER_DISMISSED_KEY) === 'true'
  );

  const handleDismissBanner = useCallback(() => {
    setBannerDismissed(true);
    sessionStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  }, []);

  // Track mounted state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Request geolocation on mount BEFORE rendering map
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (isMountedRef.current) {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationLoading(false);
        }
      },
      () => {
        // Permission denied or error - fall back to wells/default
        if (isMountedRef.current) {
          setLocationLoading(false);
        }
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  // Compute initial view once - prioritize user location over wells/default
  // Using a ref to capture wells at mount time to avoid re-centering on wells updates
  const wellsRef = useRef(wells);
  const initialViewState = useMemo(() => {
    if (userLocation) {
      return {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        zoom: USER_LOCATION_ZOOM,
      };
    }
    return computeInitialViewState(wellsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]); // Intentionally omit wells to prevent re-centering on well updates

  // Handle map click for location picking
  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      if (isPickingLocation && onMapClick) {
        onMapClick(event.lngLat);
      }
    },
    [isPickingLocation, onMapClick]
  );

  // Show loading indicator while getting user location
  if (locationLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-sm">Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      {/* Show banner when location permission is denied */}
      {permission === 'denied' && !bannerDismissed && (
        <LocationPermissionBanner onDismiss={handleDismissBanner} />
      )}
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        onClick={handleMapClick}
      >
        <NavigationControl position="top-right" style={{ marginTop: 80 }} />
        <GeolocateControl
          position="top-right"
          style={{ marginTop: 120 }}
          trackUserLocation={false}
          showUserLocation={true}
          showAccuracyCircle={true}
          positionOptions={{ enableHighAccuracy: true, timeout: 10000 }}
          fitBoundsOptions={{ maxZoom: USER_LOCATION_ZOOM }}
        />
        {wells
          .filter((w) => w.location)
          .map((well) => (
            <WellMarker key={well.id} well={well} onClick={onWellClick} />
          ))}
        {/* Location picker marker */}
        {pickedLocation && (
          <LocationPickerMarker
            latitude={pickedLocation.latitude}
            longitude={pickedLocation.longitude}
          />
        )}
      </Map>
    </div>
  );
}
