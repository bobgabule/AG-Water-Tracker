import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { usePowerSync } from '@powersync/react';
import { ErrorBoundary } from 'react-error-boundary';
import { ListBulletIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useWells } from '../hooks/useWells';
import { useAuth } from '../lib/AuthProvider';
import { useActiveFarm } from '../hooks/useActiveFarm';
import { useUserRole } from '../hooks/useUserRole';
import { hasPermission } from '../lib/permissions';
import { debugError } from '../lib/debugLog';
import { useFarmState } from '../hooks/useFarmState';
import { useToastStore } from '../stores/toastStore';
import { useFarmReadOnly } from '../hooks/useFarmReadOnly';
import { useSubscriptionTier } from '../hooks/useSubscriptionTier';
import { useWellCount } from '../hooks/useWellCount';
import { useGeolocationPermission } from '../hooks/useGeolocationPermission';
import { useGeolocation } from '../hooks/useGeolocation';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../lib/supabase';
import MapView from '../components/MapView';
import { MapErrorFallback } from '../components/ErrorFallback';
import SyncStatusBanner from '../components/SyncStatusBanner';
import LocationPickerBottomSheet from '../components/LocationPickerBottomSheet';
import AddWellFormBottomSheet, { type WellFormData } from '../components/AddWellFormBottomSheet';
import WellLimitModal from '../components/WellLimitModal';
import LocationSoftAskModal from '../components/LocationSoftAskModal';
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton';

