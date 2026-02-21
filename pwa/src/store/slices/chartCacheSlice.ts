import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { tileCache, type Bounds } from '@/database/services/TileCache';

export interface CachedRegion {
  id: string;
  name: string;
  bounds: Bounds;
  zoomLevels: number[];
  tileCount: number;
  sizeBytes: number;
  createdAt: Date;
}

export interface DownloadProgress {
  regionId: string;
  regionName: string;
  totalTiles: number;
  downloadedTiles: number;
  failedTiles: number;
  isActive: boolean;
  isPaused: boolean;
  error?: string;
}

export interface ChartCacheState {
  cachedRegions: CachedRegion[];
  activeDownloads: Record<string, DownloadProgress>;
  totalCacheSize: number;
  totalTileCount: number;
  storageQuota: {
    usage: number;
    quota: number;
    available: number;
    percentUsed: number;
  } | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ChartCacheState = {
  cachedRegions: [],
  activeDownloads: {},
  totalCacheSize: 0,
  totalTileCount: 0,
  storageQuota: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const loadCacheStats = createAsyncThunk(
  'chartCache/loadStats',
  async () => {
    const stats = await tileCache.getStats();
    const quota = await tileCache.checkStorageQuota();
    return { stats, quota };
  }
);

export const clearRegion = createAsyncThunk(
  'chartCache/clearRegion',
  async (regionId: string) => {
    await tileCache.clearRegionByName(regionId);
    return regionId;
  }
);

export const clearAllCache = createAsyncThunk(
  'chartCache/clearAll',
  async () => {
    await tileCache.clearAll();
  }
);

const chartCacheSlice = createSlice({
  name: 'chartCache',
  initialState,
  reducers: {
    addCachedRegion: (state, action: PayloadAction<CachedRegion>) => {
      state.cachedRegions.push(action.payload);
    },
    removeCachedRegion: (state, action: PayloadAction<string>) => {
      state.cachedRegions = state.cachedRegions.filter(r => r.id !== action.payload);
    },
    updateCachedRegion: (state, action: PayloadAction<CachedRegion>) => {
      const index = state.cachedRegions.findIndex(r => r.id === action.payload.id);
      if (index !== -1) {
        state.cachedRegions[index] = action.payload;
      }
    },
    startDownload: (state, action: PayloadAction<DownloadProgress>) => {
      state.activeDownloads[action.payload.regionId] = action.payload;
    },
    updateDownloadProgress: (state, action: PayloadAction<{
      regionId: string;
      downloadedTiles: number;
      failedTiles?: number;
    }>) => {
      const download = state.activeDownloads[action.payload.regionId];
      if (download) {
        download.downloadedTiles = action.payload.downloadedTiles;
        if (action.payload.failedTiles !== undefined) {
          download.failedTiles = action.payload.failedTiles;
        }
      }
    },
    pauseDownload: (state, action: PayloadAction<string>) => {
      const download = state.activeDownloads[action.payload];
      if (download) {
        download.isPaused = true;
        download.isActive = false;
      }
    },
    resumeDownload: (state, action: PayloadAction<string>) => {
      const download = state.activeDownloads[action.payload];
      if (download) {
        download.isPaused = false;
        download.isActive = true;
      }
    },
    completeDownload: (state, action: PayloadAction<string>) => {
      delete state.activeDownloads[action.payload];
    },
    failDownload: (state, action: PayloadAction<{ regionId: string; error: string }>) => {
      const download = state.activeDownloads[action.payload.regionId];
      if (download) {
        download.isActive = false;
        download.error = action.payload.error;
      }
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCacheStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadCacheStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.totalCacheSize = action.payload.stats.totalSize;
        state.totalTileCount = action.payload.stats.totalTiles;
        state.storageQuota = action.payload.quota;
      })
      .addCase(loadCacheStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load cache stats';
      })
      .addCase(clearRegion.fulfilled, (state, action) => {
        state.cachedRegions = state.cachedRegions.filter(r => r.id !== action.payload);
      })
      .addCase(clearAllCache.fulfilled, (state) => {
        state.cachedRegions = [];
        state.totalCacheSize = 0;
        state.totalTileCount = 0;
      });
  },
});

export const {
  addCachedRegion,
  removeCachedRegion,
  updateCachedRegion,
  startDownload,
  updateDownloadProgress,
  pauseDownload,
  resumeDownload,
  completeDownload,
  failDownload,
  setError,
} = chartCacheSlice.actions;

export default chartCacheSlice.reducer;
