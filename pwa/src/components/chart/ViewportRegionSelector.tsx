import React from 'react';
import type { Bounds } from '@/database/services/TileCache';
import type { Viewport } from './ChartView';

export interface ViewportRegionSelectorProps {
  viewport: Viewport;
  /** The map's visible area (ChartView onBoundsChange); null until the map has rendered */
  bounds: Bounds | null;
  onSelectCurrentView: (bounds: Bounds) => void;
  onCancel: () => void;
}

export const ViewportRegionSelector: React.FC<ViewportRegionSelectorProps> = ({
  viewport,
  bounds,
  onSelectCurrentView,
  onCancel,
}) => {
  const handleSelectView = () => {
    if (bounds) onSelectCurrentView(bounds);
  };

  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white px-6 py-4 rounded-lg shadow-xl z-30 max-w-md">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Select Download Region</h3>
        <p className="text-sm text-gray-600 mb-4">
          Pan and zoom the map to frame the area you want to download for offline use.
          The current visible area will be selected.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm">
          <div className="font-medium mb-1">Current View:</div>
          <div className="text-gray-700">
            Center: {viewport.latitude.toFixed(4)}°, {viewport.longitude.toFixed(4)}°
          </div>
          <div className="text-gray-700">
            Zoom Level: {Math.round(viewport.zoom)}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSelectView}
            disabled={!bounds}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Select This Area
          </button>
        </div>
      </div>
    </div>
  );
};
