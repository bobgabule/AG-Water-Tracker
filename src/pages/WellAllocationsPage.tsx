import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { usePowerSync } from '@powersync/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import MonthYearPicker from '../components/MonthYearPicker';
import ConfirmDeleteAllocationDialog from '../components/ConfirmDeleteAllocationDialog';
import { useWells } from '../hooks/useWells';
import { useWellAllocations, type Allocation } from '../hooks/useWellAllocations';
import { useWellReadings } from '../hooks/useWellReadings';
import { calculateUsageAf } from '../lib/usage-calculation';
import { useToastStore } from '../stores/toastStore';
import { useAuth } from '../lib/AuthProvider';

function formatPeriodDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function WellAllocationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const db = usePowerSync();
  const { wells } = useWells();
  const { allocations } = useWellAllocations(id ?? null);
  const { readings } = useWellReadings(id ?? null);
  const { onboardingStatus } = useAuth();
  const farmName = onboardingStatus?.farmName ?? '';
  const farmId = onboardingStatus?.farmId ?? '';

  const well = useMemo(() => wells.find((w) => w.id === id) ?? null, [wells, id]);

  // Form visibility and selection
  const [formVisible, setFormVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Date picker visibility
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Form state
  const now = new Date();
  const [formStartMonth, setFormStartMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [formStartYear, setFormStartYear] = useState(String(now.getFullYear()));
  const [formEndMonth, setFormEndMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [formEndYear, setFormEndYear] = useState(String(now.getFullYear()));
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
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-[#5f7248] p-4 pt-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-1 text-white"
            aria-label="Back to edit well"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <div>
            {farmName && <p className="text-white text-xs">{farmName}</p>}
            <h2 className="text-white font-bold text-lg tracking-wide">EDIT WELL ALLOCATIONS</h2>
            {well && (
              <p className="text-white/70 text-xs">
                {well.name} &middot; Updated {new Date(well.updatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 pb-[env(safe-area-inset-bottom)]">
        {/* Inline form */}
        {formVisible && (
          <div className="bg-gray-800 rounded-xl p-4 mb-4 space-y-3">
            {/* Start Date */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Start Date</label>
              <button
                type="button"
                onClick={() => {
                  setShowStartPicker(!showStartPicker);
                  setShowEndPicker(false);
                }}
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white text-left"
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
              <label className="text-xs text-gray-400 mb-1 block">End Date</label>
              <button
                type="button"
                onClick={() => {
                  setShowEndPicker(!showEndPicker);
                  setShowStartPicker(false);
                }}
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white text-left"
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
              <label className="text-xs text-gray-400 mb-1 block">Allocated (AF)</label>
              <input
                type="text"
                inputMode="decimal"
                value={formAllocatedAf}
                onChange={(e) => setFormAllocatedAf(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5f7248]"
              />
            </div>

            {/* Starting Reading */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Starting Reading</label>
              <input
                type="text"
                inputMode="decimal"
                value={formStartingReading}
                onChange={(e) => setFormStartingReading(e.target.value)}
                placeholder="Baseline meter value"
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5f7248]"
              />
            </div>

            {/* Used AF */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Used (AF){isManualOverride && <span className="ml-1 text-yellow-400">M</span>}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formUsedAf}
                onChange={handleUsedAfChange}
                placeholder="0.00"
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5f7248]"
              />
            </div>

            {/* Overlap error */}
            {overlapError && (
              <p className="text-red-400 text-xs">{overlapError}</p>
            )}

            {/* Form actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseForm}
                className="flex-1 py-2.5 rounded-lg font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              {selectedId !== null && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-2.5 px-4 rounded-lg font-medium text-red-400 bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg font-medium text-white bg-[#5f7248] hover:bg-[#506741] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Instruction text */}
        {!formVisible && allocations.length > 0 && (
          <p className="text-gray-400 text-sm text-center mb-3">
            Select or Add an Allocation Below
          </p>
        )}

        {/* Empty state */}
        {allocations.length === 0 && !formVisible && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">
              No allocations yet. Tap &apos;+ Add Allocation&apos; to create one.
            </p>
          </div>
        )}

        {/* Allocation table */}
        {allocations.length > 0 && (
          <div className="rounded-xl overflow-hidden mb-4">
            {/* Header row */}
            <div className="grid grid-cols-4 bg-gray-800 px-3 py-2 text-xs text-gray-400 font-medium">
              <span>Start</span>
              <span>End</span>
              <span className="text-right">Used (AF)</span>
              <span className="text-right">Allocated (AF)</span>
            </div>
            {/* Data rows */}
            {allocations.map((allocation) => (
              <button
                key={allocation.id}
                type="button"
                onClick={() => handleRowClick(allocation)}
                className={`w-full grid grid-cols-4 px-3 py-3 text-sm border-t border-gray-700 transition-colors ${
                  allocation.id === selectedId
                    ? 'bg-[#5f7248]/30 border-l-2 border-l-[#5f7248]'
                    : 'bg-gray-800/50 hover:bg-gray-700/50'
                }`}
              >
                <span className="text-white text-left">{formatPeriodDate(allocation.periodStart)}</span>
                <span className="text-white text-left">{formatPeriodDate(allocation.periodEnd)}</span>
                <span className="text-white text-right">
                  {allocation.isManualOverride && <span className="text-yellow-400 mr-1">M</span>}
                  {parseFloat(allocation.usedAf || '0').toFixed(2)}
                </span>
                <span className="text-white text-right">
                  {parseFloat(allocation.allocatedAf || '0').toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Add Allocation button */}
        <button
          type="button"
          onClick={handleAddAllocation}
          className="w-full py-3 rounded-xl border border-dashed border-gray-600 text-[#5f7248] font-medium hover:bg-gray-800 transition-colors"
        >
          + Add Allocation
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
