import { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { useSwipeable } from 'react-swipeable';
import WellDetailHeader from './WellDetailHeader';
import { useWellProximityOrder } from '../hooks/useWellProximityOrder';
import type { WellWithReading } from '../hooks/useWells';

interface WellDetailSheetProps {
  wellId: string;
  wells: WellWithReading[];
  farmName: string;
  onClose: () => void;
  onEdit: () => void;
  onWellChange: (wellId: string) => void;
}

export default function WellDetailSheet({
  wellId,
  wells,
  farmName,
  onClose,
  onEdit,
  onWellChange,
}: WellDetailSheetProps) {
  const orderedWells = useWellProximityOrder(wellId, wells);
  const currentIndex = useMemo(
    () => orderedWells.findIndex((w) => w.id === wellId),
    [orderedWells, wellId],
  );
  const currentWell = orderedWells[currentIndex] ?? null;

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
              <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {/* Content sections will be added in Plan 02 */}
                <p className="text-white/50 text-sm">Well detail content loading...</p>
              </div>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
