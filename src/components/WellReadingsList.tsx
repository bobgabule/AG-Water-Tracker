import React from 'react';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { PlayIcon } from '@heroicons/react/24/solid';
import type { ReadingWithName } from '../hooks/useWellReadingsWithNames';

interface WellReadingsListProps {
  readings: ReadingWithName[];
  unitLabel: string;
  onReadingClick?: (reading: ReadingWithName) => void;
}

/** Map unit code to column header label */
function getColumnHeader(unitLabel: string): string {
  switch (unitLabel) {
    case 'GAL':
      return 'GALLONS';
    case 'CF':
      return 'CUBIC FEET';
    case 'AF':
      return 'ACRE-FEET';
    default:
      return unitLabel.toUpperCase();
  }
}

const WellReadingsList = React.memo(function WellReadingsList({
  readings,
  unitLabel,
  onReadingClick,
}: WellReadingsListProps) {
  const columnHeader = getColumnHeader(unitLabel);

  return (
    <div className="px-4 pt-5 pb-24">
      <h2 className="text-2xl font-bold text-white mb-4">READINGS</h2>

      {readings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <ClipboardDocumentListIcon className="w-10 h-10 text-white/30 mb-2" />
          <p className="text-sm text-white/60">No available readings</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="grid grid-cols-[5.5rem_1fr_1fr] text-xs text-white/50 font-semibold uppercase tracking-wide pb-2 border-b border-white/10">
            <span>Date</span>
            <span>{columnHeader}</span>
            <span>User / Time</span>
          </div>

          {/* Table rows */}
          <div>
            {readings.map((reading, index) => {
              const date = new Date(reading.recordedAt);
              const dateStr = date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
              });
              const timeStr = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              });

              const altBg = index % 2 === 0 ? 'bg-white/5' : '';
              const Row = onReadingClick ? 'button' : 'div';
              const rowProps = onReadingClick
                ? {
                    type: 'button' as const,
                    onClick: () => onReadingClick(reading),
                    className:
                      `grid grid-cols-[5.5rem_1fr_1fr] items-center py-3 w-full text-left active:bg-white/10 transition-colors ${altBg}`,
                  }
                : {
                    className:
                      `grid grid-cols-[5.5rem_1fr_1fr] items-center py-3 ${altBg}`,
                  };

              return (
                <Row key={reading.id} {...rowProps}>
                  <span className="text-white text-sm">{dateStr}</span>
                  <span className="text-white text-sm font-medium">
                    {reading.value}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">
                      {reading.recorderName} at {timeStr}
                    </span>
                    {!reading.isInRange && (
                      <PlayIcon
                        className="w-4 h-4 text-yellow-400 flex-shrink-0"
                        aria-label="Reading taken out of range"
                      />
                    )}
                  </div>
                </Row>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});

export default WellReadingsList;
