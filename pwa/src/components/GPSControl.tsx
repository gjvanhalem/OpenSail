import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getGeolocationService } from '@/services/GeolocationService';
import { getGPSSimulator, GPSSimulator } from '@/services/GPSSimulator';
import { errorHandler } from '@/services/ErrorHandler';
import { useUnits } from '@/hooks/useUnits';
import type { NavigationError } from '@/models';

type GPSMode = 'real' | 'simulator' | 'off';

export const GPSControl: React.FC = () => {
  const dispatch = useAppDispatch();
  const units = useUnits();
  const { isGPSActive, position, accuracy } = useAppSelector((state) => state.navigation);
  const geolocationService = getGeolocationService();
  const gpsSimulator = getGPSSimulator();
  const predefinedTracks = GPSSimulator.getPredefinedTracks();

  // The services are app-wide singletons that keep running when this page
  // closes, so start from whatever is already running
  const [gpsMode, setGpsMode] = useState<GPSMode>(() =>
    gpsSimulator.getIsActive() ? 'simulator' : geolocationService.getIsActive() ? 'real' : 'off'
  );
  const [selectedTrack, setSelectedTrack] = useState(() => {
    const index = predefinedTracks.findIndex((t) => t.name === gpsSimulator.getTrackName());
    return index >= 0 ? index : 0;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize services
    geolocationService.initialize(dispatch);
    gpsSimulator.initialize(dispatch);

    // Set up error handling
    geolocationService.onError((err: NavigationError) => {
      setError(err.message);
      errorHandler.handle(err, 'GPS Service', err.severity);
    });

    return () => {
      // Keep GPS running when leaving the settings page: the chart and the
      // track recorder still need it. Only drop this component's error callback.
      geolocationService.onError(() => {});
    };
  }, [dispatch, geolocationService, gpsSimulator]);

  const handleModeChange = async (mode: GPSMode) => {
    setError(null);

    // Stop current mode
    if (gpsMode === 'real') {
      geolocationService.stop();
    } else if (gpsMode === 'simulator') {
      gpsSimulator.stop();
    }

    // Start new mode
    if (mode === 'real') {
      try {
        if (!geolocationService.isSupported()) {
          setError('Geolocation API is not supported in this browser');
          return;
        }
        await geolocationService.start();
        setGpsMode('real');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start GPS');
        setGpsMode('off');
      }
    } else if (mode === 'simulator') {
      try {
        const track = predefinedTracks[selectedTrack];
        gpsSimulator.start(track);
        setGpsMode('simulator');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start simulator');
        setGpsMode('off');
      }
    } else {
      setGpsMode('off');
    }
  };

  const handleTrackChange = (trackIndex: number) => {
    setSelectedTrack(trackIndex);
    if (gpsMode === 'simulator') {
      const track = predefinedTracks[trackIndex];
      gpsSimulator.setTrack(track);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">GPS Control</h2>

      {/* GPS Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <span
            className={`text-sm font-semibold ${
              isGPSActive ? 'text-green-600' : 'text-gray-500'
            }`}
          >
            {isGPSActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {position && (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Latitude:</span>
              <span className="text-xs font-mono text-gray-900">
                {position.latitude.toFixed(6)}°
              </span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Longitude:</span>
              <span className="text-xs font-mono text-gray-900">
                {position.longitude.toFixed(6)}°
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Accuracy:</span>
              <span className="text-xs font-mono text-gray-900">
                {accuracy !== null ? units.format('length', accuracy) : 'N/A'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* GPS Mode Selection */}
      <div className="space-y-3 mb-4">
        <label className="block text-sm font-medium text-gray-700">GPS Mode</label>

        <div className="space-y-2">
          <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="gpsMode"
              value="off"
              checked={gpsMode === 'off'}
              onChange={() => handleModeChange('off')}
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">Off</div>
              <div className="text-xs text-gray-500">No GPS data</div>
            </div>
          </label>

          <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="gpsMode"
              value="real"
              checked={gpsMode === 'real'}
              onChange={() => handleModeChange('real')}
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">Real GPS</div>
              <div className="text-xs text-gray-500">
                Use device GPS (requires permission)
              </div>
            </div>
          </label>

          <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="gpsMode"
              value="simulator"
              checked={gpsMode === 'simulator'}
              onChange={() => handleModeChange('simulator')}
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">Simulator</div>
              <div className="text-xs text-gray-500">
                Simulated GPS for development
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Simulator Track Selection */}
      {gpsMode === 'simulator' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Simulation Track
          </label>
          <select
            value={selectedTrack}
            onChange={(e) => handleTrackChange(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {predefinedTracks.map((track, index) => (
              <option key={index} value={index}>
                {track.name} - {units.format('speed', track.speed)}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {predefinedTracks[selectedTrack].description}
          </p>
        </div>
      )}

      {/* Quick Actions */}
      {gpsMode !== 'off' && (
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => handleModeChange('off')}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Stop GPS
          </button>
        </div>
      )}
    </div>
  );
};
