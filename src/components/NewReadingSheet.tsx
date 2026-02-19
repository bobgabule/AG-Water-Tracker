import { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import {
  CheckIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { usePowerSync } from '@powersync/react';
import { useWellReadings } from '../hooks/useWellReadings';
import { useGeolocation } from '../hooks/useGeolocation';
import { getDistanceToWell, isInRange } from '../lib/gps-proximity';
import { useToastStore } from '../stores/toastStore';
import type { WellWithReading } from '../hooks/useWells';

interface NewReadingSheetProps {
  open: boolean;
  onClose: () => void;
  well: WellWithReading;
  farmId: string;
  userId: string;
}

type ActiveTab = 'reading' | 'problem';
type ReadingView = 'form' | 'similar-warning' | 'range-warning' | 'submitting';

interface MeterProblems {
  notWorking: boolean;
  batteryDead: boolean;
  pumpOff: boolean;
  deadPump: boolean;
}

const INITIAL_PROBLEMS: MeterProblems = {
  notWorking: false,
  batteryDead: false,
  pumpOff: false,
  deadPump: false,
};

interface GpsResult {
  lat: number;
  lng: number;
}

function validateReadingValue(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === '') return 'Reading value is required';
  const num = Number(trimmed);
  if (isNaN(num)) return 'Please enter a valid number';
  if (num <= 0) return 'Reading must be a positive number';
  return null;
}

function captureGps(): Promise<GpsResult | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 5000 },
    );
  });
}

