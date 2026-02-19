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
      <h2 className="text-2xl font-bold text-gray-900 mb-4">READINGS</h2>

      {readings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <ClipboardDocumentListIcon className="w-10 h-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No readings yet</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="grid grid-cols-[5.5rem_1fr_1fr] text-xs text-gray-400 font-semibold uppercase tracking-wide pb-2 border-b border-gray-200">
            <span>Date</span>
            <span>{columnHeader}</span>
            <span>User / Time</span>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-gray-100">
            {readings.map((reading) => {
              const date = new Date(reading.recordedAt);
              const dateStr = date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
              });
              const timeStr = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              });

              const Row = onReadingClick ? 'button' : 'div';
              const rowProps = onReadingClick
                ? {
                    type: 'button' as const,
                    onClick: () => onReadingClick(reading),
                    className:
                      'grid grid-cols-[5.5rem_1fr_1fr] items-center py-3 w-full text-left active:bg-gray-50 transition-colors',
                  }
                : {
                    className:
                      'grid grid-cols-[5.5rem_1fr_1fr] items-center py-3',
                  };

              return (
                <Row key={reading.id} {...rowProps}>
                  <span className="text-gray-900 text-sm">{dateStr}</span>
                  <span className="text-gray-900 text-sm font-medium">
                    {reading.value}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">
                      {reading.recorderName} at {timeStr}
                    </span>
                    {!reading.isInRange && (
                      <PlayIcon
                        className="w-4 h-4 text-orange-400 flex-shrink-0"
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
