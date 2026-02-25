import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { usePowerSync, useQuery } from '@powersync/react';
import {
  ArrowLeftIcon,
  CheckIcon,
  TrashIcon,
  MapPinIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import SegmentedControl from '../components/SegmentedControl';
import { useTranslation } from '../hooks/useTranslation';
import { useWells } from '../hooks/useWells';
import { useWellAllocations } from '../hooks/useWellAllocations';
import {
  getCoordinateValidationError,
  isWellNameUnique,
  isWmisUnique,
} from '../lib/validation';
import { useToastStore } from '../stores/toastStore';
import { useWellEditDraftStore } from '../stores/wellEditDraftStore';
import { useActiveFarm } from '../hooks/useActiveFarm';
import ConfirmDialog from '../components/ConfirmDialog';

type Units = 'AF' | 'GAL' | 'CF';
type Multiplier = '0.01' | '1' | '10' | '1000' | 'MG';
type EquipmentState = 'Ok' | 'Low' | 'Critical' | 'Dead' | 'Unknown';

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

export default function WellEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const db = usePowerSync();
  const { wells } = useWells();
  const { allocations } = useWellAllocations(id ?? null);
  const readingsCheck = useQuery<{ n: number }>(
    id ? 'SELECT 1 AS n FROM readings WHERE well_id = ? LIMIT 1' : 'SELECT NULL WHERE 0',
    id ? [id] : [],
  );
  const hasReadings = (readingsCheck.data?.length ?? 0) > 0;
  const { farmName: activeFarmName } = useActiveFarm();
  const farmName = activeFarmName ?? '';

  const well = wells.find((w) => w.id === id) ?? null;

  // Track whether initialization has occurred to prevent re-initialization
  const initializedRef = useRef<boolean>(false);
  // Form state
  const [name, setName] = useState('');
  const [meterSerialNumber, setMeterSerialNumber] = useState('');
  const [wmisNumber, setWmisNumber] = useState('');
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [units, setUnits] = useState<Units>('AF');
  const [multiplier, setMultiplier] = useState<Multiplier>('1');
  const [batteryState, setBatteryState] = useState<EquipmentState>('Unknown');
  const [pumpState, setPumpState] = useState<EquipmentState>('Unknown');
  const [meterStatus, setMeterStatus] = useState<EquipmentState>('Unknown');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [wmisError, setWmisError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Initialize form from draft store or well data (once)
  useEffect(() => {
    if (initializedRef.current) return;

    const draft = useWellEditDraftStore.getState().draft;
    if (draft && draft.wellId === id) {
      // Restore from draft (returning from allocations page)
      setName(draft.name);
      setMeterSerialNumber(draft.meterSerialNumber);
      setWmisNumber(draft.wmisNumber);
      setLatitude(draft.latitude);
      setLongitude(draft.longitude);
      setUnits(draft.units);
      setMultiplier(draft.multiplier);
      setBatteryState(draft.batteryState as EquipmentState);
      setPumpState(draft.pumpState as EquipmentState);
      setMeterStatus(draft.meterStatus as EquipmentState);
      useWellEditDraftStore.getState().clearDraft();
      initializedRef.current = true;
      return;
    }

    if (well) {
      setName(well.name);
      setMeterSerialNumber(well.meterSerialNumber ?? '');
      setWmisNumber(well.wmisNumber ?? '');
      setLatitude(well.location?.latitude ?? 0);
      setLongitude(well.location?.longitude ?? 0);
      setUnits((well.units as Units) || 'AF');
      setMultiplier((well.multiplier as Multiplier) || '1');
      setBatteryState((well.batteryState as EquipmentState) || 'Unknown');
      setPumpState((well.pumpState as EquipmentState) || 'Unknown');
      setMeterStatus((well.meterStatus as EquipmentState) || 'Unknown');
      initializedRef.current = true;
    }
  }, [id, well]);

  // Redirect to home if well not found after data loads
  useEffect(() => {
    if (wells.length > 0 && !well && initializedRef.current === false) {
      navigate('/', { replace: true, viewTransition: true });
    }
  }, [wells, well, navigate]);

  // Dirty tracking: compare current form against original well data
  const isDirty = useMemo(() => {
    if (!well) return false;
    return (
      name !== well.name ||
      meterSerialNumber !== (well.meterSerialNumber ?? '') ||
      wmisNumber !== (well.wmisNumber ?? '') ||
      latitude !== (well.location?.latitude ?? 0) ||
      longitude !== (well.location?.longitude ?? 0) ||
      units !== ((well.units as Units) || 'AF') ||
      multiplier !== ((well.multiplier as Multiplier) || '1') ||
      batteryState !== ((well.batteryState as EquipmentState) || 'Unknown') ||
      pumpState !== ((well.pumpState as EquipmentState) || 'Unknown') ||
      meterStatus !== ((well.meterStatus as EquipmentState) || 'Unknown')
    );
  }, [
    well,
    name,
    meterSerialNumber,
    wmisNumber,
    latitude,
    longitude,
    units,
    multiplier,
    batteryState,
    pumpState,
    meterStatus,
  ]);

  // beforeunload for browser refresh/tab close
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // GPS handler (same as AddWellFormBottomSheet)
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
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // Coordinate input handlers (same as AddWellFormBottomSheet)
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
    setUnits(value as Units);
  }, []);

  const handleMultiplierChange = useCallback((value: string) => {
    setMultiplier(value as Multiplier);
  }, []);

  // Navigate to allocations: save draft and navigate
  const handleAllocationsNav = useCallback(() => {
    useWellEditDraftStore.getState().setDraft({
      wellId: id!,
      name,
      meterSerialNumber,
      wmisNumber,
      latitude,
      longitude,
      units,
      multiplier,
      batteryState,
      pumpState,
      meterStatus,
    });
    navigate(`/wells/${id}/allocations`, { viewTransition: true });
  }, [
    id,
    name,
    meterSerialNumber,
    wmisNumber,
    latitude,
    longitude,
    units,
    multiplier,
    batteryState,
    pumpState,
    meterStatus,
    navigate,
  ]);

  // Save handler
  const handleSave = useCallback(async () => {
    // Clear previous errors
    setNameError(null);
    setWmisError(null);

    // Validate required fields
    if (name.trim() === '') {
      setNameError(t('well.wellNameRequired'));
      return;
    }
    if (wmisNumber.trim() === '') {
      setWmisError(t('well.wmisRequired'));
      return;
    }

    const coordError = getCoordinateValidationError(latitude, longitude);
    if (coordError) {
      setGpsError(coordError);
      return;
    }

    // Uniqueness validation
    if (!isWellNameUnique(name, wells, id)) {
      setNameError(t('well.wellNameDuplicate'));
      return;
    }
    if (!isWmisUnique(wmisNumber, wells, id)) {
      setWmisError(t('well.wmisDuplicate'));
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      await db.execute(
        `UPDATE wells SET name = ?, meter_serial_number = ?, wmis_number = ?,
         latitude = ?, longitude = ?, units = ?, multiplier = ?,
         battery_state = ?, pump_state = ?,
         meter_status = ?, updated_at = ? WHERE id = ?`,
        [
          name.trim(),
          meterSerialNumber.trim() || null,
          wmisNumber.trim(),
          latitude,
          longitude,
          units,
          multiplier,
          batteryState,
          pumpState,
          meterStatus,
          now,
          id,
        ],
      );
      useWellEditDraftStore.getState().clearDraft();
      useToastStore.getState().show(t('well.wellUpdated'));
      navigate(`/wells/${id}`, { viewTransition: true });
    } catch {
      useToastStore.getState().show(t('well.wellUpdateFailed'), 'error');
    } finally {
      setSaving(false);
    }
  }, [
    name,
    meterSerialNumber,
    wmisNumber,
    latitude,
    longitude,
    units,
    multiplier,
    batteryState,
    pumpState,
    meterStatus,
    wells,
    id,
    db,
    navigate,
  ]);

  // Delete handler
  const handleDeleteWell = useCallback(async () => {
    setDeleteLoading(true);
    try {
      await db.writeTransaction(async (tx) => {
        await tx.execute('DELETE FROM readings WHERE well_id = ?', [id]);
        await tx.execute('DELETE FROM allocations WHERE well_id = ?', [id]);
        await tx.execute('DELETE FROM wells WHERE id = ?', [id]);
      });
      useWellEditDraftStore.getState().clearDraft();
      useToastStore.getState().show(t('well.wellDeleted'));
      navigate('/', { viewTransition: true });
    } catch {
      useToastStore.getState().show(t('well.wellDeleteFailed'), 'error');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  }, [db, id, navigate]);

  // Back navigation handler
  const handleBack = useCallback(() => {
    navigate(`/wells/${id}`, { viewTransition: true });
  }, [navigate, id]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    navigate(`/wells/${id}`, { viewTransition: true });
  }, [navigate, id]);

  const coordinateError = getCoordinateValidationError(latitude, longitude);

  const isFormValid =
    name.trim() !== '' && wmisNumber.trim() !== '' && coordinateError === null;

  if (!well && wells.length === 0) {
    // Loading state
    return (
      <div className="h-full bg-surface-header flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!well) {
    return null; // Redirect handled by useEffect
  }

  return (
    <div className="h-full flex flex-col bg-surface-header">
      {/* Header */}
      <div className="bg-surface-header p-4 pt-6 flex-shrink-0 flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="p-1 text-white"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <div>
          {farmName && <p className="text-white text-xs">{farmName}</p>}
          <h2 className="text-white font-bold text-lg tracking-wide">{t('well.editWell')}</h2>
        </div>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto p-4 pb-[env(safe-area-inset-bottom)]">
        <div className="space-y-4">
          {/* Well Name */}
          <div>
            <label className="text-xs text-white mb-1 block">{t('well.wellName')}*</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
              placeholder={t('well.wellNamePlaceholder')}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {nameError && <p className="text-red-300 text-xs mt-1">{nameError}</p>}
          </div>

          {/* Meter Serial Number and WMIS Number */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-white mb-1 block">{t('well.meterSerialNumber')}</label>
              <input
                type="text"
                value={meterSerialNumber}
                onChange={(e) => setMeterSerialNumber(e.target.value)}
                placeholder={t('well.serialPlaceholder')}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-white mb-1 block">{t('well.wmisNumber')}*</label>
              <input
                type="text"
                value={wmisNumber}
                onChange={(e) => {
                  setWmisNumber(e.target.value);
                  setWmisError(null);
                }}
                placeholder={t('well.wmisPlaceholder')}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {wmisError && <p className="text-red-300 text-xs mt-1">{wmisError}</p>}
            </div>
          </div>

          {/* Latitude, Longitude, GPS */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-white mb-1 block">{t('well.latitude')}*</label>
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
              <label className="text-xs text-white mb-1 block">{t('well.longitude')}*</label>
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
              disabled={gpsLoading}
              className="p-2.5 bg-white rounded-lg text-accent-gps hover:bg-accent-gps transition-colors disabled:opacity-50"
              aria-label="Get current location"
            >
              {gpsLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MapPinIcon className="w-6 h-6" />
              )}
            </button>
          </div>
          {gpsError && <p className="text-red-500 text-xs mt-1">{gpsError}</p>}
          {coordinateError && !gpsError && (
            <p className="text-red-500 text-xs mt-1">{coordinateError}</p>
          )}

          {/* Allocations link */}
          <button
            type="button"
            onClick={handleAllocationsNav}
            className="w-full bg-surface-header border border-white/50 rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <h3 className="text-white font-medium text-sm">{t('well.allocations')}</h3>
              <p className="text-white/70 text-xs mt-0.5">
                {t('allocation.period', { count: allocations.length })}
              </p>
            </div>
            <div className="p-1.5 bg-white/15 rounded-md">
              <PencilSquareIcon className="w-4 h-4 text-white/80" />
            </div>
          </button>

          {/* Units */}
          <SegmentedControl
            label={`${t('well.units')}*`}
            options={unitOptions}
            value={units}
            onChange={handleUnitsChange}
            disabled={hasReadings}
          />

          {/* Multiplier */}
          <SegmentedControl
            label={`${t('well.multiplier')}*`}
            options={multiplierOptions}
            value={multiplier}
            onChange={handleMultiplierChange}
            disabled={hasReadings}
          />
          {hasReadings && (
            <p className="text-white/60 text-xs -mt-1">{t('well.unitsLockedHint')}</p>
          )}

          {/* Battery State */}
          <div>
            <label className="text-xs text-white mb-1 block">{t('well.batteryState')}*</label>
            <select
              value={batteryState}
              onChange={(e) => setBatteryState(e.target.value as EquipmentState)}
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
            <label className="text-xs text-white mb-1 block">{t('well.pumpState')}*</label>
            <select
              value={pumpState}
              onChange={(e) => setPumpState(e.target.value as EquipmentState)}
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
            <label className="text-xs text-white mb-1 block">{t('well.meterStatus')}*</label>
            <select
              value={meterStatus}
              onChange={(e) => setMeterStatus(e.target.value as EquipmentState)}
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
        <button type="button" onClick={handleCancel} className="px-6 py-2.5 text-white font-medium">
          {t('well.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isFormValid || saving}
          className="px-6 py-2.5 bg-btn-confirm text-btn-confirm-text rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-btn-confirm-text border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckIcon className="w-5 h-5" />
          )}
          {t('well.save')}
        </button>
      </div>

      {/* Delete Well button */}
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-3 text-red-400 font-medium flex items-center justify-center gap-2"
        >
          <TrashIcon className="w-5 h-5" />
          {t('well.deleteWell')}
        </button>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteWell}
        title={t('well.deleteWell')}
        description={<>Delete <span className="text-white font-medium">{well.name}</span> and all its readings and allocations? This cannot be undone.</>}
        confirmText={t('confirm.delete')}
        confirmLoadingText={t('confirm.deleting')}
        loading={deleteLoading}
      />
    </div>
  );
}
