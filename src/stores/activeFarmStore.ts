import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveFarmState {
  overrideFarmId: string | null;
  overrideFarmName: string | null;
  setActiveFarm: (farmId: string, farmName: string) => void;
  clearOverride: () => void;
}

export const useActiveFarmStore = create<ActiveFarmState>()(
  persist(
    (set) => ({
      overrideFarmId: null,
      overrideFarmName: null,
      setActiveFarm: (farmId, farmName) =>
        set({ overrideFarmId: farmId, overrideFarmName: farmName }),
      clearOverride: () =>
        set({ overrideFarmId: null, overrideFarmName: null }),
    }),
    {
      name: 'ag-active-farm',
    }
  )
);
