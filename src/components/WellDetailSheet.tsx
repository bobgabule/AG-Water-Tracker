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

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return `Today at ${timeStr}`;
  if (diffDays === 1) return `Yesterday at ${timeStr}`;
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${monthDay} at ${timeStr}`;
}

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

  // Calculate usage: latest reading minus starting reading, converted to AF
  const currentYearUsageAf = useMemo(() => {
    if (!well || readings.length === 0) return '0';

    // Latest reading (readings are sorted DESC by recorded_at)
    const latest = readings[0];

    // Baseline: prefer allocation's starting_reading, else earliest reading this year
    let baseline: string;
    if (currentAllocation?.startingReading) {
      baseline = currentAllocation.startingReading;
    } else {
      const currentYear = new Date().getFullYear();
      const yearReadings = readings.filter(
        (r) => new Date(r.recordedAt).getFullYear() === currentYear,
      );
      if (yearReadings.length < 2) return '0';
      baseline = yearReadings[yearReadings.length - 1].value;
    }

    const usage = calculateUsageAf(
      latest.value,
      baseline,
      well.multiplier,
      well.units,
    );
    return usage.toFixed(2);
  }, [readings, well, currentAllocation]);

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

  const lastReadingDate = readings.length > 0 ? readings[0].recordedAt : null;

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
      <div className="fixed inset-0 z-40 flex flex-col bg-surface-dark">
        {/* Fixed header area — does not scroll */}
        <div className="flex-shrink-0">
          <WellDetailHeader
            well={well}
            farmName={farmName}
            proximityInRange={proximityInRange}
            onClose={onClose}
            onEdit={onEdit}
          />

          {well && (
            <>
              {/* Last Updated — between header and gauge */}
              {lastReadingDate && (
                <p className="text-[#d5e8bd]/70 text-xs text-center py-2 bg-surface-dark">
                  Last Updated {formatRelativeDate(lastReadingDate)}
                </p>
              )}

              {/* Usage gauge + serial/WMIS */}
              <WellUsageGauge
                well={well}
                allocatedAf={currentAllocation?.allocatedAf ?? '0'}
                usedAf={currentYearUsageAf}
              />
            </>
          )}
        </div>

        {/* Scrollable readings list — only this area scrolls */}
        {well && (
          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-green">
            <WellReadingsList
              readings={readings}
              unitLabel={well.units}
              onReadingClick={handleReadingClick}
            />
          </div>
        )}

        {/* Fixed bottom: New Reading button */}
        <div className="flex-shrink-0 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 bg-surface-dark">
          <button
            type="button"
            onClick={onNewReading}
            className="w-full bg-btn-confirm text-btn-confirm-text rounded-full font-bold text-base py-3 flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
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
