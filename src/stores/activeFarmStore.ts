import { create } from 'zustand';

interface ActiveFarmState {
  overrideFarmId: string | null;
  overrideFarmName: string | null;
  setActiveFarm: (farmId: string, farmName: string) => void;
  clearOverride: () => void;
}

export const useActiveFarmStore = create<ActiveFarmState>((set) => ({
  overrideFarmId: null,
  overrideFarmName: null,
  setActiveFarm: (farmId, farmName) =>
    set({ overrideFarmId: farmId, overrideFarmName: farmName }),
  clearOverride: () =>
    set({ overrideFarmId: null, overrideFarmName: null }),
}));
