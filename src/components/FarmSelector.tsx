import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronUpDownIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';
import { useActiveFarm } from '../hooks/useActiveFarm';
import { useActiveFarmStore } from '../stores/activeFarmStore';
import { useTranslation } from '../hooks/useTranslation';
import { useUserRole } from '../hooks/useUserRole';

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
  const { t } = useTranslation();
  const { authStatus } = useAuth();
  const { farmId: activeFarmId, farmName: activeFarmName, isOverride } = useActiveFarm();
  const setActiveFarm = useActiveFarmStore((s) => s.setActiveFarm);
  const clearOverride = useActiveFarmStore((s) => s.clearOverride);
  const role = useUserRole();

  // Super_admin doesn't "own" any farm — all farms are equal
  const ownFarmId = role === 'super_admin' ? null : (authStatus?.farmId ?? null);
  const ownFarmName = authStatus?.farmName ?? 'My Farm';

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

  // ---------------------------------------------------------------------------
  // Hydration guard — wait for Zustand persist to rehydrate from localStorage
  // before running auto-select logic (prevents overwriting persisted selection)
  // ---------------------------------------------------------------------------
  const [hydrated, setHydrated] = useState(useActiveFarmStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useActiveFarmStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  // ---------------------------------------------------------------------------
  // Auto-select first farm for super_admin + deleted-farm fallback
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!hydrated) return; // Wait for persist rehydration
    if (role !== 'super_admin') return;
    if (options.length === 0) return;

    const overrideId = useActiveFarmStore.getState().overrideFarmId;

    // Deleted-farm fallback: stored farm no longer exists
    if (overrideId && !options.find((o) => o.id === overrideId)) {
      useActiveFarmStore.getState().clearOverride();
      // clearOverride sets overrideFarmId to null, which will re-trigger this effect
      return;
    }

    // Auto-select first farm when no override is set
    if (!overrideId) {
      const { setActiveFarm: setFarm } = useActiveFarmStore.getState();
      setFarm(options[0].id, options[0].name);
    }
  }, [hydrated, role, options]);

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

  // No-farms label for super_admin when no farms exist
  if (options.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 min-w-0">
        <BuildingOfficeIcon className="h-4 w-4 text-white/70 shrink-0" />
        <span className="text-white/50 text-lg font-bold truncate max-w-[180px]">
          {t('farm.noFarms')}
        </span>
      </div>
    );
  }

  return (
    <Listbox value={selectedOption} onChange={handleChange}>
      <div className="relative">
        <ListboxButton className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-white/10 transition-colors cursor-pointer min-w-0">
          <BuildingOfficeIcon className="h-4 w-4 text-white/70 shrink-0" />
          <div className="flex flex-col items-start leading-tight min-w-0">
            <span className="text-white text-lg font-bold truncate max-w-[180px]">
              {activeFarmName ?? t('farm.selectFarm')}
            </span>
            {isOverride && role !== 'super_admin' && (
              <span className="text-yellow-300 text-[10px] font-medium -mt-0.5">
                {t('farm.viewing')}
              </span>
            )}
          </div>
          <ChevronUpDownIcon className="h-4 w-4 text-white/50 shrink-0" />
        </ListboxButton>

        <ListboxOptions
          anchor="bottom start"
          className={`z-50 mt-1 w-64 rounded-lg border py-1 shadow-xl focus:outline-none ${
            role === 'super_admin'
              ? 'bg-super-admin border-white/20'
              : 'bg-surface-header border-white/20'
          }`}
        >
          {options.map((option) => (
            <ListboxOption
              key={option.id}
              value={option}
              className="cursor-pointer select-none px-3 py-2 text-sm text-white data-[focus]:bg-white/15 data-[selected]:bg-white/25"
            >
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{option.name}</span>
                {option.isOwnFarm && (
                  <span className="text-xs text-white/50 shrink-0">{t('farm.myFarm')}</span>
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
