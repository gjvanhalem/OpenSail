import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ChartRotation,
  ChartLayer,
  GeoBounds,
  ChartCoverage,
  ChartUpdate,
} from '../../types';

export interface ChartState {
  zoom: number;
  rotation: ChartRotation;
  center: { latitude: number; longitude: number } | null;
  layers: ChartLayer[];
  visibleBounds: GeoBounds | null;
  coverage: ChartCoverage[];
  availableUpdates: ChartUpdate[];
  loading: boolean;
  cacheSize: number;
  error: string | null;
}

const initialState: ChartState = {
  zoom: 12,
  rotation: ChartRotation.NorthUp,
  center: null,
  layers: [],
  visibleBounds: null,
  coverage: [],
  availableUpdates: [],
  loading: false,
  cacheSize: 0,
  error: null,
};

const chartSlice = createSlice({
  name: 'chart',
  initialState,
  reducers: {
    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = action.payload;
    },
    setRotation: (state, action: PayloadAction<ChartRotation>) => {
      state.rotation = action.payload;
    },
    setCenter: (
      state,
      action: PayloadAction<{ latitude: number; longitude: number } | null>
    ) => {
      state.center = action.payload;
    },
    setLayers: (state, action: PayloadAction<ChartLayer[]>) => {
      state.layers = action.payload;
    },
    updateLayer: (state, action: PayloadAction<ChartLayer>) => {
      const index = state.layers.findIndex((l) => l.id === action.payload.id);
      if (index !== -1) {
        state.layers[index] = action.payload;
      } else {
        state.layers.push(action.payload);
      }
    },
    toggleLayerVisibility: (state, action: PayloadAction<string>) => {
      const layer = state.layers.find((l) => l.id === action.payload);
      if (layer) {
        layer.visible = !layer.visible;
      }
    },
    setLayerOpacity: (
      state,
      action: PayloadAction<{ layerId: string; opacity: number }>
    ) => {
      const layer = state.layers.find((l) => l.id === action.payload.layerId);
      if (layer) {
        layer.opacity = action.payload.opacity;
      }
    },
    setVisibleBounds: (state, action: PayloadAction<GeoBounds | null>) => {
      state.visibleBounds = action.payload;
    },
    setCoverage: (state, action: PayloadAction<ChartCoverage[]>) => {
      state.coverage = action.payload;
    },
    setAvailableUpdates: (state, action: PayloadAction<ChartUpdate[]>) => {
      state.availableUpdates = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setCacheSize: (state, action: PayloadAction<number>) => {
      state.cacheSize = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetChart: (state) => {
      state.zoom = initialState.zoom;
      state.rotation = initialState.rotation;
      state.center = null;
      state.visibleBounds = null;
    },
  },
});

export const {
  setZoom,
  setRotation,
  setCenter,
  setLayers,
  updateLayer,
  toggleLayerVisibility,
  setLayerOpacity,
  setVisibleBounds,
  setCoverage,
  setAvailableUpdates,
  setLoading,
  setCacheSize,
  setError,
  resetChart,
} = chartSlice.actions;

export default chartSlice.reducer;
