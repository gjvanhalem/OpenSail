import React, { useState } from 'react';
import { useRoutePlanner } from './RoutePlanner';
import type { Waypoint } from '@/models';

// Inline WaypointEditor to avoid import issues
interface WaypointEditorProps {
  waypoint: Waypoint;
  onSave: (updates: Partial<Waypoint>) => void;
  onClose: () => void;
}

const WaypointEditor: React.FC<WaypointEditorProps> = ({ 
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

  const parseCoordinate = (value: string): number | null => {
    const decimal = parseFloat(value);
    if (!isNaN(decimal)) {
      return decimal;
    }
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
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

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Waypoint name"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude *</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Radius (nm) *</label>
            <input
              type="number"
              value={arrivalRadius}
              onChange={(e) => setArrivalRadius(e.target.value)}
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-gray-500 mt-1">Distance to consider waypoint reached</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional notes about this waypoint"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="text-xs text-gray-500">Press Ctrl+Enter to save, Esc to cancel</div>
        </div>

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

export interface RoutePlannerUIProps {
  onClose?: () => void;
  editingRouteId?: string | null;
  onWaypointClick?: (waypoint: Waypoint) => void;
}

export const RoutePlannerUI: React.FC<RoutePlannerUIProps> = ({ 
  onClose, 
  editingRouteId,
  onWaypointClick 
}) => {
  const {
    routeName,
    setRouteName,
    waypoints,
    averageSpeed,
    setAverageSpeed,
    totalDistance,
    estimatedDuration,
    isSaving,
    error,
    handleRemoveWaypoint,
    handleUpdateWaypoint,
    handleSave,
  } = useRoutePlanner({ onClose, editingRouteId });

  const [editingWaypointId, setEditingWaypointId] = useState<string | null>(null);

  const formatDistance = (nm: number) => {
    return `${nm.toFixed(2)} nm`;
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {editingRouteId ? 'Edit Route' : 'New Route'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Route Name Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Route Name
          </label>
          <input
            type="text"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter route name"
          />
        </div>

        {/* Average Speed Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Average Speed (knots)
          </label>
          <input
            type="number"
            value={averageSpeed}
            onChange={(e) => setAverageSpeed(Number(e.target.value))}
            min="0.1"
            step="0.1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Route Metrics */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-md">
          <div>
            <div className="text-xs text-gray-500">Distance</div>
            <div className="text-lg font-semibold">{formatDistance(totalDistance)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Est. Duration</div>
            <div className="text-lg font-semibold">{formatDuration(estimatedDuration)}</div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Waypoints List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            Waypoints ({waypoints.length})
          </h3>
          <button
            onClick={() => {
              // This will be triggered by map click in the parent component
              alert('Click on the map to add a waypoint');
            }}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Add from map
          </button>
        </div>

        {waypoints.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No waypoints yet</p>
            <p className="text-sm">Click on the map to add waypoints</p>
          </div>
        ) : (
          <div className="space-y-2">
            {waypoints.map((waypoint, index) => (
              <div
                key={waypoint.id}
                className="p-3 border border-gray-200 rounded-md hover:border-blue-300 cursor-pointer"
                onClick={() => onWaypointClick?.(waypoint)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full">
                        {index + 1}
                      </span>
                      <span className="font-medium">{waypoint.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 ml-8">
                      {waypoint.position.latitude.toFixed(5)}°, {waypoint.position.longitude.toFixed(5)}°
                    </div>
                    {waypoint.description && (
                      <div className="text-xs text-gray-600 ml-8 mt-1">
                        {waypoint.description}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingWaypointId(waypoint.id);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      aria-label="Edit waypoint"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveWaypoint(waypoint.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                      aria-label="Remove waypoint"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || waypoints.length < 2 || !routeName.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Route'}
          </button>
        </div>
      </div>

      {/* Waypoint Editor Modal */}
      {editingWaypointId && (
        <WaypointEditor
          waypoint={waypoints.find((w: Waypoint) => w.id === editingWaypointId)!}
          onSave={(updates: Partial<Waypoint>) => {
            handleUpdateWaypoint(editingWaypointId, updates);
            setEditingWaypointId(null);
          }}
          onClose={() => setEditingWaypointId(null)}
        />
      )}
    </div>
  );
};
