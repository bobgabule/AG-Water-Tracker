import React from 'react';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { FlagIcon } from '@heroicons/react/24/solid';
import { useTranslation } from '../hooks/useTranslation';
import type { ReadingWithName } from '../hooks/useWellReadingsWithNames';

interface WellReadingsListProps {
  readings: ReadingWithName[];
  unitLabel: string;
  onReadingClick?: (reading: ReadingWithName) => void;
}

/** Map unit code to translated column header label */
function getColumnHeader(unitLabel: string, t: (key: string) => string): string {
  switch (unitLabel) {
    case 'GAL':
      return t('well.unitType.galHeader');
    case 'CF':
      return t('well.unitType.cfHeader');
    case 'AF':
      return t('well.unitType.afHeader');
    default:
      return unitLabel.toUpperCase();
  }
}

const WellReadingsList = React.memo(function WellReadingsList({
  readings,
  unitLabel,
  onReadingClick,
}: WellReadingsListProps) {
  const { t, locale } = useTranslation();
  const columnHeader = getColumnHeader(unitLabel, t);

  return (
    <div className="px-4 pt-5 pb-4">
      <h2 className="text-2xl font-bold text-white mb-4">{t('reading.title')}</h2>

      {readings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <ClipboardDocumentListIcon className="w-10 h-10 text-white/30 mb-2" />
          <p className="text-sm text-white/60">{t('reading.noReadings')}</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="grid grid-cols-[5.5rem_1fr_1fr] text-xs text-[#acbc97] font-semibold uppercase tracking-wide py-2 px-1 bg-[#4b5b37] rounded">
            <span>{t('reading.dateHeader')}</span>
            <span>{columnHeader}</span>
            <span>{t('reading.userTimeHeader')}</span>
          </div>

          {/* Table rows */}
          <div>
            {readings.map((reading, index) => {
              const date = new Date(reading.recordedAt);
              const dateStr = date.toLocaleDateString(locale, {
                month: 'long',
                day: 'numeric',
              });
              const timeStr = date.toLocaleTimeString(locale, {
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
                  <span className="text-[#d5e8bd] text-sm">{dateStr}</span>
                  <span className="text-[#d5e8bd] text-sm font-medium">
                    {reading.value}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-[#d5e8bd]/70 text-sm">
                      {reading.recorderName} at {timeStr}
                    </span>
                    {reading.isSimilarReading && (
                      <FlagIcon
                        className="w-4 h-4 text-orange-400 flex-shrink-0"
                        role="img"
                        aria-label="Similar reading flagged"
                      />
                    )}
                    {!reading.isInRange && (
                      <FlagIcon
                        className="w-4 h-4 text-yellow-400 flex-shrink-0"
                        role="img"
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
