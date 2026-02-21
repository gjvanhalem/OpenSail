import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AISTarget, GeoBounds } from '../../types';

export interface AISState {
  targets: Record<string, AISTarget>;
  nearbyTargets: string[];
  selectedTargetMMSI: string | null;
  bounds: GeoBounds | null;
  lastUpdate: number;
  error: string | null;
}

const initialState: AISState = {
  targets: {},
  nearbyTargets: [],
  selectedTargetMMSI: null,
  bounds: null,
  lastUpdate: 0,
  error: null,
};

const aisSlice = createSlice({
  name: 'ais',
  initialState,
  reducers: {
    updateTarget: (state, action: PayloadAction<AISTarget>) => {
      state.targets[action.payload.mmsi] = action.payload;
      state.lastUpdate = Date.now();
    },
    updateTargets: (state, action: PayloadAction<AISTarget[]>) => {
      action.payload.forEach((target) => {
        state.targets[target.mmsi] = target;
      });
      state.lastUpdate = Date.now();
    },
    removeTarget: (state, action: PayloadAction<string>) => {
      delete state.targets[action.payload];
      state.nearbyTargets = state.nearbyTargets.filter(
        (mmsi) => mmsi !== action.payload
      );
      if (state.selectedTargetMMSI === action.payload) {
        state.selectedTargetMMSI = null;
      }
    },
    setNearbyTargets: (state, action: PayloadAction<string[]>) => {
      state.nearbyTargets = action.payload;
    },
    selectTarget: (state, action: PayloadAction<string | null>) => {
      state.selectedTargetMMSI = action.payload;
    },
    setBounds: (state, action: PayloadAction<GeoBounds | null>) => {
      state.bounds = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearTargets: (state) => {
      state.targets = {};
      state.nearbyTargets = [];
      state.selectedTargetMMSI = null;
    },
    cleanupExpiredTargets: (state, action: PayloadAction<number>) => {
      const expirationTime = action.payload;
      const expiredMMSIs: string[] = [];

      Object.entries(state.targets).forEach(([mmsi, target]) => {
        if (target.lastUpdate.getTime() < expirationTime) {
          expiredMMSIs.push(mmsi);
        }
      });

      expiredMMSIs.forEach((mmsi) => {
        delete state.targets[mmsi];
      });

      state.nearbyTargets = state.nearbyTargets.filter(
        (mmsi) => !expiredMMSIs.includes(mmsi)
      );

      if (
        state.selectedTargetMMSI &&
        expiredMMSIs.includes(state.selectedTargetMMSI)
      ) {
        state.selectedTargetMMSI = null;
      }
    },
  },
});

export const {
  updateTarget,
  updateTargets,
  removeTarget,
  setNearbyTargets,
  selectTarget,
  setBounds,
  setError,
  clearTargets,
  cleanupExpiredTargets,
} = aisSlice.actions;

export default aisSlice.reducer;
