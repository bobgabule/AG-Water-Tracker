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
      <label className="text-xs text-white mb-1 block">{label}</label>
      <div className="flex rounded-lg overflow-hidden border border-[#89a267]">
        {options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`
              flex-1 px-3 py-2 text-sm font-medium transition-colors
              ${index < options.length - 1 ? 'border-r border-[#5f7248]' : ''}
              ${value === option.value
                ? 'bg-[#89a267] text-gray-900 font-semibold'
                : 'bg-gray-50 text-gray-500 hover:bg-[#89a267]'
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
