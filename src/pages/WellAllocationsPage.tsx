import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { usePowerSync } from '@powersync/react';
import { MapPinIcon } from '@heroicons/react/24/solid';
import { PlusIcon, CalendarDaysIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import MonthYearPicker from '../components/MonthYearPicker';
import ConfirmDeleteAllocationDialog from '../components/ConfirmDeleteAllocationDialog';
import { useWells } from '../hooks/useWells';
import { useWellAllocations, type Allocation } from '../hooks/useWellAllocations';
import { useWellReadings } from '../hooks/useWellReadings';
import { calculateUsageAf } from '../lib/usage-calculation';
import { useToastStore } from '../stores/toastStore';
import { useActiveFarm } from '../hooks/useActiveFarm';

function formatPeriodDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeUpdate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Updated Today';
  if (diffDays === 1) return 'Updated Yesterday';
  if (diffDays < 7) return `Updated ${diffDays} days ago`;
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function formatValue(val: string): string {
  const num = parseFloat(val || '0');
  return Number.isInteger(num) ? num.toString() : num.toFixed(2);
}

export default function WellAllocationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const db = usePowerSync();
  const { wells } = useWells();
  const { allocations } = useWellAllocations(id ?? null);
  const { readings } = useWellReadings(id ?? null);
  const { farmId: activeFarmId, farmName: activeFarmName } = useActiveFarm();
  const farmName = activeFarmName ?? '';
  const farmId = activeFarmId ?? '';

  const well = useMemo(() => wells.find((w) => w.id === id) ?? null, [wells, id]);

  // Static map URL
  const mapUrl = useMemo(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!well?.location || !token) return null;
    return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${well.location.longitude},${well.location.latitude},16,0/600x400@2x?access_token=${token}`;
  }, [well]);

  // Form visibility and selection
  const [formVisible, setFormVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Date picker visibility
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Form state
  const [formStartMonth, setFormStartMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [formStartYear, setFormStartYear] = useState(() => String(new Date().getFullYear()));
  const [formEndMonth, setFormEndMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [formEndYear, setFormEndYear] = useState(() => String(new Date().getFullYear()));
  const [formAllocatedAf, setFormAllocatedAf] = useState('');
  const [formStartingReading, setFormStartingReading] = useState('');
  const [formUsedAf, setFormUsedAf] = useState('');
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Validation + save state
  const [overlapError, setOverlapError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Computed start/end dates from picker state
  const formStart = useMemo(
    () => `${formStartYear}-${formStartMonth}-01`,
    [formStartYear, formStartMonth],
  );

  const formEnd = useMemo(() => {
    const monthIdx = parseInt(formEndMonth, 10) - 1;
    const yearNum = parseInt(formEndYear, 10);
    const lastDay = new Date(yearNum, monthIdx + 1, 0).getDate();
    return `${formEndYear}-${formEndMonth}-${String(lastDay).padStart(2, '0')}`;
  }, [formEndYear, formEndMonth]);

  // Auto-calculate usage when not manually overridden
  useEffect(() => {
    if (isManualOverride || !well) return;

    const startingVal = parseFloat(formStartingReading);
    if (isNaN(startingVal)) {
      setFormUsedAf('0.00');
      return;
    }

    // Find the latest reading within the period
    const readingsInPeriod = readings.filter(
      (r) => r.recordedAt >= formStart && r.recordedAt <= formEnd,
    );
    const latestReading = readingsInPeriod.length > 0 ? readingsInPeriod[0] : null;

    if (latestReading) {
      const autoUsed = calculateUsageAf(
        latestReading.value,
        formStartingReading,
        well.multiplier,
        well.units,
      );
      setFormUsedAf(autoUsed.toFixed(2));
    } else {
      setFormUsedAf('0.00');
    }
  }, [readings, formStartingReading, formStart, formEnd, well, isManualOverride]);

  // Reset form to defaults
  const resetForm = useCallback(() => {
    const n = new Date();
    setFormStartMonth(String(n.getMonth() + 1).padStart(2, '0'));
    setFormStartYear(String(n.getFullYear()));
    setFormEndMonth(String(n.getMonth() + 1).padStart(2, '0'));
    setFormEndYear(String(n.getFullYear()));
    setFormAllocatedAf('');
    setFormStartingReading('');
    setFormUsedAf('');
    setIsManualOverride(false);
    setOverlapError(null);
    setShowStartPicker(false);
    setShowEndPicker(false);
  }, []);

  // Handle row click (edit mode)
  const handleRowClick = useCallback(
    (allocation: Allocation) => {
      setSelectedId(allocation.id);
      setFormVisible(true);

      // Parse start date
      const startDate = new Date(allocation.periodStart + 'T00:00:00');
      setFormStartMonth(String(startDate.getMonth() + 1).padStart(2, '0'));
      setFormStartYear(String(startDate.getFullYear()));

      // Parse end date
      const endDate = new Date(allocation.periodEnd + 'T00:00:00');
      setFormEndMonth(String(endDate.getMonth() + 1).padStart(2, '0'));
      setFormEndYear(String(endDate.getFullYear()));

      setFormAllocatedAf(allocation.allocatedAf);
      setFormStartingReading(allocation.startingReading);
      setFormUsedAf(allocation.usedAf);
      setIsManualOverride(allocation.isManualOverride);
      setOverlapError(null);
      setShowStartPicker(false);
      setShowEndPicker(false);
    },
    [],
  );

  // Add new allocation
  const handleAddAllocation = useCallback(() => {
    resetForm();
    setSelectedId(null);
    setFormVisible(true);
  }, [resetForm]);

  // Close form
  const handleCloseForm = useCallback(() => {
    setFormVisible(false);
    setSelectedId(null);
    setOverlapError(null);
    setShowStartPicker(false);
    setShowEndPicker(false);
  }, []);

  // Overlap validation
  const checkOverlap = useCallback(
    (start: string, end: string): boolean => {
      return allocations
        .filter((a) => a.id !== selectedId)
        .some((a) => a.periodStart < end && a.periodEnd > start);
    },
    [allocations, selectedId],
  );

  // Save handler
  const handleSave = useCallback(async () => {
    setOverlapError(null);

    // Validate date order
    if (formStart > formEnd) {
      setOverlapError('End date must be on or after start date');
      return;
    }

    // Validate allocated AF
    const allocatedVal = parseFloat(formAllocatedAf);
    if (isNaN(allocatedVal) || allocatedVal <= 0) {
      setOverlapError('Allocated AF must be greater than 0');
      return;
    }

    // Check overlap
    if (checkOverlap(formStart, formEnd)) {
      setOverlapError('This period overlaps with an existing allocation');
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const usedVal = formUsedAf || '0';

      if (selectedId === null) {
        // Create new
        const allocationId = crypto.randomUUID();
        await db.execute(
          `INSERT INTO allocations (id, well_id, farm_id, period_start, period_end, allocated_af, used_af, is_manual_override, starting_reading, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            allocationId,
            id,
            farmId,
            formStart,
            formEnd,
            formAllocatedAf,
            usedVal,
            isManualOverride ? 1 : 0,
            formStartingReading || null,
            null,
            nowIso,
            nowIso,
          ],
        );
        useToastStore.getState().show('Allocation saved');
        setSelectedId(allocationId);
      } else {
        // Update existing
        await db.execute(
          `UPDATE allocations SET period_start = ?, period_end = ?, allocated_af = ?, used_af = ?, is_manual_override = ?, starting_reading = ?, updated_at = ? WHERE id = ?`,
          [
            formStart,
            formEnd,
            formAllocatedAf,
            usedVal,
            isManualOverride ? 1 : 0,
            formStartingReading || null,
            nowIso,
            selectedId,
          ],
        );
        useToastStore.getState().show('Allocation saved');
      }
    } catch {
      useToastStore.getState().show('Failed to save allocation', 'error');
    } finally {
      setSaving(false);
    }
  }, [
    formAllocatedAf,
    formStart,
    formEnd,
    formUsedAf,
    formStartingReading,
    isManualOverride,
    selectedId,
    id,
    farmId,
    db,
    checkOverlap,
  ]);

  // Delete handler
  const handleDeleteAllocation = useCallback(async () => {
    if (!selectedId) return;
    setDeleteLoading(true);
    try {
      await db.execute('DELETE FROM allocations WHERE id = ?', [selectedId]);
      useToastStore.getState().show('Allocation deleted');
      setFormVisible(false);
      setSelectedId(null);
    } catch {
      useToastStore.getState().show('Failed to delete allocation', 'error');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  }, [db, selectedId]);

  // Back navigation
  const handleBack = useCallback(() => {
    navigate(`/wells/${id}/edit`);
  }, [navigate, id]);

  // Find selected allocation for delete dialog label
  const selectedAllocation = useMemo(
    () => allocations.find((a) => a.id === selectedId) ?? null,
    [allocations, selectedId],
  );

  // Handle Used AF field change (manual override)
  const handleUsedAfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormUsedAf(e.target.value);
    setIsManualOverride(true);
  }, []);

  // Loading state
  if (!well && wells.length === 0) {
    return (
      <div className="h-full bg-[#5f7248] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#5f7248]">
      {/* Map preview with well info */}
      <div className="relative h-32 flex-shrink-0">
        {mapUrl ? (
          <img
            src={mapUrl}
            alt={`Satellite view of ${well?.name}`}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gray-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

        {/* Well info centered */}
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <MapPinIcon className="w-9 h-9 text-green-400 drop-shadow-lg" />
          {well && (
            <div>
              <h2 className="text-white font-bold text-xl leading-tight drop-shadow">{well.name}</h2>
              <p className="text-white/70 text-xs drop-shadow">{formatRelativeUpdate(well.updatedAt)}</p>
            </div>
          )}
        </div>

        {/* 30D chip top-right */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#5f7248]/90 border border-white/20 rounded px-2 py-1">
          <CalendarDaysIcon className="w-3.5 h-3.5 text-white/80" />
          <span className="text-white text-xs font-medium">30D</span>
          <ChevronDownIcon className="w-3 h-3 text-white/60" />
        </div>
      </div>

      {/* Title section */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        {farmName && <p className="text-white/70 text-xs">{farmName}</p>}
        <h2 className="text-white font-bold text-lg tracking-wide">EDIT WELL ALLOCATIONS</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Form area OR instruction text */}
        {formVisible ? (
          <div className="px-4 pb-4">
            <div className="bg-black/15 rounded-xl p-4 space-y-3">
              {/* Start Date */}
              <div>
                <label className="text-xs text-white/60 mb-1 block">Start Date</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowStartPicker(!showStartPicker);
                    setShowEndPicker(false);
                  }}
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white text-left"
                >
                  {formatPeriodDate(formStart)}
                </button>
                {showStartPicker && (
                  <div className="mt-2">
                    <MonthYearPicker
                      month={formStartMonth}
                      year={formStartYear}
                      onChange={(m, y) => {
                        setFormStartMonth(m);
                        setFormStartYear(y);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* End Date */}
              <div>
                <label className="text-xs text-white/60 mb-1 block">End Date</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowEndPicker(!showEndPicker);
                    setShowStartPicker(false);
                  }}
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white text-left"
                >
                  {formatPeriodDate(formEnd)}
                </button>
                {showEndPicker && (
                  <div className="mt-2">
                    <MonthYearPicker
                      month={formEndMonth}
                      year={formEndYear}
                      onChange={(m, y) => {
                        setFormEndMonth(m);
                        setFormEndYear(y);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Allocated AF */}
              <div>
                <label className="text-xs text-white/60 mb-1 block">Allocated (AF)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formAllocatedAf}
                  onChange={(e) => setFormAllocatedAf(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </div>

              {/* Starting Reading */}
              <div>
                <label className="text-xs text-white/60 mb-1 block">Starting Reading</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formStartingReading}
                  onChange={(e) => setFormStartingReading(e.target.value)}
                  placeholder="Baseline meter value"
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </div>

              {/* Used AF */}
              <div>
                <label className="text-xs text-white/60 mb-1 block">
                  Used (AF){isManualOverride && <span className="ml-1 text-yellow-400">M</span>}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formUsedAf}
                  onChange={handleUsedAfChange}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </div>

              {/* Overlap error */}
              {overlapError && (
                <p className="text-red-300 text-xs">{overlapError}</p>
              )}

              {/* Form actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 py-2.5 rounded-lg font-medium text-white/80 bg-white/10 active:bg-white/20 transition-colors"
                >
                  Close
                </button>
                {selectedId !== null && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="py-2.5 px-4 rounded-lg font-medium text-red-300 bg-white/10 active:bg-white/20 transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg font-medium text-white bg-[#3d5030] active:bg-[#334428] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <p className="text-white/60 text-sm">Select or Add an Allocation Below</p>
          </div>
        )}

        {/* Allocations table */}
        {allocations.length > 0 && (
          <div className="px-4 pb-4">
            <h3 className="text-white text-center text-sm font-medium mb-3">Allocations</h3>
            <table className="w-full border-collapse border border-white/30 text-sm">
              <thead>
                <tr>
                  <th className="border border-white/30 px-2.5 py-2 text-left text-xs text-white/60 font-medium">Start</th>
                  <th className="border border-white/30 px-2.5 py-2 text-left text-xs text-white/60 font-medium">End</th>
                  <th className="border border-white/30 px-2.5 py-2 text-left text-xs text-white/60 font-medium">Used (AF)</th>
                  <th className="border border-white/30 px-2.5 py-2 text-left text-xs text-white/60 font-medium">Allocated (AF)</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((allocation) => (
                  <tr
                    key={allocation.id}
                    onClick={() => handleRowClick(allocation)}
                    className={`cursor-pointer transition-colors ${
                      allocation.id === selectedId
                        ? 'bg-white/10'
                        : 'active:bg-white/5'
                    }`}
                  >
                    <td className="border border-white/30 px-2.5 py-2.5 text-[#e8937c]">
                      {allocation.isManualOverride && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-white text-[10px] font-bold mr-1.5 align-middle">M</span>
                      )}
                      {formatPeriodDate(allocation.periodStart)}
                    </td>
                    <td className="border border-white/30 px-2.5 py-2.5 text-[#e8937c]">
                      {formatPeriodDate(allocation.periodEnd)}
                    </td>
                    <td className="border border-white/30 px-2.5 py-2.5 text-[#e8937c]">
                      {formatValue(allocation.usedAf)}
                    </td>
                    <td className="border border-white/30 px-2.5 py-2.5 text-[#e8937c]">
                      {formatValue(allocation.allocatedAf)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {allocations.length === 0 && !formVisible && (
          <div className="text-center px-4 pb-4">
            <p className="text-white/50 text-sm">
              No allocations yet. Tap &apos;+ Add Allocation&apos; to create one.
            </p>
          </div>
        )}
      </div>

      {/* Fixed footer */}
      <div className="flex justify-between items-center px-4 py-4 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleBack}
          className="text-white text-sm font-medium active:opacity-70 transition-opacity"
        >
          Back to Well
        </button>
        <button
          type="button"
          onClick={handleAddAllocation}
          className="text-white text-sm font-medium flex items-center gap-1 active:opacity-70 transition-opacity"
        >
          <PlusIcon className="w-4 h-4" />
          Add Allocation
        </button>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDeleteAllocationDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAllocation}
        periodLabel={
          selectedAllocation
            ? `${formatPeriodDate(selectedAllocation.periodStart)} - ${formatPeriodDate(selectedAllocation.periodEnd)}`
            : ''
        }
        loading={deleteLoading}
      />
    </div>
  );
}
