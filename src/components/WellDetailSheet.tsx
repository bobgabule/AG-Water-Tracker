import { useState, useCallback, useMemo } from 'react';
import type { ReadingWithName } from '../hooks/useWellReadingsWithNames';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { useSwipeable } from 'react-swipeable';
import { MapPinIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/solid';
import WellDetailHeader from './WellDetailHeader';
import WellUsageGauge from './WellUsageGauge';
import WellReadingsList from './WellReadingsList';
import EditReadingSheet from './EditReadingSheet';
import { useWellProximityOrder } from '../hooks/useWellProximityOrder';
import { useWellAllocations } from '../hooks/useWellAllocations';
import { useWellReadingsWithNames } from '../hooks/useWellReadingsWithNames';
import { useGeolocation } from '../hooks/useGeolocation';
import { getDistanceToWell, isInRange } from '../lib/gps-proximity';
import type { WellWithReading } from '../hooks/useWells';

interface WellDetailSheetProps {
  wellId: string;
  wells: WellWithReading[];
  farmName: string;
  onClose: () => void;
  onEdit: () => void;
  onWellChange: (wellId: string) => void;
  onNewReading: () => void;
}

export default function WellDetailSheet({
  wellId,
  wells,
  farmName,
  onClose,
  onEdit,
  onWellChange,
  onNewReading,
}: WellDetailSheetProps) {
  const orderedWells = useWellProximityOrder(wellId, wells);
  const currentIndex = useMemo(
    () => orderedWells.findIndex((w) => w.id === wellId),
    [orderedWells, wellId],
  );
  const currentWell = orderedWells[currentIndex] ?? null;

  const { allocations } = useWellAllocations(currentWell?.id ?? null);
  const { readings } = useWellReadingsWithNames(currentWell?.id ?? null);
  const { location: userLocation } = useGeolocation({ autoRequest: false });

  // Find current allocation (most recent period that encompasses today, or fallback to most recent)
  const currentAllocation = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (
      allocations.find((a) => a.periodStart <= today && a.periodEnd >= today) ??
      allocations[0] ??
      null
    );
  }, [allocations]);

  // GPS proximity
  const proximityInfo = useMemo(() => {
    if (!userLocation || !currentWell?.location) return null;
    const dist = getDistanceToWell(
      { lat: userLocation.lat, lng: userLocation.lng },
      {
        latitude: currentWell.location.latitude,
        longitude: currentWell.location.longitude,
      },
    );
    return { distance: dist, inRange: isInRange(dist) };
  }, [userLocation, currentWell?.location]);

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

  const [transitioning, setTransitioning] = useState(false);

  const navigateToWell = useCallback(
    (direction: 'next' | 'prev') => {
      if (orderedWells.length <= 1) return;
      const targetIndex =
        direction === 'next'
          ? (currentIndex + 1) % orderedWells.length
          : (currentIndex - 1 + orderedWells.length) % orderedWells.length;

      setTransitioning(true);
      setTimeout(() => setTransitioning(false), 150);
      onWellChange(orderedWells[targetIndex].id);
    },
    [orderedWells, currentIndex, onWellChange],
  );

  const swipeHandlers = useSwipeable({
    onSwipedDown: (e) => {
      if (e.absY > 80) onClose();
    },
    onSwipedLeft: () => navigateToWell('next'),
    onSwipedRight: () => navigateToWell('prev'),
    delta: 40,
    trackTouch: true,
    trackMouse: false,
    preventScrollOnSwipe: false,
  });

  return (
    <>
    <Dialog open={true} onClose={() => {}} static className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/40" />
      <div className="fixed inset-0 flex flex-col">
        {/* Top peek area (~10% = dark background visible) */}
        <div className="h-[10vh]" />
        {/* Sheet panel (90%) */}
        <DialogPanel
          transition
          className="flex-1 bg-[#5f7248] rounded-t-2xl shadow-xl flex flex-col
            transition duration-300 ease-out data-[closed]:translate-y-full overflow-hidden"
        >
          {/* Swipeable header area */}
          <div {...swipeHandlers} className="flex-shrink-0">
            <WellDetailHeader
              well={currentWell}
              farmName={farmName}
              onClose={onClose}
              onEdit={onEdit}
            />
          </div>
          {/* Scrollable content area with cross-fade */}
          <div
            className={`flex-1 overflow-y-auto transition-opacity duration-150 ${
              transitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {currentWell && (
              <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-6">
                {/* GPS Proximity indicator */}
                {proximityInfo && (
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      proximityInfo.inRange
                        ? 'bg-green-500/20'
                        : 'bg-yellow-500/20'
                    }`}
                  >
                    <MapPinIcon
                      className={`w-5 h-5 ${
                        proximityInfo.inRange
                          ? 'text-green-400'
                          : 'text-yellow-400'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        proximityInfo.inRange
                          ? 'text-green-300'
                          : 'text-yellow-300'
                      }`}
                    >
                      {proximityInfo.inRange ? 'In Range' : 'Out of Range'}
                      <span className="text-white/50 font-normal ml-1.5">
                        ({Math.round(proximityInfo.distance)} ft)
                      </span>
                    </span>
                  </div>
                )}

                {/* Usage Gauge or Missing Allocation */}
                {currentAllocation ? (
                  <WellUsageGauge
                    allocatedAf={currentAllocation.allocatedAf}
                    usedAf={currentAllocation.usedAf}
                  />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-white/5">
                    <InformationCircleIcon className="w-5 h-5 text-white/40" />
                    <span className="text-sm text-white/50">
                      No allocation set for this well
                    </span>
                  </div>
                )}

                {/* Readings History */}
                <WellReadingsList readings={readings} onReadingClick={handleReadingClick} />
              </div>
            )}
          </div>
          {/* Fixed footer button */}
          <div className="flex-shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onNewReading}
              className="w-full bg-[#bdefda] text-[#506741] rounded-lg font-bold text-base py-3 flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              + New Reading
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>

    {editSheetOpen && selectedReading && currentWell && (
      <EditReadingSheet
        open={editSheetOpen}
        onClose={handleEditClose}
        reading={selectedReading}
        wellUnits={currentWell.units}
        wellMultiplier={currentWell.multiplier}
      />
    )}
    </>
  );
}
