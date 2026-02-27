import { useState, useCallback } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { useGeolocationPermission } from '../hooks/useGeolocationPermission';
import { getCoordinateValidationError } from '../lib/validation';

interface LocationPickerBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onNext: (location: { latitude: number; longitude: number }) => void;
  location: { latitude: number; longitude: number } | null;
  onLocationChange: (location: { latitude: number; longitude: number }) => void;
}

export default function LocationPickerBottomSheet({
  open,
  onClose,
  onNext,
  location,
  onLocationChange,
}: LocationPickerBottomSheetProps) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const permission = useGeolocationPermission();

  const handleGetLocation = useCallback(() => {
    // If permission is denied, show error immediately without calling API
    if (permission === 'denied') {
      setGpsError('Location permission denied. Please enable location access in your browser settings.');
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false);
        onLocationChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        setGpsLoading(false);
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied. Please enable location access in your browser settings.'
            : error.code === error.TIMEOUT
              ? 'Location request timed out. Try again.'
              : 'Unable to get location. Please enter manually.';
        setGpsError(message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onLocationChange, permission]);

  const handleLatitudeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const lat = parseFloat(e.target.value);
      if (!isNaN(lat) && lat >= -90 && lat <= 90) {
        onLocationChange({
          latitude: lat,
          longitude: location?.longitude ?? 0,
        });
      }
    },
    [location?.longitude, onLocationChange]
  );

  const handleLongitudeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const lng = parseFloat(e.target.value);
      if (!isNaN(lng) && lng >= -180 && lng <= 180) {
        onLocationChange({
          latitude: location?.latitude ?? 0,
          longitude: lng,
        });
      }
    },
    [location?.latitude, onLocationChange]
  );

  const handleNext = useCallback(() => {
    if (location) {
      onNext(location);
    }
  }, [location, onNext]);

  const coordinateError = location
    ? getCoordinateValidationError(location.latitude, location.longitude)
    : null;

  const isNextDisabled = !location || coordinateError !== null;

  if (!open) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div
        className="w-full bg-surface-header shadow-xl pb-[env(safe-area-inset-bottom)]"
      >
        {/* Header */}
        <div className="bg-surface-header p-4 pt-4 pb-0">
          <h2 className="text-white font-semibold text-lg tracking-wide">
            PICK WELL LOCATION
          </h2>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex gap-3 items-end">
            {/* Latitude input */}
            <div className="flex-1">
              <label className="text-xs text-white mb-1 block">
                Latitude
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={location?.latitude?.toFixed(6) ?? ''}
                onChange={handleLatitudeChange}
                placeholder="0.000000"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#759099] placeholder:text-[#759099] focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Longitude input */}
            <div className="flex-1">
              <label className="text-xs text-white mb-1 block">
                Longitude
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={location?.longitude?.toFixed(6) ?? ''}
                onChange={handleLongitudeChange}
                placeholder="0.000000"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#759099] placeholder:text-[#759099] focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* GPS button */}
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={gpsLoading}
              className="p-2.5 bg-white rounded-lg text-blue hover:bg-teal-hover transition-colors disabled:opacity-50"
              aria-label="Get current location"
            >
              {gpsLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MapPinIcon className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* GPS Error message */}
          {gpsError && (
            <p className="text-red-800 text-xs mt-2">{gpsError}</p>
          )}
          {coordinateError && !gpsError && (
            <p className="text-red-800 text-xs mt-2">{coordinateError}</p>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-between items-center px-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-white font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isNextDisabled}
            className="px-6 py-2.5 bg-teal-btn text-teal-btn-text rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
