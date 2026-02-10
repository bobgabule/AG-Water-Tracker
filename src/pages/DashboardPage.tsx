import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { usePowerSync } from '@powersync/react';
import { ErrorBoundary } from 'react-error-boundary';
import { ListBulletIcon, PlusIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useWells } from '../hooks/useWells';
import { useAuth } from '../lib/AuthProvider';
import MapView from '../components/MapView';
import { MapErrorFallback } from '../components/ErrorFallback';
import SyncStatusBanner from '../components/SyncStatusBanner';
import LocationPickerBottomSheet from '../components/LocationPickerBottomSheet';
import AddWellFormBottomSheet, { type WellFormData } from '../components/AddWellFormBottomSheet';

export default function DashboardPage() {
  const { wells } = useWells();
  const navigate = useNavigate();
  const db = usePowerSync();
  const { user, onboardingStatus } = useAuth();
  const farmName = onboardingStatus?.farmName ?? null;

  // MapView error recovery: increment key to force remount (WebGL context recovery)
  const [mapKey, setMapKey] = useState(0);
  const handleMapReset = useCallback(() => setMapKey(k => k + 1), []);

  // Save state
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => { clearTimeout(errorTimeoutRef.current); };
  }, []);

  // Bottom sheet flow state
  const [currentStep, setCurrentStep] = useState<'closed' | 'location' | 'form'>('closed');
  const [pickedLocation, setPickedLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const handleWellClick = useCallback(
    (id: string) => navigate(`/wells/${id}`),
    [navigate],
  );
  const handleWellList = useCallback(() => navigate('/wells'), [navigate]);

  // New Well flow handlers
  const handleNewWell = useCallback(() => {
    setCurrentStep('location');
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

  // Long-press: skip location picker and go straight to form
  const handleMapLongPress = useCallback((lngLat: { lng: number; lat: number }) => {
    setPickedLocation({ latitude: lngLat.lat, longitude: lngLat.lng });
    setCurrentStep('form');
  }, []);

  const handleSaveWell = useCallback(async (wellData: WellFormData) => {
    if (isSaving) return;

    const farmId = onboardingStatus?.farmId;
    if (!farmId || !user) {
      console.error('Cannot save well: missing farmId or user');
      return;
    }

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

      setSaveError(null);
      setCurrentStep('closed');
      setPickedLocation(null);
    } catch (error) {
      console.error('Failed to save well:', error);
      clearTimeout(errorTimeoutRef.current);
      setSaveError('Failed to save well. Please try again.');
      errorTimeoutRef.current = setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  }, [db, isSaving, onboardingStatus?.farmId, user]);

  return (
    <div className="relative w-full h-dvh overflow-hidden">
      {/* Map layer */}
      <ErrorBoundary
        FallbackComponent={MapErrorFallback}
        onReset={handleMapReset}
      >
        <MapView
          key={mapKey}
          wells={wells}
          onWellClick={handleWellClick}
          onMapClick={handleMapClick}
          onMapLongPress={handleMapLongPress}
          pickedLocation={pickedLocation}
          isPickingLocation={currentStep === 'location'}
        />
      </ErrorBoundary>

      {/* Sync status */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pt-[env(safe-area-inset-top)]">
        <SyncStatusBanner />
      </div>

      {/* Save error notification */}
      {saveError && (
        <div className="absolute bottom-24 left-4 right-4 z-30 flex justify-center pb-[env(safe-area-inset-bottom)]">
          <div role="alert" className="px-4 py-2.5 rounded-xl bg-red-500/90 backdrop-blur-sm text-white text-sm font-medium shadow-lg flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
            {saveError}
            <button
              onClick={() => setSaveError(null)}
              className="ml-2 p-0.5 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Dismiss error"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
        <button
          onClick={handleNewWell}
          className="px-5 py-3 rounded-full flex items-center gap-2 bg-[#bfe8d9]
         text-[#5a9494] text-sm font-semibold
         shadow-xl
         active:scale-95 transition"
        >
          <PlusIcon className="w-5 h-5" />
          New Well
        </button>
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
        />
      )}
    </div>
  );
}
