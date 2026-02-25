import React from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import type { WellWithReading } from '../hooks/useWells';

interface WellUsageGaugeProps {
  well: WellWithReading;
  allocatedAf: string | null;
  usedAf: string | null;
  unitLabel: string;
}

function getUnitDisplayName(unit: string): string {
  switch (unit) {
    case 'GAL': return 'Gallons';
    case 'CF': return 'Cubic Feet';
    case 'AF': return 'AF';
    default: return unit;
  }
}

function isHealthy(state: string): boolean {
  return state === 'Ok';
}

const WellUsageGauge = React.memo(function WellUsageGauge({
  well,
  allocatedAf,
  usedAf,
  unitLabel,
}: WellUsageGaugeProps) {
  const unitDisplayName = getUnitDisplayName(unitLabel);
  const allocated = parseFloat(allocatedAf ?? '') || 0;
  const used = parseFloat(usedAf ?? '') || 0;
  const remaining = Math.max(0, allocated - used);
  const remainingPercent =
    allocated > 0 ? Math.min((remaining / allocated) * 100, 100) : 0;
  const GAUGE_COLOR = '#82c8ac';

  const statusItems = [
    { label: 'Pump', healthy: isHealthy(well.pumpState) },
    { label: 'Battery', healthy: isHealthy(well.batteryState) },
    { label: 'Meter Status', healthy: isHealthy(well.meterStatus) },
  ];

  return (
    <div className="bg-surface-dark px-5 py-5">
      <div className="flex items-start gap-4">
        {/* Left column: Serial Number + WMIS */}
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-white/50 text-xs font-medium">Serial Number</p>
            <p className="text-white text-sm font-semibold">
              {well.meterSerialNumber || '—'}
            </p>
          </div>
          <div>
            <p className="text-white/50 text-xs font-medium">WMIS #</p>
            <p className="text-white text-sm font-semibold">
              {well.wmisNumber || '—'}
            </p>
          </div>
        </div>

        {/* Center: Vertical pill gauge — gas gauge style, full = all remaining */}
        <div className="flex-shrink-0 w-14 h-36 rounded-full bg-surface-darkest overflow-hidden relative border border-white/10">
          {remainingPercent > 0 && (
            <>
              {/* Fill from bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                style={{ height: `${remainingPercent}%`, backgroundColor: GAUGE_COLOR }}
              />
              {/* Rounded cap at top of fill */}
              {remainingPercent > 8 && remainingPercent < 100 && (
                <div
                  className="absolute left-0 right-0 h-4 rounded-t-full"
                  style={{ bottom: `calc(${remainingPercent}% - 0.5rem)`, backgroundColor: GAUGE_COLOR }}
                />
              )}
            </>
          )}
        </div>

        {/* Right column: Usage stats + Status indicators */}
        <div className="flex-1">
          <h3 className="text-white font-bold text-base uppercase tracking-wide">
            Usage
          </h3>
          <div className="space-y-1 mt-1">
            <p className="text-white/80 text-sm">
              <span className="text-white font-semibold">
                {Math.round(allocated)}
              </span>{' '}
              {unitDisplayName} Allocated
            </p>
            <p className="text-white/80 text-sm">
              <span className="text-white font-semibold">
                {Math.round(used)}
              </span>{' '}
              {unitDisplayName} Used
            </p>
            <div className="inline-block rounded px-2 py-0.5 mt-1" style={{ backgroundColor: GAUGE_COLOR + 'CC' }}>
              <span className="text-white text-sm font-semibold">
                {Math.round(remaining)} {unitDisplayName} Left
              </span>
            </div>
          </div>

          {/* Status indicators — vertically stacked below usage stats */}
          <div className="mt-3 space-y-1.5">
            {statusItems.map(({ label, healthy }) => {
              const Icon = healthy ? CheckCircleIcon : XCircleIcon;
              const color = healthy ? 'text-green-400' : 'text-red-400';
              return (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className={`w-5 h-5 ${color}`} aria-hidden="true" />
                  <span className="text-white text-sm">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

export default WellUsageGauge;
