import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import Map from 'react-map-gl/mapbox';
import type { MapRef, MapMouseEvent, ErrorEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { debugWarn } from '../lib/debugLog';
import { US_STATE_COORDINATES } from '../lib/usStateCoordinates';
import WellMarker from './WellMarker';
import LocationPickerMarker from './LocationPickerMarker';
import UserLocationCircle from './UserLocationCircle';
import MapOfflineOverlay from './MapOfflineOverlay';
import type { WellWithReading } from '../hooks/useWells';
import { useCurrentAllocations } from '../hooks/useCurrentAllocations';
import { useWellSimilarFlags } from '../hooks/useWellFlags';
import { getWellFlagColor } from '../lib/wellFlags';
import { useMapTileStatus } from '../hooks/useMapTileStatus';


interface MapViewProps {
  wells: WellWithReading[];
  farmState?: string | null;
  farmId?: string | null;
  onWellClick?: (wellId: string) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  pickedLocation?: { latitude: number; longitude: number } | null;
  isPickingLocation?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  /** Super admins see farm wells/state on load — not their GPS position */
  isSuperAdmin?: boolean;
}

const WELL_ZOOM = 16;

function computeInitialViewState(farmState: string | null) {
  if (farmState) {
    const stateView = US_STATE_COORDINATES[farmState.toUpperCase()];
    if (stateView) return stateView;
  }
  // Fallback to central Kansas at state-level zoom
  return { latitude: 38.5, longitude: -98.5, zoom: 7 };
}

export default function MapView({
  wells,
  farmState,
  farmId,
  onWellClick,
  onMapClick,
  pickedLocation,
  isPickingLocation,
  userLocation,
  isSuperAdmin,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const { allocationsByWellId } = useCurrentAllocations(farmId ?? null);
  const similarWellIds = useWellSimilarFlags(farmId ?? null);

  // Track when the Mapbox GL map is fully loaded and ready for jumpTo/flyTo
  const [mapLoaded, setMapLoaded] = useState(false);
  const handleMapLoad = useCallback(() => setMapLoaded(true), []);

  // Track map tile loading status for offline handling
  const { isOnline, hasTileError, setTileError } = useMapTileStatus();

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

  // Track which location we last flew to (avoids re-flying on re-render,
  // but allows flying to a genuinely new position, e.g. fresh GPS after cache).
  const lastFlyLocation = useRef<string | null>(
    !isSuperAdmin && userLocation ? `${userLocation.lat},${userLocation.lng}` : null
  );

  // Reset fly tracking when location is lost (permission revoked, etc.)
  // so re-enabling location will fly to the user again.
  useEffect(() => {
    if (!userLocation) lastFlyLocation.current = null;
  }, [userLocation]);

  // Fly to user location when it becomes available (or changes) after the map is loaded.
  // Super admins skip — they always see farm wells/state, not their GPS.
  useEffect(() => {
    if (isSuperAdmin || !userLocation || !mapLoaded || !mapRef.current) return;
    const key = `${userLocation.lat},${userLocation.lng}`;
    if (lastFlyLocation.current === key) return;
    lastFlyLocation.current = key;
    mapRef.current.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: WELL_ZOOM,
      duration: 1500,
    });
  }, [isSuperAdmin, userLocation, mapLoaded]);

  // Jump to farm state center if it arrives after Map already mounted with fallback
  const hasJumpedToFarmState = useRef(false);
  useEffect(() => {
    if (
      farmState &&
      mapLoaded &&
      mapRef.current &&
      !hasJumpedToFarmState.current &&
      !lastFlyLocation.current
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
  }, [farmState, farmId, mapLoaded]);

  // Reposition map when super_admin switches farms.
  // Uses stale-data detection to wait for fresh wells before fitting bounds.
  const prevFarmIdRef = useRef(farmId);
  // Start true for super_admin so initial load also fits to wells
  const needsWellFitRef = useRef(!!isSuperAdmin);
  const staleWellIdsRef = useRef('');
  const prevRenderedWellIdsRef = useRef('');

  // Detect farm switch during render (before effects run)
  if (farmId !== prevFarmIdRef.current) {
    prevFarmIdRef.current = farmId;
    needsWellFitRef.current = true;
    // Use well IDs from the PREVIOUS render — guaranteed to belong to old farm,
    // even if PowerSync already resolved the new farm's wells synchronously.
    staleWellIdsRef.current = prevRenderedWellIdsRef.current;
    // Reset so farmState effect provides immediate state-center jump as fallback
    hasJumpedToFarmState.current = false;
    lastFlyLocation.current = null;
  }

  // Track current render's well IDs AFTER farm-switch detection
  prevRenderedWellIdsRef.current = wells
    .filter((w) => w.location)
    .map((w) => w.id)
    .sort()
    .join(',');

  // Fit to wells reactively when fresh data arrives for the new farm
  useEffect(() => {
    if (!needsWellFitRef.current || !mapLoaded || !mapRef.current) return;

    const located = wells.filter((w) => w.location);
    if (located.length === 0) return; // Wells not loaded yet, or farm has none

    // Skip if these are still the old farm's stale wells
    const currentIds = located.map((w) => w.id).sort().join(',');
    if (currentIds === staleWellIdsRef.current) return;

    needsWellFitRef.current = false;
    if (located.length >= 2) {
      const lngs = located.map((w) => w.location!.longitude);
      const lats = located.map((w) => w.location!.latitude);
      mapRef.current.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 80, maxZoom: 15, duration: 1000 }
      );
    } else {
      const loc = located[0].location!;
      mapRef.current.flyTo({
        center: [loc.longitude, loc.latitude],
        zoom: WELL_ZOOM,
        duration: 1000,
      });
    }
    hasJumpedToFarmState.current = true;
  }, [wells, mapLoaded]);

  // Compute initial view: regular users prefer GPS, super_admin always uses farm state
  const initialViewState = useMemo(() => {
    if (!isSuperAdmin && userLocation) {
      return { latitude: userLocation.lat, longitude: userLocation.lng, zoom: WELL_ZOOM };
    }
    return computeInitialViewState(farmState ?? null);
  }, [isSuperAdmin, farmState, userLocation]);

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
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        logoPosition="top-left"
        attributionControl={false}
        onLoad={handleMapLoad}
        onError={handleMapError}
        onClick={handleMapClick}
      >
        {wells
          .filter((w) => w.location)
          .map((well) => (
            <WellMarker
              key={well.id}
              well={well}
              allocationPercentage={allocationsByWellId.get(well.id)?.usagePercent}
              flagColor={getWellFlagColor(well, similarWellIds.has(well.id))}
              onClick={onWellClick}
            />
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
