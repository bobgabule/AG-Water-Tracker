import React from 'react';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import type { ReadingWithName } from '../hooks/useWellReadingsWithNames';

interface WellReadingsListProps {
  readings: ReadingWithName[];
}

const WellReadingsList = React.memo(function WellReadingsList({
  readings,
}: WellReadingsListProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide mb-3">
        Readings History
      </h3>

      {readings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <ClipboardDocumentListIcon className="w-10 h-10 text-white/30 mb-2" />
          <p className="text-sm text-white/50">No readings yet</p>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {readings.map((reading) => {
            const date = new Date(reading.recordedAt);
            const dateStr = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeStr = date.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });

            return (
              <div
                key={reading.id}
                className="flex items-center py-3 first:pt-0 last:pb-0"
              >
                {/* Date & Time */}
                <div className="flex-shrink-0 w-24">
                  <p className="text-sm font-medium text-white">{dateStr}</p>
                  <p className="text-xs text-white/50">{timeStr}</p>
                </div>

                {/* Value */}
                <div className="flex-1 text-center">
                  <span className="text-lg font-semibold text-white">
                    {reading.value}
                  </span>
                </div>

                {/* User name & GPS indicator */}
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  <span className="text-xs text-white/70">
                    {reading.recorderName}
                  </span>
                  {!reading.isInRange && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-yellow-400 flex-shrink-0"
                      title="Out of range"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default WellReadingsList;