const LS_LOCATION_ALLOWED = 'location-previously-allowed';
const LS_LOCATION_DENIED = 'location-previously-denied';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { wells, loading } = useWells();
  const navigate = useNavigate();
  const db = usePowerSync();
  const { user } = useAuth();
  const { farmId, farmName } = useActiveFarm();
  const role = useUserRole();
  const canCreateWell = hasPermission(role, 'create_well');
  const farmState = useFarmState(farmId);
  const tier = useSubscriptionTier();
  const wellCount = useWellCount();
  const { isReadOnly } = useFarmReadOnly();
  const canManageAddons = hasPermission(role, 'view_subscription');

  // Geolocation permission + location
  const { permission, isResolved } = useGeolocationPermission();
  const { location: userLocation, requestLocation, error: locationError } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    enableCache: true,
    autoRequest: false,
  });

  // Location permission modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'new-well' | null>(null);
  const modalAutoShownRef = useRef(false);
  const safariDenialShownRef = useRef(false);

  // Auto-request location when permission is already granted.
  // Also check localStorage fallback for Safari, which may report 'prompt'
  // even after the user previously granted access (Permissions API unsupported).
  // When previouslyDenied is set, silently test if the user re-enabled in Settings.
  // Skip if the soft-ask modal is visible to avoid racing with the Allow button.
  useEffect(() => {
    if (!isResolved || userLocation || showLocationModal || locationError) return;
    const previouslyAllowed = localStorage.getItem(LS_LOCATION_ALLOWED) === 'true';
    const previouslyDenied = localStorage.getItem(LS_LOCATION_DENIED) === 'true';
    if (permission === 'granted' || ((previouslyAllowed || previouslyDenied) && permission !== 'denied')) {
      requestLocation();
    }
  }, [isResolved, permission, userLocation, requestLocation, showLocationModal, locationError]);

  // Auto-show location modal on mount when permission not granted.
  // Skip when previouslyAllowed/previouslyDenied — Effect 1 handles those
  // via silent GPS test. Override with permission === 'denied' (Chrome) so
  // a stale previouslyAllowed flag can't suppress the denied modal.
  useEffect(() => {
    if (!isResolved || modalAutoShownRef.current) return;
    const previouslyAllowed = localStorage.getItem(LS_LOCATION_ALLOWED) === 'true';
    const previouslyDenied = localStorage.getItem(LS_LOCATION_DENIED) === 'true';
    const shouldShow = permission === 'denied'
      || (permission !== 'granted' && !userLocation && !previouslyAllowed && !previouslyDenied);
    if (shouldShow) {
      modalAutoShownRef.current = true;
      setShowLocationModal(true);
    }
  }, [isResolved, permission, userLocation]);

  // Detect Safari/iOS location denial — Safari's Permissions API always returns
  // 'prompt', so a PERMISSION_DENIED GPS error is the only signal. Show the
  // denied modal and clear the stale localStorage flag to stop retrying.
  useEffect(() => {
    if (locationError?.code === 1 && !safariDenialShownRef.current) {
      safariDenialShownRef.current = true;
      localStorage.removeItem(LS_LOCATION_ALLOWED);
      localStorage.setItem(LS_LOCATION_DENIED, 'true');
      setShowLocationModal(true);
    }
  }, [locationError]);

  // Clear Safari denial flag when GPS succeeds (user re-enabled location in Settings)
  useEffect(() => {
    if (userLocation && localStorage.getItem(LS_LOCATION_DENIED) === 'true') {
      localStorage.removeItem(LS_LOCATION_DENIED);
      localStorage.setItem(LS_LOCATION_ALLOWED, 'true');
    }
  }, [userLocation]);

  // Execute pending action after permission is granted
  // Check both permission state AND userLocation — Safari doesn't fire
  // PermissionStatus.onchange, so permission may stay 'prompt' even after
  // the user grants access. A successful geolocation result is proof enough.
  useEffect(() => {
    if ((permission === 'granted' || userLocation) && pendingAction === 'new-well') {
      setPendingAction(null);
      setShowLocationModal(false);
      if (tier && wellCount >= tier.maxWells) {
        setShowLimitModal(true);
      } else {
        setCurrentStep('location');
      }
    }
  }, [permission, pendingAction, tier, wellCount, userLocation]);

  const handleLocationAllow = useCallback(() => {
    setShowLocationModal(false);
    localStorage.setItem(LS_LOCATION_ALLOWED, 'true');
    localStorage.removeItem(LS_LOCATION_DENIED);
    requestLocation();
  }, [requestLocation]);

  const handleLocationModalClose = useCallback(() => {
    setShowLocationModal(false);
    setPendingAction(null);
  }, []);

  // Fade transition from skeleton to real content
  const [showContent, setShowContent] = useState(!loading);
  useEffect(() => {
    if (!loading && !showContent) {
      setShowContent(true);
    }
  }, [loading, showContent]);

  // MapView error recovery: increment key to force remount (WebGL context recovery)
  const [mapKey, setMapKey] = useState(0);
  const handleMapReset = useCallback(() => setMapKey(k => k + 1), []);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const showToast = useToastStore((s) => s.show);

  // Well limit modal state
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Bottom sheet flow state
  const [currentStep, setCurrentStep] = useState<'closed' | 'location' | 'form'>('closed');
  const [pickedLocation, setPickedLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Handle ?action=new-well from WellListPage navigation
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('action') === 'new-well') {
      setSearchParams({}, { replace: true });
      // Defer to next tick so component is fully mounted
      queueMicrotask(() => {
        if (tier && wellCount >= tier.maxWells) {
          setShowLimitModal(true);
        } else if (permission === 'denied') {
          setShowLocationModal(true);
        } else if (permission !== 'granted' && !userLocation && localStorage.getItem(LS_LOCATION_ALLOWED) !== 'true') {
          setPendingAction('new-well');
          setShowLocationModal(true);
        } else {
          setCurrentStep('location');
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount only

  const handleWellClick = useCallback(
    (id: string) => navigate(`/wells/${id}`, { viewTransition: true }),
    [navigate],
  );
  const handleWellList = useCallback(() => navigate('/wells', { viewTransition: true }), [navigate]);

  // New Well flow handlers
  const handleNewWell = useCallback(() => {
    if (!farmId || isReadOnly) return; // Defensive guard: no farm selected or read-only
    // Allow creation if tier data hasn't loaded (offline edge case per user decision)
    if (tier && wellCount >= tier.maxWells) {
      setShowLimitModal(true);
      return;
    }
    if (permission === 'denied') {
      setShowLocationModal(true);
      return;
    }
    const previouslyAllowed = localStorage.getItem(LS_LOCATION_ALLOWED) === 'true';
    if (permission !== 'granted' && !userLocation && !previouslyAllowed) {
      setPendingAction('new-well');
      setShowLocationModal(true);
      return;
    }
    setCurrentStep('location');
  }, [tier, wellCount, permission, userLocation, isReadOnly]);

  const handleLimitModalClose = useCallback(() => {
    setShowLimitModal(false);
  }, []);

  const handleLocationClose = useCallback(() => {
    setCurrentStep('closed');
    setPickedLocation(null);
  }, []);

  const handleLocationNext = useCallback((location: { latitude: number; longitude: number }) => {
    setPickedLocation(location);
    setCurrentStep('form');
  }, []);

  const handleFormClose = useCallback(() => {
    setCurrentStep('closed');
    setPickedLocation(null);
  }, []);

  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }) => {
    setPickedLocation({ latitude: lngLat.lat, longitude: lngLat.lng });
  }, []);

  const handleSaveWell = useCallback(async (wellData: WellFormData) => {
    if (isReadOnly) return;
    if (!hasPermission(role, 'create_well')) {
      debugError('Dashboard', 'Attempted well creation without permission');
      return;
    }
    if (isSavingRef.current) return;

    if (!farmId || !user) {
      debugError('Dashboard', 'Cannot save well: missing farmId or user');
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    const wellId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await db.execute(
        `INSERT INTO wells (
          id, farm_id, name, meter_serial_number, wmis_number,
          latitude, longitude, units, multiplier,
          battery_state, pump_state, meter_status, status, created_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wellId,
          farmId,
          wellData.name,
          wellData.meterSerialNumber,
          wellData.wmisNumber,
          wellData.latitude,
          wellData.longitude,
          wellData.units,
          wellData.multiplier,
          wellData.batteryState,
          wellData.pumpState,
          wellData.meterStatus,
          'active',
          user.id,
          now,
          now,
        ]
      );

      // Add water district email to report recipients if email provided (via Supabase)
      if (wellData.waterDistrictEmail) {
        try {
          const email = wellData.waterDistrictEmail.toLowerCase();
          const { data: existing } = await supabase
            .from('report_email_recipients')
            .select('id')
            .eq('farm_id', farmId)
            .ilike('email', email);
          if (!existing || existing.length === 0) {
            await supabase.from('report_email_recipients').insert({
              id: crypto.randomUUID(),
              farm_id: farmId,
              email,
              is_auto_added: false,
              source_user_id: null,
            });
          }
        } catch (emailErr) {
          debugError('Dashboard', 'Failed to add water district email:', emailErr);
        }
      }

      setCurrentStep('closed');
      setPickedLocation(null);
      showToast(t('well.wellAdded', { name: wellData.name }));
    } catch (error) {
      debugError('Dashboard', 'Failed to save well:', error);
      showToast(t('well.wellAddFailed'), 'error');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [db, farmId, role, user, showToast, isReadOnly]);

  // Derive denied mode for the location modal — avoids reading localStorage in JSX
  const locationDeniedMode = permission === 'denied'
    || locationError?.code === 1
    || localStorage.getItem(LS_LOCATION_DENIED) === 'true';

  // Show skeleton while wells data is loading
  if (loading) return <DashboardSkeleton />;

  // Super admin with no farms — show centered empty state
  if (role === 'super_admin' && !farmId) {
    return (
      <div className="relative w-full h-dvh min-h-screen bg-[#191a1a] flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-white/60 text-lg">{t('farm.noFarmsCreated')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-dvh min-h-screen bg-[#191a1a] overflow-hidden transition-opacity duration-200 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      {/* Map layer */}
      <ErrorBoundary
        FallbackComponent={MapErrorFallback}
        onReset={handleMapReset}
      >
        <MapView
          key={mapKey}
          wells={wells}
          farmState={farmState}
          farmId={farmId}
          onWellClick={handleWellClick}
          onMapClick={handleMapClick}
          pickedLocation={pickedLocation}
          isPickingLocation={currentStep === 'location'}
          userLocation={userLocation}
          isSuperAdmin={role === 'super_admin'}
        />
      </ErrorBoundary>

      {/* Sync status */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pt-[env(safe-area-inset-top)]">
        <SyncStatusBanner />
      </div>

      {/* Floating action buttons */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+2.5rem)] left-4 right-4 z-20 flex justify-between">
        <button
          onClick={handleWellList}
          className="
          px-5 py-3 rounded-full flex items-center gap-2
          bg-black/60
          backdrop-blur-md
          text-white text-sm font-medium
          border border-white/10
          shadow-lg
          active:scale-95 transition"
        >
          <ListBulletIcon className="w-5 h-5" />
          {t('dashboard.wellList')}
        </button>
        {canCreateWell && (
          <button
            onClick={handleNewWell}
            disabled={!farmId || isReadOnly}
            className={`px-5 py-3 rounded-full flex items-center gap-2
              ${!farmId || isReadOnly ? 'bg-surface-header/50 text-white/30 cursor-not-allowed' : 'bg-surface-header text-white active:scale-95'}
              text-sm font-semibold shadow-xl transition`}
          >
            <PlusIcon className="w-5 h-5" />
            {t('dashboard.newWell')}
          </button>
        )}
      </div>

      {/* Location Picker Bottom Sheet */}
      <LocationPickerBottomSheet
        open={currentStep === 'location'}
        onClose={handleLocationClose}
        onNext={handleLocationNext}
        location={pickedLocation}
        onLocationChange={setPickedLocation}
      />

      {/* Add Well Form Bottom Sheet */}
      {pickedLocation && (
        <AddWellFormBottomSheet
          open={currentStep === 'form'}
          onClose={handleFormClose}
          onSave={handleSaveWell}
          initialLocation={pickedLocation}
          farmName={farmName}
          isSaving={isSaving}
        />
      )}

      {/* Well Limit Modal */}
      <WellLimitModal
        open={showLimitModal}
        onClose={handleLimitModalClose}
        canManageAddons={canManageAddons}
      />

      {/* Location Permission Modal */}
      <LocationSoftAskModal
        open={showLocationModal}
        onClose={handleLocationModalClose}
        onAllow={handleLocationAllow}
        mode={locationDeniedMode ? 'denied' : 'prompt'}
      />
    </div>
  );
}
