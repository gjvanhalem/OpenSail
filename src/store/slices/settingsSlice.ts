import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettings, UnitSystem, ChartRotation } from '../../types';

export interface SettingsState extends AppSettings {
  loading: boolean;
  error: string | null;
  lastSyncTime: number | null;
}

const defaultSettings: AppSettings = {
  // Display settings
  units: 'nautical',
  chartRotation: ChartRotation.NorthUp,
  defaultZoom: 12,
  theme: 'light',
  showNavigationAids: true,
  showDepthContours: true,
  
  // Alert settings
  anchorWatchRadius: 50,
  enableAnchorAlarm: true,
  enableCollisionAlarm: true,
  collisionWarningDistance: 2,
  enableShallowWaterAlarm: true,
  shallowWaterDepth: 5,
  enableWeatherAlerts: true,
  
  // Connection settings
  autoSync: true,
  instrumentProtocol: 'stub',
  instrumentConnectionType: 'serial',
  serialPort: 'COM1',
  networkHost: 'localhost',
  networkPort: 10110,
  baudRate: 4800,
  autoReconnect: true,
};

const initialState: SettingsState = {
  ...defaultSettings,
  loading: false,
  error: null,
  lastSyncTime: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      Object.assign(state, action.payload);
    },
    setUnits: (state, action: PayloadAction<UnitSystem>) => {
      state.units = action.payload;
    },
    setChartRotation: (state, action: PayloadAction<ChartRotation>) => {
      state.chartRotation = action.payload;
    },
    setDefaultZoom: (state, action: PayloadAction<number>) => {
      state.defaultZoom = action.payload;
    },
    setAnchorWatchRadius: (state, action: PayloadAction<number>) => {
      state.anchorWatchRadius = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setAutoSync: (state, action: PayloadAction<boolean>) => {
      state.autoSync = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLastSyncTime: (state, action: PayloadAction<number>) => {
      state.lastSyncTime = action.payload;
    },
    resetToDefaults: (state) => {
      Object.assign(state, defaultSettings);
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setSettings,
  setUnits,
  setChartRotation,
  setDefaultZoom,
  setAnchorWatchRadius,
  setTheme,
  setAutoSync,
  setLoading,
  setError,
  setLastSyncTime,
  resetToDefaults,
} = settingsSlice.actions;

export default settingsSlice.reducer;
