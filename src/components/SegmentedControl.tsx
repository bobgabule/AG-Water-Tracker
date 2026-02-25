import { memo } from 'react';

interface SegmentedControlProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default memo(function SegmentedControl({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedControlProps) {
  return (
    <div role="group" aria-label={label} className={disabled ? 'opacity-60' : ''}>
      <label className="text-xs text-white mb-1 block">{label}</label>
      <div className="flex rounded-lg overflow-hidden border border-control-active">
        {options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`
              flex-1 px-3 py-2 text-sm font-medium transition-colors
              ${index < options.length - 1 ? 'border-r border-surface-header' : ''}
              ${value === option.value
                ? 'bg-control-active text-white font-semibold'
                : 'bg-gray-50 text-gray-500 hover:bg-control-active hover:text-white'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
});
