import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useTranslation } from '../hooks/useTranslation';
import type { ReadingWithName } from '../hooks/useWellReadingsWithNames';
import WellDetailHeader from './WellDetailHeader';
import WellUsageGauge from './WellUsageGauge';
import WellReadingsList from './WellReadingsList';
import { useWellAllocations } from '../hooks/useWellAllocations';
import { useWellReadingsWithNames } from '../hooks/useWellReadingsWithNames';
import { useGeolocation } from '../hooks/useGeolocation';
import { getDistanceToWell, isInRange } from '../lib/gps-proximity';
import { calculateUsageAf } from '../lib/usage-calculation';
import type { WellWithReading } from '../hooks/useWells';

function formatRelativeDate(isoDate: string, t: (key: string, params?: Record<string, string | number>) => string, locale: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const timeStr = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t('time.todayAt', { time: timeStr });
  if (diffDays === 1) return t('time.yesterdayAt', { time: timeStr });
  const monthDay = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  return t('time.dateAt', { date: monthDay, time: timeStr });
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
  const { t, locale } = useTranslation();
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
  // Falls back to stored used_af from allocation when readings can't produce a value
  const currentYearUsageAf = useMemo(() => {
    const storedUsedAf = currentAllocation?.usedAf ?? '0';

    if (!well || readings.length === 0) return storedUsedAf;

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
      if (yearReadings.length < 2) return storedUsedAf;
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

  const navigate = useNavigate();

  const lastReadingDate = readings.length > 0 ? readings[0].recordedAt : null;

  const handleReadingClick = useCallback((reading: ReadingWithName) => {
    if (!well) return;
    navigate(`/wells/${well.id}/readings/${reading.id}`, { viewTransition: true });
  }, [navigate, well]);

  return (
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
                  {t('wellDetail.lastUpdated', { date: formatRelativeDate(lastReadingDate, t, locale) })}
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
            {t('reading.newReading')}
          </button>
        </div>
      </div>
  );
}
