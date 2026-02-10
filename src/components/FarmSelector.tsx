import React, { useMemo, useCallback } from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronUpDownIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';
import { useActiveFarm } from '../hooks/useActiveFarm';
import { useActiveFarmStore } from '../stores/activeFarmStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FarmRow {
  id: string;
  name: string;
}

interface FarmOption {
  id: string;
  name: string;
  isOwnFarm: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FarmSelector = React.memo(function FarmSelector() {
  const { onboardingStatus } = useAuth();
  const { farmId: activeFarmId, farmName: activeFarmName, isOverride } = useActiveFarm();
  const setActiveFarm = useActiveFarmStore((s) => s.setActiveFarm);
  const clearOverride = useActiveFarmStore((s) => s.clearOverride);

  const ownFarmId = onboardingStatus?.farmId ?? null;
  const ownFarmName = onboardingStatus?.farmName ?? 'My Farm';

  // Query all farms for the dropdown
  const { data: rawFarms } = useQuery<FarmRow>(
    'SELECT id, name FROM farms ORDER BY name ASC'
  );

  // Build options list with "My Farm" at top
  const options: FarmOption[] = useMemo(() => {
    if (!rawFarms || rawFarms.length === 0) {
      // Fallback: at least show own farm
      if (ownFarmId) {
        return [{ id: ownFarmId, name: ownFarmName, isOwnFarm: true }];
      }
      return [];
    }

    const result: FarmOption[] = [];

    // Own farm first
    if (ownFarmId) {
      const ownFromData = rawFarms.find((f) => f.id === ownFarmId);
      result.push({
        id: ownFarmId,
        name: ownFromData?.name ?? ownFarmName,
        isOwnFarm: true,
      });
    }

    // Other farms
    for (const farm of rawFarms) {
      if (farm.id !== ownFarmId) {
        result.push({ id: farm.id, name: farm.name, isOwnFarm: false });
      }
    }

    return result;
  }, [rawFarms, ownFarmId, ownFarmName]);

  // Currently selected option
  const selectedOption = useMemo(() => {
    if (!activeFarmId) return options[0] ?? null;
    return options.find((o) => o.id === activeFarmId) ?? options[0] ?? null;
  }, [options, activeFarmId]);

  const handleChange = useCallback(
    (option: FarmOption | null) => {
      if (!option) return;
      if (option.isOwnFarm) {
        clearOverride();
      } else {
        setActiveFarm(option.id, option.name);
      }
    },
    [setActiveFarm, clearOverride]
  );

  if (options.length === 0) return null;

  return (
    <Listbox value={selectedOption} onChange={handleChange}>
      <div className="relative">
        <ListboxButton className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-white/10 transition-colors cursor-pointer min-w-0">
          <BuildingOfficeIcon className="h-4 w-4 text-white/70 shrink-0" />
          <div className="flex flex-col items-start leading-tight min-w-0">
            <span className="text-white text-lg font-bold truncate max-w-[180px]">
              {activeFarmName ?? 'Select Farm'}
            </span>
            {isOverride && (
              <span className="text-yellow-300 text-[10px] font-medium -mt-0.5">
                (viewing)
              </span>
            )}
          </div>
          <ChevronUpDownIcon className="h-4 w-4 text-white/50 shrink-0" />
        </ListboxButton>

        <ListboxOptions
          anchor="bottom start"
          className="z-50 mt-1 w-64 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl focus:outline-none"
        >
          {options.map((option) => (
            <ListboxOption
              key={option.id}
              value={option}
              className="cursor-pointer select-none px-3 py-2 text-sm text-white data-[focus]:bg-gray-700 data-[selected]:bg-[#5f7248]/30"
            >
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{option.name}</span>
                {option.isOwnFarm && (
                  <span className="text-xs text-white/50 shrink-0">(my farm)</span>
                )}
              </div>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
});

export default FarmSelector;
