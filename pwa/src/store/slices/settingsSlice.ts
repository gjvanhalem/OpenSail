import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { settingsRepository, type AppSettings } from '@/database/repositories/SettingsRepository';

export interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

const initialState: SettingsState = {
  settings: {
    units: 'nautical',
    chartRotation: 'north-up',
    defaultZoom: 12,
    theme: 'light',
    showNavigationAids: true,
    showDepthContours: true,
    instrumentProtocol: 'nmea0183',
    instrumentConnectionType: 'serial',
    serialPort: '',
    networkHost: '',
    networkPort: 10110,
    baudRate: 4800,
    autoReconnect: true,
    anchorWatchRadius: 50,
    enableAnchorAlarm: false,
    enableCollisionAlarm: true,
    collisionWarningDistance: 2,
    enableShallowWaterAlarm: true,
    shallowWaterDepth: 5,
    enableWeatherAlerts: true,
    offlineMode: false,
    autoSync: false,
  },
  isLoading: false,
  error: null,
  isInitialized: false,
};

// Async thunks
export const loadSettings = createAsyncThunk(
  'settings/load',
  async () => {
    await settingsRepository.initialize();
    return await settingsRepository.getAll();
  }
);

export const updateSetting = createAsyncThunk(
  'settings/update',
  async ({ key, value }: { key: keyof AppSettings; value: any }) => {
    await settingsRepository.set(key, value);
    return { key, value };
  }
);

export const updateMultipleSettings = createAsyncThunk(
  'settings/updateMultiple',
  async (settings: Partial<AppSettings>) => {
    await settingsRepository.setMany(settings);
    return settings;
  }
);

export const resetSettings = createAsyncThunk(
  'settings/reset',
  async () => {
    await settingsRepository.resetAll();
    return await settingsRepository.getAll();
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // Optimistic update for immediate UI feedback
    setSettingOptimistic: (
      state,
      action: PayloadAction<{ key: keyof AppSettings; value: any }>
    ) => {
      (state.settings as any)[action.payload.key] = action.payload.value;
    },
  },
  extraReducers: (builder) => {
    // Load settings
    builder.addCase(loadSettings.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(loadSettings.fulfilled, (state, action) => {
      state.settings = action.payload;
      state.isLoading = false;
      state.isInitialized = true;
    });
    builder.addCase(loadSettings.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to load settings';
    });

    // Update single setting
    builder.addCase(updateSetting.fulfilled, (state, action) => {
      (state.settings as any)[action.payload.key] = action.payload.value;
    });
    builder.addCase(updateSetting.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to update setting';
    });

    // Update multiple settings
    builder.addCase(updateMultipleSettings.fulfilled, (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    });
    builder.addCase(updateMultipleSettings.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to update settings';
    });

    // Reset settings
    builder.addCase(resetSettings.fulfilled, (state, action) => {
      state.settings = action.payload;
    });
    builder.addCase(resetSettings.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to reset settings';
    });
  },
});

export const { setSettingOptimistic } = settingsSlice.actions;
export default settingsSlice.reducer;
