import { create } from 'zustand';

export interface WellEditDraft {
  wellId: string;
  name: string;
  meterSerialNumber: string;
  wmisNumber: string;
  latitude: number;
  longitude: number;
  units: 'AF' | 'GAL' | 'CF';
  multiplier: '0.01' | '1' | '10' | '1000' | 'MG';
  sendMonthlyReport: boolean;
  batteryState: string;
  pumpState: string;
  meterStatus: string;
}

interface WellEditDraftState {
  draft: WellEditDraft | null;
  setDraft: (draft: WellEditDraft) => void;
  clearDraft: () => void;
}

export const useWellEditDraftStore = create<WellEditDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
