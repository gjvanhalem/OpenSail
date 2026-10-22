import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { chartDownloadService } from '@/services/ChartDownloadService';
import {
  loadCacheStats,
  clearRegion,
  clearAllCache,
  checkForChartUpdates,
} from '@/store/slices/chartCacheSlice';
import { ChartRegionList } from './ChartRegionList';
import { formatBytes } from './formatBytes';
import { useOnlineStatus } from './useOnlineStatus';
import type { Bounds } from '@/database/services/TileCache';
import type { ChartRegionManifest } from '@/services/chartCatalog';

export interface ChartDownloadPanelProps {
  selectedBounds: Bounds | null;
  onClose: () => void;
  onSelectNewRegion: () => void;
}

export const ChartDownloadPanel: React.FC<ChartDownloadPanelProps> = ({
  selectedBounds,
  onClose,
  onSelectNewRegion,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { cachedRegions, activeDownloads, totalCacheSize, totalTileCount, storageQuota, persistentStorage, updates } =
    useSelector((state: RootState) => state.chartCache);
  const online = useOnlineStatus();

  const [regionName, setRegionName] = useState('');
  const [selectedZoomLevels, setSelectedZoomLevels] = useState<number[]>([8, 9, 10, 11, 12, 13, 14]);
  // ENC regions in the chart catalog that overlap the selected area
  const [encRegions, setEncRegions] = useState<ChartRegionManifest[]>([]);
  useEffect(() => {
    if (!selectedBounds) return;
    const controller = new AbortController();
    chartDownloadService
      .encRegionsFor(selectedBounds, controller.signal)
      .then(setEncRegions)
      .catch(() => setEncRegions([]));
    return () => controller.abort();
  }, [selectedBounds]);

  const estimatedSize = useMemo(
    () =>
      selectedBounds
        ? chartDownloadService.estimateDownloadSize(selectedBounds, selectedZoomLevels, encRegions)
        : 0,
    [selectedBounds, selectedZoomLevels, encRegions]
  );
  const tileCount = useMemo(
    () =>
      selectedBounds
        ? chartDownloadService.calculateTileCount(selectedBounds, selectedZoomLevels, encRegions)
        : 0,
    [selectedBounds, selectedZoomLevels, encRegions]
  );

  useEffect(() => {
    dispatch(loadCacheStats());
    if (online) dispatch(checkForChartUpdates());
  }, [dispatch, online]);

  const handleDownload = async () => {
    if (!selectedBounds || !regionName.trim()) return;

    const regionId = `region-${Date.now()}`;
    await chartDownloadService.downloadRegion(
      {
        regionId,
        regionName: regionName.trim(),
        bounds: selectedBounds,
        zoomLevels: selectedZoomLevels,
        encRegions,
      },
      dispatch
    );

    setRegionName('');
    dispatch(loadCacheStats());
  };

  const handleClearRegion = async (regionId: string) => {
    await dispatch(clearRegion(regionId));
    dispatch(loadCacheStats());
  };

  const handleUpdateRegion = async (regionId: string) => {
    try {
      await chartDownloadService.updateRegion(regionId, dispatch);
    } finally {
      dispatch(loadCacheStats());
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to delete all cached charts? This cannot be undone.')) {
      await dispatch(clearAllCache());
      dispatch(loadCacheStats());
    }
  };

  const handleCancelDownload = (regionId: string) => {
    chartDownloadService.cancelDownload(regionId);
  };

  const toggleZoomLevel = (level: number) => {
    setSelectedZoomLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level].sort((a, b) => a - b)
    );
  };

  return (
    <div className="absolute top-0 right-0 w-96 h-full bg-surface shadow-xl z-20 overflow-y-auto">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Offline Charts</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Storage Info */}
        {storageQuota && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold mb-2">Storage Usage</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Cached Tiles:</span>
                <span className="font-medium">{totalTileCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Cache Size:</span>
                <span className="font-medium">{formatBytes(totalCacheSize)}</span>
              </div>
              <div className="flex justify-between">
                <span>Available:</span>
                <span className="font-medium">{formatBytes(storageQuota.available)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(storageQuota.percentUsed, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 text-center">
                {storageQuota.percentUsed.toFixed(1)}% of {formatBytes(storageQuota.quota)} browser storage used
              </div>
              <div className="text-xs text-gray-600" data-testid="storage-persistence">
                {persistentStorage
                  ? 'Downloaded charts are kept: the browser has granted persistent storage.'
                  : 'The browser may clear downloaded charts when it runs low on space.'}
              </div>
            </div>
          </div>
        )}

        {/* Download New Region */}
        {selectedBounds ? (
          <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <h3 className="text-sm font-semibold mb-3">Download Region</h3>
            
            <div className="mb-3">
              <label htmlFor="chart-region-name" className="block text-sm font-medium mb-1">Region Name</label>
              <input
                id="chart-region-name"
                type="text"
                value={regionName}
                onChange={(e) => setRegionName(e.target.value)}
                placeholder="e.g., IJsselmeer"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-2">Zoom Levels</label>
              <div className="flex flex-wrap gap-2">
                {[8, 9, 10, 11, 12, 13, 14].map(level => (
                  <button
                    key={level}
                    onClick={() => toggleZoomLevel(level)}
                    aria-pressed={selectedZoomLevels.includes(level)}
                    aria-label={`Zoom level ${level}`}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedZoomLevels.includes(level)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Higher zoom = more detail, larger download
              </p>
            </div>

            <div className="mb-3 text-sm">
              <div className="flex justify-between">
                <span>Estimated Size:</span>
                <span className="font-medium">{estimatedSize.toFixed(2)} MB</span>
              </div>
              <div className="flex justify-between">
                <span>Tiles:</span>
                <span className="font-medium">{tileCount}</span>
              </div>
              <div className="mt-2 text-xs text-gray-700" data-testid="download-includes">
                Includes the base map, OpenSeaMap seamarks and label fonts
                {encRegions.length > 0 && (
                  <>
                    , and depth data from {encRegions.map((region) => region.name).join(', ')}
                  </>
                )}
                .
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={!regionName.trim() || selectedZoomLevels.length === 0}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Start Download
            </button>
          </div>
        ) : (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <p className="text-sm text-gray-600 mb-3">
              Select a region on the map to download charts for offline use.
            </p>
            <button
              onClick={onSelectNewRegion}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
            >
              Select Region on Map
            </button>
          </div>
        )}

        {/* Active Downloads */}
        {Object.values(activeDownloads).length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">Active Downloads</h3>
            {Object.values(activeDownloads).map(download => (
              <div key={download.regionId} className="p-3 bg-gray-50 rounded-lg mb-2">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm">{download.regionName}</span>
                  <button
                    onClick={() => handleCancelDownload(download.regionId)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Cancel
                  </button>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(download.downloadedTiles / download.totalTiles) * 100}%`
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600">
                  {download.downloadedTiles} / {download.totalTiles} tiles
                  {download.failedTiles > 0 && ` (${download.failedTiles} failed)`}
                </div>
                {download.error && (
                  <div className="text-xs text-red-600 mt-1">{download.error}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Cached Regions */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Downloaded Regions</h3>
            {cachedRegions.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Clear All
              </button>
            )}
          </div>
          
          <ChartRegionList
            regions={cachedRegions}
            updates={updates}
            busyRegionIds={Object.keys(activeDownloads)}
            online={online}
            onUpdate={handleUpdateRegion}
            onDelete={handleClearRegion}
          />
        </div>
      </div>
    </div>
  );
};
