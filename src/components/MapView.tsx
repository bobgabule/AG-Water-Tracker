import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import Map from 'react-map-gl/mapbox';
import type { MapRef, MapMouseEvent, ErrorEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ViewfinderCircleIcon } from '@heroicons/react/24/outline';
import { debugWarn } from '../lib/debugLog';
import { US_STATE_COORDINATES } from '../lib/usStateCoordinates';
import WellMarker from './WellMarker';
import LocationPickerMarker from './LocationPickerMarker';
import UserLocationCircle from './UserLocationCircle';
import LocationPermissionBanner from './LocationPermissionBanner';
import LocationSoftAskModal from './LocationSoftAskModal';
import MapOfflineOverlay from './MapOfflineOverlay';
import type { WellWithReading } from '../hooks/useWells';
import { useGeolocationPermission } from '../hooks/useGeolocationPermission';
import { useGeolocation } from '../hooks/useGeolocation';
import { useMapTileStatus } from '../hooks/useMapTileStatus';


interface MapViewProps {
  wells: WellWithReading[];
  farmState?: string | null;
  onWellClick?: (wellId: string) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  pickedLocation?: { latitude: number; longitude: number } | null;
  isPickingLocation?: boolean;
}

const WELL_ZOOM = 16;

function computeInitialViewState(
  wells: WellWithReading[],
  farmState: string | null,
) {
  const located = wells.filter((w) => w.location !== null);

  if (located.length === 1) {
    return {
      latitude: located[0].location!.latitude,
      longitude: located[0].location!.longitude,
      zoom: WELL_ZOOM,
    };
  }

  if (located.length > 1) {
    const lats = located.map((w) => w.location!.latitude);
    const lngs = located.map((w) => w.location!.longitude);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    return { latitude: centerLat, longitude: centerLng, zoom: WELL_ZOOM };
  }

  // No wells — center on farm's US state
  if (farmState) {
    const stateView = US_STATE_COORDINATES[farmState.toUpperCase()];
    if (stateView) {
      return stateView;
    }
  }

  // Fallback to central Kansas at state-level zoom
  return { latitude: 38.5, longitude: -98.5, zoom: 7 };
}

const BANNER_DISMISSED_KEY = 'location-banner-dismissed';

export default function MapView({
  wells,
  farmState,
  onWellClick,
  onMapClick,
  pickedLocation,
  isPickingLocation,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);

  // Fetch user's geolocation — no auto-request, triggered by FAB or permission state
  const { location: userLocation, requestLocation } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    enableCache: true,
    autoRequest: false,
  });

  // Track geolocation permission state
  const permission = useGeolocationPermission();
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    sessionStorage.getItem(BANNER_DISMISSED_KEY) === 'true'
  );

  // Track map tile loading status for offline handling
  const { isOnline, hasTileError, setTileError } = useMapTileStatus();

  const handleDismissBanner = useCallback(() => {
    setBannerDismissed(true);
    sessionStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  }, []);

  // Handle map tile loading errors
  const handleMapError = useCallback(
    (event: ErrorEvent) => {
      debugWarn('Map', 'Map error:', event.error);

      // Check if it's a tile/network related error
      const message = event.error?.message?.toLowerCase() || '';
      if (
        message.includes('tile') ||
        message.includes('fetch') ||
        message.includes('network') ||
        message.includes('failed to fetch')
      ) {
        setTileError(true);
      }
    },
    [setTileError]
  );

  // Retry loading map tiles
  const handleRetry = useCallback(() => {
    setTileError(false);
    // Trigger map to refetch tiles by forcing a resize
    mapRef.current?.resize();
  }, [setTileError]);

  // Auto-request location when permission is already granted (no browser dialog triggered)
  // Also handles the transition from prompt → granted after user approves via the modal
  useEffect(() => {
    if (permission === 'granted' && !userLocation) {
      requestLocation();
    }
  }, [permission, userLocation, requestLocation]);

  // Track if we've already flown to user location (to avoid flying on every re-render)
  const hasFlyToUserLocation = useRef(false);

  // Fly to user location when it becomes available after the map has rendered
  useEffect(() => {
    if (userLocation && mapRef.current && !hasFlyToUserLocation.current) {
      hasFlyToUserLocation.current = true;
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: WELL_ZOOM,
        duration: 1500,
      });
    }
  }, [userLocation]);

  // Jump to farm state center if it arrives after Map already mounted with fallback
  const hasJumpedToFarmState = useRef(false);
  useEffect(() => {
    if (
      farmState &&
      mapRef.current &&
      !hasJumpedToFarmState.current &&
      !userLocation &&
      wells.filter((w) => w.location !== null).length === 0
    ) {
      const stateView = US_STATE_COORDINATES[farmState.toUpperCase()];
      if (stateView) {
        hasJumpedToFarmState.current = true;
        mapRef.current.jumpTo({
          center: [stateView.longitude, stateView.latitude],
          zoom: stateView.zoom,
        });
      }
    }
  }, [farmState, wells, userLocation]);

  // Compute initial view from wells/farm state — user location handled via flyTo animation
  const initialViewState = useMemo(
    () => computeInitialViewState(wells, farmState ?? null),
    [wells, farmState],
  );

  // Location soft-ask modal state
  const [showLocationModal, setShowLocationModal] = useState(false);

  const handleLocationFabClick = useCallback(() => {
    if (permission === 'granted') {
      if (userLocation && mapRef.current) {
        // Already have location — re-center
        mapRef.current.flyTo({
          center: [userLocation.lng, userLocation.lat],
          zoom: WELL_ZOOM,
          duration: 1500,
        });
      } else {
        requestLocation();
      }
    } else {
      setShowLocationModal(true);
    }
  }, [permission, requestLocation, userLocation]);

  const handleLocationAllow = useCallback(() => {
    setShowLocationModal(false);
    requestLocation();
  }, [requestLocation]);

  const handleLocationModalClose = useCallback(() => {
    setShowLocationModal(false);
  }, []);

  // Handle map click for location picking
  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      if (isPickingLocation && onMapClick) {
        onMapClick(event.lngLat);
      }
    },
    [isPickingLocation, onMapClick]
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
        onError={handleMapError}
        onClick={handleMapClick}
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

      {/* Use My Location FAB — hidden during location picking */}
      {!isPickingLocation && (
        <button
          onClick={handleLocationFabClick}
          className="absolute bottom-20 right-4 z-10 w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center active:scale-95 transition"
          aria-label="Use my location"
        >
          <ViewfinderCircleIcon className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Location soft-ask modal */}
      <LocationSoftAskModal
        open={showLocationModal}
        onClose={handleLocationModalClose}
        onAllow={handleLocationAllow}
        mode={permission === 'denied' ? 'denied' : 'prompt'}
      />

      {/* Offline/error overlay */}
      {hasTileError && (
        <MapOfflineOverlay
          isOnline={isOnline}
          wellCount={wells.filter((w) => w.location).length}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
