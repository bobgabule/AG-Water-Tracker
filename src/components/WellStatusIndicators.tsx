import React from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/solid';

interface StatusConfig {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  label: string;
}

function getStatusConfig(state: string): StatusConfig {
  switch (state) {
    case 'Ok':
      return { icon: CheckCircleIcon, color: 'text-green-400', label: 'OK' };
    case 'Low':
      return { icon: ExclamationTriangleIcon, color: 'text-yellow-400', label: 'Low' };
    case 'Critical':
      return { icon: XCircleIcon, color: 'text-red-400', label: 'Critical' };
    case 'Dead':
      return { icon: XCircleIcon, color: 'text-red-600', label: 'Dead' };
    default:
      return { icon: QuestionMarkCircleIcon, color: 'text-gray-400', label: 'Unknown' };
  }
}

interface WellStatusIndicatorsProps {
  pumpState: string;
  batteryState: string;
  meterStatus: string;
}

const WellStatusIndicators = React.memo(function WellStatusIndicators({
  pumpState,
  batteryState,
  meterStatus,
}: WellStatusIndicatorsProps) {
  const pump = getStatusConfig(pumpState);
  const battery = getStatusConfig(batteryState);
  const meter = getStatusConfig(meterStatus);

  return (
    <div className="flex gap-3 flex-wrap">
      {[
        { label: 'Pump', config: pump },
        { label: 'Battery', config: battery },
        { label: 'Meter', config: meter },
      ].map(({ label, config }) => {
        const Icon = config.icon;
        return (
          <div
            key={label}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10"
          >
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className="text-xs text-white/80">
              {label}: {config.label}
            </span>
          </div>
        );
      })}
    </div>
  );
});

export default WellStatusIndicators;
