import React from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface WellStatusIndicatorsProps {
  pumpState: string;
  batteryState: string;
  meterStatus: string;
}

function isHealthy(state: string): boolean {
  return state === 'Ok';
}

const WellStatusIndicators = React.memo(function WellStatusIndicators({
  pumpState,
  batteryState,
  meterStatus,
}: WellStatusIndicatorsProps) {
  const items = [
    { label: 'Pump', healthy: isHealthy(pumpState) },
    { label: 'Battery', healthy: isHealthy(batteryState) },
    { label: 'Meter Status', healthy: isHealthy(meterStatus) },
  ];

  return (
    <div className="bg-[#3a4a2a] px-5 pb-5">
      <div className="flex flex-col gap-2">
        {items.map(({ label, healthy }) => {
          const Icon = healthy ? CheckCircleIcon : XCircleIcon;
          const color = healthy ? 'text-green-400' : 'text-red-400';
          return (
            <div
              key={label}
              className="flex items-center gap-1.5"
              aria-label={`${label}: ${healthy ? 'OK' : 'Issue'}`}
            >
              <Icon className={`w-5 h-5 ${color}`} aria-hidden="true" />
              <span className="text-white text-sm">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default WellStatusIndicators;
