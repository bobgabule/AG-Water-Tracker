import { memo } from 'react';

interface SegmentedControlProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export default memo(function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <div role="group" aria-label={label}>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`
              flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                value === option.value
                  ? 'bg-gray-200 text-gray-900'
                  : 'bg-transparent border border-gray-200 text-gray-600 hover:bg-gray-50'
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
