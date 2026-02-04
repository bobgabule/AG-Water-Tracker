import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ListBulletIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useWells } from '../hooks/useWells';
import { useAuth } from '../lib/AuthContext';
import { useFarmName } from '../hooks/useFarmName';
import MapView from '../components/MapView';
import LocationPickerBottomSheet from '../components/LocationPickerBottomSheet';
import AddWellFormBottomSheet, { type WellFormData } from '../components/AddWellFormBottomSheet';

export default function DashboardPage() {
  const { wells } = useWells();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const farmName = useFarmName(userProfile?.farm_id ?? null);

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

  const handleFormBack = useCallback(() => {
    setCurrentStep('location');
  }, []);

  const handleFormClose = useCallback(() => {
    setCurrentStep('closed');
    setPickedLocation(null);
  }, []);

  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }) => {
    setPickedLocation({ latitude: lngLat.lat, longitude: lngLat.lng });
  }, []);

  const handleSaveWell = useCallback((wellData: WellFormData) => {
    // TODO: Save well via PowerSync
    console.log('Save well:', wellData);
    setCurrentStep('closed');
    setPickedLocation(null);
  }, []);

  return (
    <div className="relative w-full h-dvh overflow-hidden">
      {/* Map layer */}
      <MapView
        wells={wells}
        onWellClick={handleWellClick}
        onMapClick={handleMapClick}
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
          onBack={handleFormBack}
          onSave={handleSaveWell}
          initialLocation={pickedLocation}
          farmName={farmName}
        />
      )}
    </div>
  );
}
