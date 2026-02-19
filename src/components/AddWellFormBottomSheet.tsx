import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { MapPinIcon, CheckIcon } from '@heroicons/react/24/outline';
import SegmentedControl from './SegmentedControl';
import { getCoordinateValidationError } from '../lib/validation';

export interface WellFormData {
  name: string;
  meterSerialNumber: string;
  wmisNumber: string;
  latitude: number;
  longitude: number;
  units: 'AF' | 'GAL' | 'CF';
  multiplier: '0.01' | '1' | '10' | '1000' | 'MG';
  sendMonthlyReport: boolean;
  batteryState: 'Ok' | 'Low' | 'Critical' | 'Dead' | 'Unknown';
  pumpState: 'Ok' | 'Low' | 'Critical' | 'Dead' | 'Unknown';
  meterStatus: 'Ok' | 'Low' | 'Critical' | 'Dead' | 'Unknown';
}

interface AddWellFormBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (wellData: WellFormData) => void;
  initialLocation: { latitude: number; longitude: number };
  farmName: string | null;
  isSaving?: boolean;
}

const unitOptions = [
  { value: 'AF', label: 'AF' },
  { value: 'GAL', label: 'GAL' },
  { value: 'CF', label: 'CF' },
];

const multiplierOptions = [
  { value: '0.01', label: '0.01' },
  { value: '1', label: '1' },
  { value: '10', label: '10' },
  { value: '1000', label: '1000' },
  { value: 'MG', label: 'MG' },
];

const stateOptions = ['Ok', 'Low', 'Critical', 'Dead', 'Unknown'] as const;

