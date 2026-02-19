import React from 'react';
import { ArrowLeftIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import WellStatusIndicators from './WellStatusIndicators';
import type { WellWithReading } from '../hooks/useWells';

interface WellDetailHeaderProps {
  well: WellWithReading | null;
  farmName: string;
  onClose: () => void;
  onEdit: () => void;
}

/**
 * Pinned header for the well detail sheet.
 * Displays farm name, well name, serial/WMIS/last-updated metadata,
 * and equipment status indicator chips.
 */
const WellDetailHeader = React.memo(function WellDetailHeader({
  well,
  farmName,
  onClose,
  onEdit,
}: WellDetailHeaderProps) {
  if (!well) {
    return (
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full active:bg-white/10 transition-colors"
            aria-label="Back to map"
          >
            <ArrowLeftIcon className="w-5 h-5 text-white" />
          </button>
          <span className="text-white/60 text-sm">Well not found</span>
          <div className="w-9" /> {/* Spacer for alignment */}
        </div>
      </div>
    );
  }

  // Format the last updated date
  const formattedDate = well.updatedAt
    ? new Date(well.updatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // Build metadata line: Serial # | WMIS # | Updated date
  const metaParts: string[] = [];
  if (well.meterSerialNumber) metaParts.push(well.meterSerialNumber);
  if (well.wmisNumber) metaParts.push(well.wmisNumber);
  if (formattedDate) metaParts.push(`Updated ${formattedDate}`);
  const metaLine = metaParts.join(' \u00B7 ');

  return (
    <div className="px-4 pt-4 pb-3 space-y-2">
      {/* Row 1: Back button, Farm Name, Edit button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full active:bg-white/10 transition-colors"
          aria-label="Back to map"
        >
          <ArrowLeftIcon className="w-5 h-5 text-white" />
        </button>
        <span className="text-white/80 text-sm font-medium truncate mx-2">
          {farmName}
        </span>
        <button
          onClick={onEdit}
          className="p-2 -mr-2 rounded-full active:bg-white/10 transition-colors"
          aria-label="Edit well"
        >
          <PencilSquareIcon className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Row 2: Well Name */}
      <h1 className="text-white text-xl font-bold leading-tight">{well.name}</h1>

      {/* Row 3: Serial # | WMIS # | Last Updated */}
      {metaLine && (
        <p className="text-white/60 text-xs leading-relaxed">{metaLine}</p>
      )}

      {/* Row 4: Status indicator chips */}
      <WellStatusIndicators
        pumpState={well.pumpState}
        batteryState={well.batteryState}
        meterStatus={well.meterStatus}
      />
    </div>
  );
});

export default WellDetailHeader;
