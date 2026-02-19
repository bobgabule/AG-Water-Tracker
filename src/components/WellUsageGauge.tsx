import React from 'react';

interface WellUsageGaugeProps {
  allocatedAf: string;
  usedAf: string;
}

const WellUsageGauge = React.memo(function WellUsageGauge({
  allocatedAf,
  usedAf,
}: WellUsageGaugeProps) {
  const allocated = parseFloat(allocatedAf) || 0;
  const used = parseFloat(usedAf) || 0;
  const remaining = Math.max(0, allocated - used);
  const usedPercent =
    allocated > 0 ? Math.min((used / allocated) * 100, 100) : 0;

  const fillColor =
    usedPercent > 90
      ? 'bg-red-500'
      : usedPercent > 75
        ? 'bg-yellow-500'
        : 'bg-green-500';

  return (
    <div>
      <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide mb-3">
        Water Usage
      </h3>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-white/70">
          Used: <span className="text-white font-medium">{used.toFixed(2)} AF</span>
        </span>
        <span className="text-white/70">
          Remaining: <span className="text-white font-medium">{remaining.toFixed(2)} AF</span>
        </span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${fillColor} transition-all duration-300`}
          style={{ width: `${usedPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1.5">
        <span className="text-white/50">
          Allocated: {allocated.toFixed(2)} AF
        </span>
        <span className="text-white/50">{usedPercent.toFixed(1)}%</span>
      </div>
    </div>
  );
});

export default WellUsageGauge;