export default function AddWellFormBottomSheet({
  open,
  onClose,
  onSave,
  initialLocation,
  farmName,
  isSaving = false,
}: AddWellFormBottomSheetProps) {
  const [name, setName] = useState('');
  const [meterSerialNumber, setMeterSerialNumber] = useState('');
  const [wmisNumber, setWmisNumber] = useState('');
  const [latitude, setLatitude] = useState(initialLocation.latitude);
  const [longitude, setLongitude] = useState(initialLocation.longitude);
  const [units, setUnits] = useState<'AF' | 'GAL' | 'CF'>('AF');
  const [multiplier, setMultiplier] = useState<'0.01' | '1' | '10' | '1000' | 'MG'>('1');
  const [sendMonthlyReport, setSendMonthlyReport] = useState(true);
  const [batteryState, setBatteryState] = useState<WellFormData['batteryState']>('Unknown');
  const [pumpState, setPumpState] = useState<WellFormData['pumpState']>('Unknown');
  const [meterStatus, setMeterStatus] = useState<WellFormData['meterStatus']>('Unknown');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Reset form when dialog opens with new location
  useEffect(() => {
    if (open) {
      setName('');
      setMeterSerialNumber('');
      setWmisNumber('');
      setLatitude(initialLocation.latitude);
      setLongitude(initialLocation.longitude);
      setUnits('AF');
      setMultiplier('1');
      setSendMonthlyReport(true);
      setBatteryState('Unknown');
      setPumpState('Unknown');
      setMeterStatus('Unknown');
    }
  }, [open, initialLocation.latitude, initialLocation.longitude]);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false);
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
      },
      (error) => {
        setGpsLoading(false);
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied'
            : error.code === error.TIMEOUT
              ? 'Location request timed out'
              : 'Unable to get location';
        setGpsError(message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleLatitudeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= -90 && val <= 90) {
      setLatitude(val);
    }
  }, []);

  const handleLongitudeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= -180 && val <= 180) {
      setLongitude(val);
    }
  }, []);

  const handleUnitsChange = useCallback((value: string) => {
    setUnits(value as 'AF' | 'GAL' | 'CF');
  }, []);

  const handleMultiplierChange = useCallback((value: string) => {
    setMultiplier(value as '0.01' | '1' | '10' | '1000' | 'MG');
  }, []);

  const handleSave = useCallback(() => {
    const wellData: WellFormData = {
      name,
      meterSerialNumber,
      wmisNumber,
      latitude,
      longitude,
      units,
      multiplier,
      sendMonthlyReport,
      batteryState,
      pumpState,
      meterStatus,
    };
    onSave(wellData);
  }, [
    name,
    meterSerialNumber,
    wmisNumber,
    latitude,
    longitude,
    units,
    multiplier,
    sendMonthlyReport,
    batteryState,
    pumpState,
    meterStatus,
    onSave,
  ]);

  const coordinateError = getCoordinateValidationError(latitude, longitude);

  const isFormValid =
    name.trim() !== '' &&
    wmisNumber.trim() !== '' &&
    coordinateError === null;

  return (
    <Dialog open={open} onClose={isSaving ? () => {} : onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-end">
        <DialogPanel
          transition
          className="w-full bg-[#5f7248] shadow-xl transition duration-300 ease-out data-[closed]:translate-y-full max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-[#5f7248] p-4 pt-6 flex-shrink-0">
            <div>
              {farmName && (
                <p className="text-white text-xs">{farmName}</p>
              )}
              <h2 className="text-white font-bold text-lg tracking-wide">
                ADD NEW WELL
              </h2>
            </div>
          </div>

          {/* Scrollable form body */}
          <div className="flex-1 overflow-y-auto p-4 pb-[env(safe-area-inset-bottom)]">
            <div className="space-y-4">
              {/* Well Name */}
              <div>
                <label className="text-xs text-white mb-1 block">Well Name*</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter well name"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Meter Serial Number and WMIS Number */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-white mb-1 block">Meter Serial Number</label>
                  <input
                    type="text"
                    value={meterSerialNumber}
                    onChange={(e) => setMeterSerialNumber(e.target.value)}
                    placeholder="Serial #"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-white mb-1 block">WMIS Number*</label>
                  <input
                    type="text"
                    value={wmisNumber}
                    onChange={(e) => setWmisNumber(e.target.value)}
                    placeholder="WMIS #"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Latitude, Longitude, GPS */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-white mb-1 block">Latitude*</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={latitude.toFixed(6)}
                    onChange={handleLatitudeChange}
                    placeholder="0.000000"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-white mb-1 block">Longitude*</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={longitude.toFixed(6)}
                    onChange={handleLongitudeChange}
                    placeholder="0.000000"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={gpsLoading || isSaving}
                  className="p-2.5 bg-white rounded-lg text-[#6190d1] hover:bg-[#6190d1] transition-colors disabled:opacity-50"
                  aria-label="Get current location"
                >
                  {gpsLoading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MapPinIcon className="w-6 h-6" />
                  )}
                </button>
              </div>
              {gpsError && (
                <p className="text-red-500 text-xs mt-1">{gpsError}</p>
              )}
              {coordinateError && !gpsError && (
                <p className="text-red-500 text-xs mt-1">{coordinateError}</p>
              )}

              {/* Allocations disabled card */}
              <div className="bg-[#5f7248] border border-white/50 rounded-lg p-4 opacity-80">
                <h3 className="text-white font-medium text-sm">Allocations</h3>
                <p className="text-white/70 text-xs mt-1">
                  Save the well first to add allocations
                </p>
              </div>

              {/* Units */}
              <SegmentedControl
                label="Units*"
                options={unitOptions}
                value={units}
                onChange={handleUnitsChange}
              />

              {/* Multiplier */}
              <SegmentedControl
                label="Multiplier*"
                options={multiplierOptions}
                value={multiplier}
                onChange={handleMultiplierChange}
              />

              {/* Send monthly report checkbox */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendMonthlyReport}
                  onChange={(e) => setSendMonthlyReport(e.target.checked)}
                  className="w-5 h-5 rounded border-white-300 text-[#506741] focus:ring-white"
                />
                <span className="text-sm text-white">Send monthly meter reading report</span>
              </label>

              {/* Battery State */}
              <div>
                <label className="text-xs text-white mb-1 block">Battery State*</label>
                <select
                  value={batteryState}
                  onChange={(e) => setBatteryState(e.target.value as WellFormData['batteryState'])}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {stateOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pump State */}
              <div>
                <label className="text-xs text-white mb-1 block">Pump State*</label>
                <select
                  value={pumpState}
                  onChange={(e) => setPumpState(e.target.value as WellFormData['pumpState'])}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {stateOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Meter Status */}
              <div>
                <label className="text-xs text-white mb-1 block">Meter Status*</label>
                <select
                  value={meterStatus}
                  onChange={(e) => setMeterStatus(e.target.value as WellFormData['meterStatus'])}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {stateOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-between items-center px-4 py-4 border-0 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2.5 text-white font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isFormValid || isSaving}
              className="px-6 py-2.5 bg-[#bdefda] text-[#506741] rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#506741]/30 border-t-[#506741] rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  Save
                </>
              )}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
