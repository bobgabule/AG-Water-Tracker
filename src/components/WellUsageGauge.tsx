import React from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import type { WellWithReading } from '../hooks/useWells';

interface WellUsageGaugeProps {
  well: WellWithReading;
  allocatedAf: string | null;
  usedAf: string | null;
}

/** Format AF value: whole numbers as integers, fractional with up to 2 decimals */
function formatAf(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const s = value.toFixed(2);
  // Trim trailing zeros: "1.50" → "1.5", "1.00" → "1"
  return s.replace(/\.?0+$/, '');
}

function isHealthy(state: string): boolean {
  return state === 'Ok';
}

/** Gauge fill color based on remaining percentage */
function getGaugeColor(remainingPercent: number): string {
  if (remainingPercent > 50) return '#83c8ac'; // green
  if (remainingPercent > 25) return '#e6b422'; // amber
  return '#e05555';                             // red
}

const WellUsageGauge = React.memo(function WellUsageGauge({
  well,
  allocatedAf,
  usedAf,
}: WellUsageGaugeProps) {
  const allocated = parseFloat(allocatedAf ?? '') || 0;
  const used = parseFloat(usedAf ?? '') || 0;
  const remaining = Math.max(0, allocated - used);
  const remainingPercent =
    allocated > 0 ? Math.min((remaining / allocated) * 100, 100) : 0;
  const gaugeColor = getGaugeColor(remainingPercent);

  const statusItems = [
    { label: 'Pump', healthy: isHealthy(well.pumpState) },
    { label: 'Battery', healthy: isHealthy(well.batteryState) },
    { label: 'Meter Status', healthy: isHealthy(well.meterStatus) },
  ];

  return (
    <div className="bg-surface-dark px-5 py-5">
      <div className="flex items-start gap-4">
        {/* Left column: Serial Number + WMIS */}
        <div className="flex-1 flex flex-col items-end">
          <div className="inline-block text-right pb-3 border-b border-[#d5e8bd]">
            <p className="text-[#d5e8bd] text-sm font-semibold">Serial Number</p>
            <p className="text-[#d5e8bd] text-sm font-semibold">
              {well.meterSerialNumber || '—'}
            </p>
          </div>
          <div className="inline-block text-right pt-3">
            <p className="text-[#d5e8bd] text-sm font-semibold">WMIS #</p>
            <p className="text-[#d5e8bd] text-sm font-semibold">
              {well.wmisNumber || '—'}
            </p>
          </div>
        </div>

        {/* Center: Vertical pill gauge — gas gauge style, full = all remaining */}
        <div className="flex-shrink-0 w-14 h-36 rounded-full bg-[#39432a] overflow-hidden relative border border-white/10 p-[3px]">
          <div className="w-full h-full rounded-full overflow-hidden relative">
            {remainingPercent > 0 && (
              <>
                {/* Fill from bottom */}
                <div
                  className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                  style={{ height: `${remainingPercent}%`, backgroundColor: gaugeColor }}
                />
                {/* Rounded cap at top of fill */}
                {remainingPercent > 8 && remainingPercent < 100 && (
                  <div
                    className="absolute left-0 right-0 h-4 rounded-t-full"
                    style={{ bottom: `calc(${remainingPercent}% - 0.5rem)`, backgroundColor: gaugeColor }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right column: Usage stats + Status indicators */}
        <div className="flex-1">
          <h3 className="inline-block text-white text-2xl font-semibold uppercase tracking-wide border-b border-[#d5e8bd] pb-2 mb-2">
            Usage
          </h3>
          <div className="space-y-1 mt-1">
            <p className="text-[#d5e8bd] text-sm">
              <span className="text-white font-semibold">
                {formatAf(allocated)}
              </span>{' '}
              Allocated (AF)
            </p>
            <p className="text-[#d5e8bd] text-sm">
              <span className="text-white font-semibold">
                {formatAf(used)}
              </span>{' '}
              Used (AF)
            </p>
            <div className="inline-block rounded px-2 py-0.5 mt-1 bg-[#586a40]">
              <span className="text-white text-sm font-semibold">
                {formatAf(remaining)} Remaining (AF)
              </span>
            </div>
          </div>

          {/* Status indicators — vertically stacked below usage stats */}
          <div className="mt-3 space-y-1.5">
            {statusItems.map(({ label, healthy }) => {
              const Icon = healthy ? CheckCircleIcon : XCircleIcon;
              const color = healthy ? 'text-green-400' : 'text-orange-400';
              return (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className={`w-5 h-5 ${color}`} aria-hidden="true" />
                  <span className="text-[#d5e8bd] text-sm font-semibold">{label}</span>
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
