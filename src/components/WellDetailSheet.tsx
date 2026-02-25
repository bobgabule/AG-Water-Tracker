import { useState, useCallback, useMemo } from 'react';
import { PlusIcon } from '@heroicons/react/24/solid';
import type { ReadingWithName } from '../hooks/useWellReadingsWithNames';
import WellDetailHeader from './WellDetailHeader';
import WellUsageGauge from './WellUsageGauge';
import WellReadingsList from './WellReadingsList';
import EditReadingSheet from './EditReadingSheet';
import { useWellAllocations } from '../hooks/useWellAllocations';
import { useWellReadingsWithNames } from '../hooks/useWellReadingsWithNames';
import { useGeolocation } from '../hooks/useGeolocation';
import { getDistanceToWell, isInRange } from '../lib/gps-proximity';
import { calculateUsageAf } from '../lib/usage-calculation';
import type { WellWithReading } from '../hooks/useWells';

interface WellDetailSheetProps {
  well: WellWithReading | null;
  farmName: string;
  onClose: () => void;
  onEdit?: () => void;
  onNewReading: () => void;
}

export default function WellDetailSheet({
  well,
  farmName,
  onClose,
  onEdit,
  onNewReading,
}: WellDetailSheetProps) {
  const { allocations } = useWellAllocations(well?.id ?? null);
  const { readings } = useWellReadingsWithNames(well?.id ?? null);
  const { location: userLocation } = useGeolocation({ autoRequest: false });

  // Find current allocation (period encompassing today, or fallback to most recent)
  const currentAllocation = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (
      allocations.find((a) => a.periodStart <= today && a.periodEnd >= today) ??
      allocations[0] ??
      null
    );
  }, [allocations]);

  // Calculate usage from current calendar year readings only
  const currentYearUsageAf = useMemo(() => {
    if (!well || readings.length === 0) return '0';
    const currentYear = new Date().getFullYear();
    const yearReadings = readings.filter(
      (r) => new Date(r.recordedAt).getFullYear() === currentYear,
    );
    // Need 2+ readings to calculate usage delta (earliest as baseline, latest as current)
    if (yearReadings.length < 2) return '0';
    // readings are sorted DESC — last element is earliest, first is latest
    const earliest = yearReadings[yearReadings.length - 1];
    const latest = yearReadings[0];
    const usage = calculateUsageAf(
      latest.value,
      earliest.value,
      well.multiplier,
      well.units,
    );
    return usage.toFixed(2);
  }, [readings, well]);

  // GPS proximity
  const proximityInRange = useMemo(() => {
    if (!userLocation || !well?.location) return null;
    const dist = getDistanceToWell(
      { lat: userLocation.lat, lng: userLocation.lng },
      {
        latitude: well.location.latitude,
        longitude: well.location.longitude,
      },
    );
    return isInRange(dist);
  }, [userLocation, well?.location]);

  const [selectedReading, setSelectedReading] = useState<ReadingWithName | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const handleReadingClick = useCallback((reading: ReadingWithName) => {
    setSelectedReading(reading);
    setEditSheetOpen(true);
  }, []);

  const handleEditClose = useCallback(() => {
    setEditSheetOpen(false);
    setSelectedReading(null);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-40 flex flex-col bg-white">
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Map header with satellite image */}
          <WellDetailHeader
            well={well}
            farmName={farmName}
            proximityInRange={proximityInRange}
            onClose={onClose}
            onEdit={onEdit}
          />

          {well && (
            <>
              {/* Usage gauge + serial/WMIS */}
              <WellUsageGauge
                well={well}
                allocatedAf={currentAllocation?.allocatedAf ?? '0'}
                usedAf={currentYearUsageAf}
              />

              {/* Readings table on white background */}
              <WellReadingsList
                readings={readings}
                unitLabel={well.units}
                onReadingClick={handleReadingClick}
              />
            </>
          )}
        </div>

        {/* Fixed bottom: New Reading button */}
        <div className="flex-shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 bg-white border-t border-gray-100">
          <button
            type="button"
            onClick={onNewReading}
            className="w-full bg-btn-action text-white rounded-full font-bold text-base py-3 flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
          >
            <PlusIcon className="w-5 h-5" />
            New Reading
          </button>
        </div>
      </div>

      {/* Edit reading modal */}
      {editSheetOpen && selectedReading && well && (
        <EditReadingSheet
          open={editSheetOpen}
          onClose={handleEditClose}
          reading={selectedReading}
          wellUnits={well.units}
          wellMultiplier={well.multiplier}
        />
      )}
    </>
  );
}
