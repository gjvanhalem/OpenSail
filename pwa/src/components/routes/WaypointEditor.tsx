import React, { useState } from 'react';
import type { Waypoint } from '@/models';

export interface WaypointEditorProps {
  waypoint: Waypoint;
  onSave: (updates: Partial<Waypoint>) => void;
  onClose: () => void;
}

export const WaypointEditor: React.FC<WaypointEditorProps> = ({ 
  waypoint, 
  onSave, 
  onClose 
}) => {
  const [name, setName] = useState(waypoint.name);
  const [latitude, setLatitude] = useState(waypoint.position.latitude.toString());
  const [longitude, setLongitude] = useState(waypoint.position.longitude.toString());
  const [description, setDescription] = useState(waypoint.description || '');
  const [arrivalRadius, setArrivalRadius] = useState(waypoint.arrivalRadius.toString());
  const [error, setError] = useState<string | null>(null);

  // Parse coordinate input (supports decimal degrees and DMS format)
  const parseCoordinate = (value: string): number | null => {
    const decimal = parseFloat(value);
    if (!isNaN(decimal)) {
      return decimal;
    }
    // Could add DMS parsing here if needed
    return null;
  };

  const validateInputs = (): boolean => {
    if (!name.trim()) {
      setError('Waypoint name is required');
      return false;
    }

    const lat = parseCoordinate(latitude);
    if (lat === null || lat < -90 || lat > 90) {
      setError('Invalid latitude (must be between -90 and 90)');
      return false;
    }

    const lon = parseCoordinate(longitude);
    if (lon === null || lon < -180 || lon > 180) {
      setError('Invalid longitude (must be between -180 and 180)');
      return false;
    }

    const radius = parseFloat(arrivalRadius);
    if (isNaN(radius) || radius <= 0) {
      setError('Arrival radius must be greater than 0');
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateInputs()) {
      return;
    }

    const lat = parseCoordinate(latitude)!;
    const lon = parseCoordinate(longitude)!;
    const radius = parseFloat(arrivalRadius);

    onSave({
      name: name.trim(),
      position: {
        ...waypoint.position,
        latitude: lat,
        longitude: lon,
      },
      description: description.trim() || undefined,
      arrivalRadius: radius,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Edit Waypoint</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Waypoint name"
              autoFocus
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitude *
              </label>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="51.5074"
              />
              <div className="text-xs text-gray-500 mt-1">-90 to 90</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitude *
              </label>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="-0.1278"
              />
              <div className="text-xs text-gray-500 mt-1">-180 to 180</div>
            </div>
          </div>

          {/* Arrival Radius */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arrival Radius (nm) *
            </label>
            <input
              type="number"
              value={arrivalRadius}
              onChange={(e) => setArrivalRadius(e.target.value)}
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              Distance to consider waypoint reached
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional notes about this waypoint"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Help Text */}
          <div className="text-xs text-gray-500">
            Press Ctrl+Enter to save, Esc to cancel
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
