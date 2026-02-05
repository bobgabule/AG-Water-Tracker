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
  const isMountedRef = useRef(true);

  // Long-press detection refs
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartPos = useRef<{ lng: number; lat: number } | null>(null);
  const pressStartScreenPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTimestampRef = useRef<number>(0);

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

  // Cleanup long-press timer on unmount
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
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
