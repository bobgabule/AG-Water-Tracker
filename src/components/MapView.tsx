import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import Map from 'react-map-gl/mapbox';
import type { MapRef, MapMouseEvent, MapTouchEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import WellMarker from './WellMarker';
import LocationPickerMarker from './LocationPickerMarker';
import UserLocationCircle from './UserLocationCircle';
import LocationPermissionBanner from './LocationPermissionBanner';
import type { WellWithReading } from '../hooks/useWells';
import { useGeolocationPermission } from '../hooks/useGeolocationPermission';
import { useGeolocation } from '../hooks/useGeolocation';


interface MapViewProps {
  wells: WellWithReading[];
  onWellClick?: (wellId: string) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onMapLongPress?: (lngLat: { lng: number; lat: number }) => void;
  pickedLocation?: { latitude: number; longitude: number } | null;
  isPickingLocation?: boolean;
}

const DEFAULT_ZOOM = 16;

function computeInitialViewState(wells: WellWithReading[]) {
  const located = wells.filter((w) => w.location !== null);

  if (located.length === 0) {
    return { latitude: 38.5, longitude: -98.5, zoom: DEFAULT_ZOOM };
  }

  if (located.length === 1) {
    return {
      latitude: located[0].location!.latitude,
      longitude: located[0].location!.longitude,
      zoom: DEFAULT_ZOOM,
    };
  }

  // Center on wells with fixed zoom
  const lats = located.map((w) => w.location!.latitude);
  const lngs = located.map((w) => w.location!.longitude);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

  return { latitude: centerLat, longitude: centerLng, zoom: DEFAULT_ZOOM };
}

const BANNER_DISMISSED_KEY = 'location-banner-dismissed';

const LONG_PRESS_DURATION = 500;
const LONG_PRESS_MOVE_THRESHOLD = 10; // pixels - cancel if user moves more than this

export default function MapView({
  wells,
  onWellClick,
  onMapClick,
  onMapLongPress,
  pickedLocation,
  isPickingLocation,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);

  // Long-press detection refs
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartPos = useRef<{ lng: number; lat: number } | null>(null);
  const pressStartScreenPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTimestampRef = useRef<number>(0);

  // Fetch user's geolocation with proper StrictMode handling
  const { location: userLocation, retry: retryGeolocation } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000, // Longer timeout to allow for permission prompt
    enableCache: true,
  });

  // Track geolocation permission state
  const permission = useGeolocationPermission();
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    sessionStorage.getItem(BANNER_DISMISSED_KEY) === 'true'
  );

  const handleDismissBanner = useCallback(() => {
    setBannerDismissed(true);
    sessionStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  }, []);

  // Re-fetch location when permission changes from 'prompt' to 'granted'
  // This handles the case where the initial request timed out while waiting for user
  const prevPermissionRef = useRef(permission);
  useEffect(() => {
    if (prevPermissionRef.current === 'prompt' && permission === 'granted' && !userLocation) {
      retryGeolocation();
    }
    prevPermissionRef.current = permission;
  }, [permission, userLocation, retryGeolocation]);

  // Track if we've already flown to user location (to avoid flying on every re-render)
  const hasFlyToUserLocation = useRef(false);

  // Fly to user location when it becomes available after the map has rendered
  useEffect(() => {
    if (userLocation && mapRef.current && !hasFlyToUserLocation.current) {
      hasFlyToUserLocation.current = true;
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: DEFAULT_ZOOM,
        duration: 1500,
      });
    }
  }, [userLocation]);

  // Cleanup long-press timer on unmount
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

  // Compute initial view - prioritize user location over wells/default
  // Note: initialViewState is only used on Map's first render (react-map-gl behavior)
  // Map maintains its own viewport state after mount, so wells updates won't re-center
  const initialViewState = useMemo(() => {
    if (userLocation) {
      return {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        zoom: DEFAULT_ZOOM,
      };
    }
    return computeInitialViewState(wells);
  }, [userLocation, wells]);

  // Handle map click for location picking
  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      // Don't trigger click if long-press was just triggered (within 100ms)
      if (Date.now() - longPressTimestampRef.current < 100) {
        return;
      }
      if (isPickingLocation && onMapClick) {
        onMapClick(event.lngLat);
      }
    },
    [isPickingLocation, onMapClick]
  );

  // Clear long-press timer helper
  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressStartPos.current = null;
    pressStartScreenPos.current = null;
  }, []);

  // Mouse long-press handlers
  const handleMouseDown = useCallback(
    (event: MapMouseEvent) => {
      if (!onMapLongPress) return;
      pressStartPos.current = event.lngLat;
      pressStartScreenPos.current = { x: event.point.x, y: event.point.y };
      pressTimerRef.current = setTimeout(() => {
        if (pressStartPos.current) {
          longPressTimestampRef.current = Date.now();
          onMapLongPress(pressStartPos.current);
          clearPressTimer();
        }
      }, LONG_PRESS_DURATION);
    },
    [onMapLongPress, clearPressTimer]
  );

  const handleMouseUp = useCallback(() => {
    clearPressTimer();
  }, [clearPressTimer]);

  const handleMouseMove = useCallback(
    (event: MapMouseEvent) => {
      // Only cancel if moved more than threshold (allows slight movement)
      if (!pressStartScreenPos.current) return;
      const dx = event.point.x - pressStartScreenPos.current.x;
      const dy = event.point.y - pressStartScreenPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > LONG_PRESS_MOVE_THRESHOLD) {
        clearPressTimer();
      }
    },
    [clearPressTimer]
  );

  // Touch long-press handlers (mobile)
  const handleTouchStart = useCallback(
    (event: MapTouchEvent) => {
      if (!onMapLongPress) return;
      // Ignore multi-touch (pinch-to-zoom)
      if (event.originalEvent.touches.length > 1) {
        clearPressTimer();
        return;
      }
      pressStartPos.current = event.lngLat;
      pressStartScreenPos.current = { x: event.point.x, y: event.point.y };
      pressTimerRef.current = setTimeout(() => {
        if (pressStartPos.current) {
          longPressTimestampRef.current = Date.now();
          onMapLongPress(pressStartPos.current);
          clearPressTimer();
        }
      }, LONG_PRESS_DURATION);
    },
    [onMapLongPress, clearPressTimer]
  );

  const handleTouchEnd = useCallback(() => {
    clearPressTimer();
  }, [clearPressTimer]);

  const handleTouchMove = useCallback(
    (event: MapTouchEvent) => {
      // Only cancel if moved more than threshold (allows slight movement)
      if (!pressStartScreenPos.current) return;
      const dx = event.point.x - pressStartScreenPos.current.x;
      const dy = event.point.y - pressStartScreenPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > LONG_PRESS_MOVE_THRESHOLD) {
        clearPressTimer();
      }
    },
    [clearPressTimer]
  );

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
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchCancel={handleTouchEnd}
      >
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

        {/* User location blue dot + 10m radius circle */}
        {userLocation && (
          <UserLocationCircle
            latitude={userLocation.lat}
            longitude={userLocation.lng}
            radiusMeters={10}
          />
        )}
      </Map>
    </div>
  );
}