export default function NewReadingSheet({
  open,
  onClose,
  well,
  farmId,
  userId,
}: NewReadingSheetProps) {
  const db = usePowerSync();
  const { readings } = useWellReadings(well.id);
  const { location: userLocation } = useGeolocation({ autoRequest: false });

  const [activeTab, setActiveTab] = useState<ActiveTab>('reading');
  const [view, setView] = useState<ReadingView>('form');
  const [readingValue, setReadingValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [gpsResult, setGpsResult] = useState<GpsResult | null>(null);
  const [problems, setProblems] = useState<MeterProblems>(INITIAL_PROBLEMS);
  const [problemsSubmitting, setProblemsSubmitting] = useState(false);

  // Real-time proximity indicator from cached location
  const proximityInfo = useMemo(() => {
    if (!userLocation || !well.location) return null;
    const dist = getDistanceToWell(
      { lat: userLocation.lat, lng: userLocation.lng },
      { latitude: well.location.latitude, longitude: well.location.longitude },
    );
    return { inRange: isInRange(dist) };
  }, [userLocation, well.location]);

  const resetForm = useCallback(() => {
    setActiveTab('reading');
    setView('form');
    setReadingValue('');
    setValidationError(null);
    setGpsResult(null);
    setProblems(INITIAL_PROBLEMS);
    setProblemsSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleTabReading = useCallback(() => setActiveTab('reading'), []);
  const handleTabProblem = useCallback(() => setActiveTab('problem'), []);

  const saveReading = useCallback(
    async (gps: GpsResult | null, forceOutOfRange?: boolean) => {
      try {
        const readingId = crypto.randomUUID();
        const now = new Date().toISOString();

        let inRange = 0;
        if (gps && well.location) {
          const dist = getDistanceToWell(
            { lat: gps.lat, lng: gps.lng },
            {
              latitude: well.location.latitude,
              longitude: well.location.longitude,
            },
          );
          inRange = forceOutOfRange ? 0 : isInRange(dist) ? 1 : 0;
        }

        await db.execute(
          `INSERT INTO readings (id, well_id, farm_id, value, recorded_by, recorded_at,
            gps_latitude, gps_longitude, is_in_range, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            readingId,
            well.id,
            farmId,
            readingValue.trim(),
            userId,
            now,
            gps?.lat ?? null,
            gps?.lng ?? null,
            inRange,
            null,
            now,
            now,
          ],
        );

        useToastStore.getState().show('Reading saved');
        resetForm();
        onClose();
      } catch {
        useToastStore.getState().show('Failed to save reading', 'error');
        setView('form');
      }
    },
    [db, well.id, well.location, farmId, userId, readingValue, resetForm, onClose],
  );

  const handleGpsCaptureAndSave = useCallback(async () => {
    setView('submitting');
    const gps = await captureGps();

    // Check if out of range
    if (gps && well.location) {
      const dist = getDistanceToWell(
        { lat: gps.lat, lng: gps.lng },
        {
          latitude: well.location.latitude,
          longitude: well.location.longitude,
        },
      );
      if (!isInRange(dist)) {
        setGpsResult(gps);
        setView('range-warning');
        return;
      }
    }

    await saveReading(gps);
  }, [well.location, saveReading]);

  const handleSubmit = useCallback(() => {
    const error = validateReadingValue(readingValue);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);

    // Check for similar reading
    if (readings.length > 0) {
      const lastValue = parseFloat(readings[0].value);
      const currentValue = parseFloat(readingValue.trim());
      if (!isNaN(lastValue) && !isNaN(currentValue)) {
        if (Math.abs(currentValue - lastValue) <= 5) {
          setView('similar-warning');
          return;
        }
      }
    }

    // Proceed directly to GPS capture
    handleGpsCaptureAndSave();
  }, [readingValue, readings, handleGpsCaptureAndSave]);

  const handleSimilarContinue = useCallback(() => {
    handleGpsCaptureAndSave();
  }, [handleGpsCaptureAndSave]);

  const handleRangeContinue = useCallback(() => {
    saveReading(gpsResult, true);
  }, [saveReading, gpsResult]);

  const handleBackToForm = useCallback(() => {
    setView('form');
  }, []);

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setReadingValue(e.target.value);
      if (validationError) setValidationError(null);
    },
    [validationError],
  );

  const handleProblemToggle = useCallback((key: keyof MeterProblems) => {
    setProblems((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const hasProblemsSelected = problems.notWorking || problems.batteryDead || problems.pumpOff || problems.deadPump;

  const handleProblemSubmit = useCallback(async () => {
    setProblemsSubmitting(true);
    try {
      const updates: Record<string, string> = {};
      if (problems.notWorking) updates.meter_status = 'Dead';
      if (problems.batteryDead) updates.battery_state = 'Dead';
      if (problems.pumpOff) updates.pump_state = 'Critical';
      if (problems.deadPump) updates.pump_state = 'Dead'; // overwrites pumpOff

      const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
      const values = [...Object.values(updates), new Date().toISOString(), well.id];

      await db.execute(
        `UPDATE wells SET ${setClauses}, updated_at = ? WHERE id = ?`,
        values,
      );

      useToastStore.getState().show('Problem reported');
      resetForm();
      onClose();
    } catch {
      useToastStore.getState().show('Failed to report problem', 'error');
      setProblemsSubmitting(false);
    }
  }, [db, problems, well.id, resetForm, onClose]);

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-[60]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-end">
        <DialogPanel
          transition
          className="w-full bg-[#5f7248] shadow-xl transition duration-300 ease-out data-[closed]:translate-y-full max-h-[90vh] flex flex-col rounded-t-2xl"
        >
          {/* Header */}
          <div className="p-4 pt-6 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-xs">{well.name}</p>
                <h2 className="text-white font-bold text-lg tracking-wide">
                  NEW READING
                </h2>
              </div>
              {/* Real-time proximity indicator */}
              {proximityInfo && (
                <div className="flex items-center gap-1">
                  <MapPinIcon
                    className={`w-4 h-4 ${
                      proximityInfo.inRange ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      proximityInfo.inRange ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  >
                    {proximityInfo.inRange ? 'In Range' : 'Out of Range'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 px-4 pb-3 flex-shrink-0">
            <button
              type="button"
              onClick={handleTabReading}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'reading'
                  ? 'bg-white/20 font-semibold text-white'
                  : 'text-white/60'
              }`}
            >
              Reading
            </button>
            <button
              type="button"
              onClick={handleTabProblem}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'problem'
                  ? 'bg-white/20 font-semibold text-white'
                  : 'text-white/60'
              }`}
            >
              Meter Problem
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-4">
            {activeTab === 'reading' ? (
              <>
                {/* Reading tab */}
                {view === 'form' && (
                  <div className="space-y-4">
                    {/* Numeric input with unit display */}
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={readingValue}
                        onChange={handleValueChange}
                        placeholder="0"
                        className="flex-1 text-3xl font-bold text-white bg-white/10 rounded-xl px-4 py-3 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30"
                      />
                      <span className="text-lg text-white/70 whitespace-nowrap">
                        {well.units} x {well.multiplier}
                      </span>
                    </div>
                    {/* Validation error */}
                    {validationError && (
                      <p className="text-red-400 text-sm">{validationError}</p>
                    )}
                  </div>
                )}

                {view === 'similar-warning' && (
                  <div className="flex flex-col items-center text-center space-y-4 py-6">
                    <ExclamationTriangleIcon className="w-12 h-12 text-yellow-400" />
                    <h3 className="text-white text-xl font-bold">
                      Similar Reading
                    </h3>
                    <ul className="space-y-2 text-white/70 text-sm">
                      <li>
                        This reading is within 5 {well.units} of the last
                        recorded reading
                      </li>
                      <li>Double check the meter</li>
                    </ul>
                    <div className="flex gap-3 w-full pt-4">
                      <button
                        type="button"
                        onClick={handleBackToForm}
                        className="flex-1 py-3 text-white font-medium rounded-lg"
                      >
                        Go Back
                      </button>
                      <button
                        type="button"
                        onClick={handleSimilarContinue}
                        className="flex-1 py-3 bg-[#bdefda] text-[#506741] rounded-lg font-medium"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {view === 'range-warning' && (
                  <div className="flex flex-col items-center text-center space-y-4 py-6">
                    <ExclamationTriangleIcon className="w-12 h-12 text-yellow-400" />
                    <h3 className="text-white text-xl font-bold">
                      GPS Coordinates Incorrect
                    </h3>
                    <ul className="space-y-2 text-white/70 text-sm">
                      <li>Are you at the right well?</li>
                      <li>Check your device GPS</li>
                    </ul>
                    <div className="flex gap-3 w-full pt-4">
                      <button
                        type="button"
                        onClick={handleBackToForm}
                        className="flex-1 py-3 text-white font-medium rounded-lg"
                      >
                        Go Back
                      </button>
                      <button
                        type="button"
                        onClick={handleRangeContinue}
                        className="flex-1 py-3 bg-[#bdefda] text-[#506741] rounded-lg font-medium"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {view === 'submitting' && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <p className="text-white/70 text-sm">Saving...</p>
                  </div>
                )}
              </>
            ) : (
              /* Meter Problem tab */
              problemsSubmitting ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <p className="text-white/70 text-sm">Submitting...</p>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={problems.notWorking}
                      onChange={() => handleProblemToggle('notWorking')}
                      className="w-5 h-5 rounded border-white/30 text-[#506741] focus:ring-white bg-white/10"
                    />
                    <span className="text-white text-base">Not Working</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={problems.batteryDead}
                      onChange={() => handleProblemToggle('batteryDead')}
                      className="w-5 h-5 rounded border-white/30 text-[#506741] focus:ring-white bg-white/10"
                    />
                    <span className="text-white text-base">Battery Dead</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={problems.pumpOff}
                      onChange={() => handleProblemToggle('pumpOff')}
                      className="w-5 h-5 rounded border-white/30 text-[#506741] focus:ring-white bg-white/10"
                    />
                    <span className="text-white text-base">Pump Off</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={problems.deadPump}
                      onChange={() => handleProblemToggle('deadPump')}
                      className="w-5 h-5 rounded border-white/30 text-[#506741] focus:ring-white bg-white/10"
                    />
                    <span className="text-white text-base">Dead Pump</span>
                  </label>
                </div>
              )
            )}
          </div>

          {/* Footer - Reading tab form view */}
          {activeTab === 'reading' && view === 'form' && (
            <div className="flex justify-between items-center px-4 py-4 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={handleClose}
                className="text-white font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-[#bdefda] text-[#506741] rounded-lg font-medium flex items-center gap-2"
              >
                <CheckIcon className="w-5 h-5" />
                Save
              </button>
            </div>
          )}

          {/* Footer - Meter Problem tab */}
          {activeTab === 'problem' && !problemsSubmitting && (
            <div className="flex justify-between items-center px-4 py-4 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={handleClose}
                className="text-white font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProblemSubmit}
                disabled={!hasProblemsSelected}
                className="px-6 py-2.5 bg-[#bdefda] text-[#506741] rounded-lg font-medium flex items-center gap-2 disabled:opacity-40"
              >
                <CheckIcon className="w-5 h-5" />
                Submit
              </button>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
