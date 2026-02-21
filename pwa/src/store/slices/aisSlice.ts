import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AISTarget, CPAInfo } from '@/models';

export interface AISState {
  targets: Record<string, AISTarget>; // keyed by MMSI
  selectedTargetMMSI: string | null;
  cpaWarnings: Array<{
    mmsi: string;
    cpa: CPAInfo;
    timestamp: Date;
  }>;
  showAISLayer: boolean;
  cpaWarningThreshold: number; // in nautical miles
}

const initialState: AISState = {
  targets: {},
  selectedTargetMMSI: null,
  cpaWarnings: [],
  showAISLayer: true,
  cpaWarningThreshold: 2.0, // 2 nautical miles
};

const aisSlice = createSlice({
  name: 'ais',
  initialState,
  reducers: {
    updateTarget: (state, action: PayloadAction<AISTarget>) => {
      const target = action.payload;
      state.targets[target.mmsi] = target;
      
      // Check for CPA warning
      if (target.cpa && target.cpa.distance < state.cpaWarningThreshold) {
        const existingWarning = state.cpaWarnings.find((w) => w.mmsi === target.mmsi);
        if (!existingWarning) {
          state.cpaWarnings.push({
            mmsi: target.mmsi,
            cpa: target.cpa,
            timestamp: new Date(),
          });
        } else {
          existingWarning.cpa = target.cpa;
          existingWarning.timestamp = new Date();
        }
      } else {
        // Remove warning if CPA is now safe
        state.cpaWarnings = state.cpaWarnings.filter((w) => w.mmsi !== target.mmsi);
      }
    },
    removeTarget: (state, action: PayloadAction<string>) => {
      delete state.targets[action.payload];
      state.cpaWarnings = state.cpaWarnings.filter((w) => w.mmsi !== action.payload);
      if (state.selectedTargetMMSI === action.payload) {
        state.selectedTargetMMSI = null;
      }
    },
    selectTarget: (state, action: PayloadAction<string | null>) => {
      state.selectedTargetMMSI = action.payload;
    },
    clearOldTargets: (state, action: PayloadAction<number>) => {
      const maxAge = action.payload; // in milliseconds
      const now = Date.now();
      
      Object.keys(state.targets).forEach((mmsi) => {
        const target = state.targets[mmsi];
        if (now - target.lastUpdate.getTime() > maxAge) {
          delete state.targets[mmsi];
          state.cpaWarnings = state.cpaWarnings.filter((w) => w.mmsi !== mmsi);
        }
      });
    },
    dismissCPAWarning: (state, action: PayloadAction<string>) => {
      state.cpaWarnings = state.cpaWarnings.filter((w) => w.mmsi !== action.payload);
    },
    setShowAISLayer: (state, action: PayloadAction<boolean>) => {
      state.showAISLayer = action.payload;
    },
    setCPAWarningThreshold: (state, action: PayloadAction<number>) => {
      state.cpaWarningThreshold = action.payload;
    },
    clearAllTargets: (state) => {
      state.targets = {};
      state.cpaWarnings = [];
      state.selectedTargetMMSI = null;
    },
  },
});

export const {
  updateTarget,
  removeTarget,
  selectTarget,
  clearOldTargets,
  dismissCPAWarning,
  setShowAISLayer,
  setCPAWarningThreshold,
  clearAllTargets,
} = aisSlice.actions;

export default aisSlice.reducer;
