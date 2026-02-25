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
import { useSubscriptionTier } from '../hooks/useSubscriptionTier';
import { useWellCount } from '../hooks/useWellCount';
import { useAppSetting } from '../hooks/useAppSetting';
import { buildSubscriptionUrl } from '../lib/subscriptionUrls';
import { useGeolocationPermission } from '../hooks/useGeolocationPermission';
import { useGeolocation } from '../hooks/useGeolocation';
import MapView from '../components/MapView';
import { MapErrorFallback } from '../components/ErrorFallback';
import SyncStatusBanner from '../components/SyncStatusBanner';
import LocationPickerBottomSheet from '../components/LocationPickerBottomSheet';
import AddWellFormBottomSheet, { type WellFormData } from '../components/AddWellFormBottomSheet';
import WellLimitModal from '../components/WellLimitModal';
import LocationSoftAskModal from '../components/LocationSoftAskModal';
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton';

export default function DashboardPage() {
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
  const subscriptionUrl = useAppSetting('subscription_website_url');
  const isGrower = role === 'grower' || role === 'super_admin';
  const upgradeUrl =
    subscriptionUrl && farmId && tier
      ? buildSubscriptionUrl(subscriptionUrl, farmId, tier.slug)
      : null;

  // Geolocation permission + location
  const permission = useGeolocationPermission();
  const { location: userLocation, requestLocation } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    enableCache: true,
    autoRequest: false,
  });

  // Auto-request location when permission is already granted
  useEffect(() => {
    if (permission === 'granted' && !userLocation) {
      requestLocation();
    }
  }, [permission, userLocation, requestLocation]);

  // Location permission modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'new-well' | null>(null);
  const modalAutoShownRef = useRef(false);

  // Auto-show location modal once on mount when permission not granted
  useEffect(() => {
    if (modalAutoShownRef.current) return;
    const dismissed = sessionStorage.getItem('location-modal-dismissed') === 'true';
    if (permission !== 'granted' && !dismissed) {
      modalAutoShownRef.current = true;
      setShowLocationModal(true);
    }
  }, [permission]);

  // Execute pending action after permission is granted
  useEffect(() => {
    if (permission === 'granted' && pendingAction === 'new-well') {
      setPendingAction(null);
      if (tier && wellCount >= tier.maxWells) {
        setShowLimitModal(true);
      } else {
        setCurrentStep('location');
      }
    }
  }, [permission, pendingAction, tier, wellCount]);

  const handleLocationAllow = useCallback(() => {
    setShowLocationModal(false);
    requestLocation();
  }, [requestLocation]);

  const handleLocationModalClose = useCallback(() => {
    setShowLocationModal(false);
    sessionStorage.setItem('location-modal-dismissed', 'true');
    setPendingAction(null);
  }, []);

  // Fade transition from skeleton to real content
  const [showContent, setShowContent] = useState(!loading);
  useEffect(() => {
    if (!loading && !showContent) {
      requestAnimationFrame(() => setShowContent(true));
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
        } else if (permission !== 'granted') {
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
    // Allow creation if tier data hasn't loaded (offline edge case per user decision)
    if (tier && wellCount >= tier.maxWells) {
      setShowLimitModal(true);
      return;
    }
    if (permission !== 'granted') {
      setPendingAction('new-well');
      setShowLocationModal(true);
      return;
    }
    setCurrentStep('location');
  }, [tier, wellCount, permission]);

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
          latitude, longitude, units, multiplier, send_monthly_report,
          battery_state, pump_state, meter_status, status, created_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          wellData.sendMonthlyReport ? 1 : 0,
          wellData.batteryState,
          wellData.pumpState,
          wellData.meterStatus,
          'active',
          user.id,
          now,
          now,
        ]
      );

      setCurrentStep('closed');
      setPickedLocation(null);
      showToast(`"${wellData.name}" added successfully`);
    } catch (error) {
      debugError('Dashboard', 'Failed to save well:', error);
      showToast('Failed to save well. Please try again.', 'error');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [db, farmId, role, user, showToast]);

  // Show skeleton while wells data is loading
  if (loading) return <DashboardSkeleton />;

  return (
    <div className={`relative w-full h-dvh overflow-hidden transition-opacity duration-200 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
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
        />
      </ErrorBoundary>

      {/* Sync status */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pt-[env(safe-area-inset-top)]">
        <SyncStatusBanner />
      </div>

      {/* Floating action buttons */}
      <div className="absolute bottom-6 left-4 right-4 z-20 flex justify-between pb-[env(safe-area-inset-bottom)]">
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
          Well List
        </button>
        {canCreateWell && (
          <button
            onClick={handleNewWell}
            className="px-5 py-3 rounded-full flex items-center gap-2 bg-surface-header
           text-white text-sm font-semibold
           shadow-xl
           active:scale-95 transition"
          >
            <PlusIcon className="w-5 h-5" />
            New Well
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
        upgradeUrl={upgradeUrl}
        isGrower={isGrower}
      />

      {/* Location Permission Modal */}
      <LocationSoftAskModal
        open={showLocationModal}
        onClose={handleLocationModalClose}
        onAllow={handleLocationAllow}
        mode={permission === 'denied' ? 'denied' : 'prompt'}
      />
    </div>
  );
}
