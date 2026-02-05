import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { usePowerSync } from '@powersync/react';
import { ListBulletIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useWells } from '../hooks/useWells';
import { useAuth } from '../lib/AuthProvider';
import MapView from '../components/MapView';
import LocationPickerBottomSheet from '../components/LocationPickerBottomSheet';
import AddWellFormBottomSheet, { type WellFormData } from '../components/AddWellFormBottomSheet';

export default function DashboardPage() {
  const { wells } = useWells();
  const navigate = useNavigate();
  const db = usePowerSync();
  const { user, onboardingStatus } = useAuth();
  const farmName = onboardingStatus?.farmName ?? null;

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
    const farmId = onboardingStatus?.farmId;
    if (!farmId || !user) {
      console.error('Cannot save well: missing farmId or user');
      return;
    }

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
    } catch (error) {
      console.error('Failed to save well:', error);
      alert('Failed to save well. Please try again.');
    }
  }, [db, onboardingStatus?.farmId, user]);

  return (
    <div className="relative w-full h-dvh overflow-hidden">
      {/* Map layer */}
      <MapView
        wells={wells}
        onWellClick={handleWellClick}
        onMapClick={handleMapClick}
        onMapLongPress={handleMapLongPress}
        pickedLocation={pickedLocation}
        isPickingLocation={currentStep === 'location'}
      />

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
