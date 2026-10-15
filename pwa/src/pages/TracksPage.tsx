import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { setTracks, deleteTrack, fromStoredTrack, setTrackColor } from '@/store/slices/tracksSlice';
import { addRoute } from '@/store/slices/routesSlice';
import { routeRepository } from '@/database/repositories/RouteRepository';
import { TRACK_COLORS, trackColor } from '@/utils/trackColors';
import {
  DEFAULT_SIMPLIFY_TOLERANCE_NM,
  MAX_CONVERTED_WAYPOINTS,
  simplifyTrack,
  trackToRoute,
} from '@/utils/trackToRoute';
import { DEFAULT_ARRIVAL_RADIUS_NM } from '@/utils/routeGuidance';
import { trackRepository } from '@/database/repositories/TrackRepository';
import { TrackList } from '@/components/tracks/TrackList';
import { TrackRecordingControls } from '@/components/tracks/TrackRecordingControls';
import { downloadGPX } from '@/utils/gpxExport';
import type { Track as DBTrack } from '@/database/db';
import { useUnits } from '@/hooks/useUnits';

export const TracksPage: React.FC = () => {
  const dispatch = useDispatch();
  const units = useUnits();
  const [selectedTrack, setSelectedTrack] = useState<DBTrack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbTracks, setDbTracks] = useState<DBTrack[]>([]);
  const arrivalRadius = useSelector(
    (state: RootState) => state.settings.settings.arrivalRadius ?? DEFAULT_ARRIVAL_RADIUS_NM
  );
  const [tolerance, setTolerance] = useState(DEFAULT_SIMPLIFY_TOLERANCE_NM);
  const [convertedRoute, setConvertedRoute] = useState<{ name: string; waypoints: number } | null>(
    null
  );

  const selectedPoints = useMemo(
    () => (selectedTrack ? JSON.parse(selectedTrack.points.data) : []),
    [selectedTrack]
  );
  // How many waypoints converting the selected track would give
  const previewWaypoints = useMemo(
    () => simplifyTrack(selectedPoints, tolerance).length,
    [selectedPoints, tolerance]
  );

  // Load tracks from database on mount
  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      setIsLoading(true);
      const loadedTracks = await trackRepository.getAllSorted('desc');
      setDbTracks(loadedTracks);
      
      // Convert compressed points to uncompressed for Redux state
      dispatch(setTracks(loadedTracks.map(fromStoredTrack)));
    } catch (error) {
      console.error('Failed to load tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTrack = (track: DBTrack) => {
    setSelectedTrack(track);
    setConvertedRoute(null);
  };

  const handleColorChange = async (track: DBTrack, color: string) => {
    try {
      await trackRepository.update(track.id!, { color });
      dispatch(setTrackColor({ id: track.id!, color }));
      const updated = { ...track, color };
      setDbTracks((prev) => prev.map((t) => (t.id === track.id ? updated : t)));
      setSelectedTrack(updated);
    } catch (error) {
      console.error('Failed to change track colour:', error);
    }
  };

  // R9.5: a route along the track, with the points where the course changed
  const handleConvertToRoute = async (track: DBTrack) => {
    try {
      const draft = trackToRoute(
        { name: track.name, points: selectedPoints, avgSpeed: track.avgSpeed },
        { tolerance, arrivalRadius, name: `${track.name} (route)` }
      );
      const created = await routeRepository.create(draft);
      dispatch(addRoute(created));
      setConvertedRoute({ name: created.name, waypoints: created.waypoints.length });
    } catch (error) {
      console.error('Failed to convert track to route:', error);
      alert('Failed to convert track to route');
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    try {
      await trackRepository.delete(trackId);
      dispatch(deleteTrack(trackId));
      setDbTracks(dbTracks.filter(t => t.id !== trackId));
      
      if (selectedTrack?.id === trackId) {
        setSelectedTrack(null);
      }
    } catch (error) {
      console.error('Failed to delete track:', error);
      alert('Failed to delete track');
    }
  };

  const handleExportTrack = (track: DBTrack) => {
    try {
      downloadGPX(track);
    } catch (error) {
      console.error('Failed to export track:', error);
      alert('Failed to export track');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tracks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 p-6">
      {/* Left Panel - Track List */}
      <div className="flex-1 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Tracks</h1>
          <p className="text-gray-600">
            View and manage your recorded navigation tracks
          </p>
        </div>

        <TrackList
          tracks={dbTracks}
          onSelectTrack={handleSelectTrack}
          onDeleteTrack={handleDeleteTrack}
          onExportTrack={handleExportTrack}
          selectedTrackId={selectedTrack?.id}
        />
      </div>

      {/* Right Panel - Recording Controls & Track Details */}
      <div className="lg:w-96 space-y-6">
        <TrackRecordingControls
          onTrackSaved={(track) => setDbTracks((prev) => [track, ...prev])}
        />

        {/* Selected Track Details */}
        {selectedTrack && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-4">Track Details</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-sm font-medium">{selectedTrack.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Distance</p>
                  <p className="text-sm font-medium">
                    {units.format('distance', selectedTrack.distance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Speed</p>
                  <p className="text-sm font-medium">
                    {units.format('speed', selectedTrack.avgSpeed)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Max Speed</p>
                  <p className="text-sm font-medium">
                    {units.format('speed', selectedTrack.maxSpeed)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Points</p>
                  <p className="text-sm font-medium">{selectedPoints.length}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500">Start Time</p>
                <p className="text-sm">
                  {new Date(selectedTrack.startTime).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">End Time</p>
                <p className="text-sm">
                  {new Date(selectedTrack.endTime).toLocaleString()}
                </p>
              </div>
            </div>

            <fieldset className="mt-4">
              <legend className="text-xs text-gray-500 mb-1">Colour on the chart</legend>
              <div className="flex flex-wrap gap-2">
                {TRACK_COLORS.map(({ value, name }) => (
                  <button
                    key={value}
                    onClick={() => handleColorChange(selectedTrack, value)}
                    aria-label={name}
                    aria-pressed={trackColor(selectedTrack) === value}
                    className={`w-7 h-7 rounded-full border-2 ${
                      trackColor(selectedTrack) === value
                        ? 'border-gray-900 ring-2 ring-offset-1 ring-gray-400'
                        : 'border-white shadow'
                    }`}
                    style={{ backgroundColor: value }}
                  />
                ))}
              </div>
            </fieldset>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium mb-2">Convert to route</h4>
              <label htmlFor="simplify-tolerance" className="block text-xs text-gray-500 mb-1">
                Simplify: keep points off a straight line by more than ({units.label('distance')})
              </label>
              <input
                id="simplify-tolerance"
                type="number"
                min="0.001"
                step="0.01"
                value={Number(units.toDisplay('distance', tolerance).toFixed(3))}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (Number.isFinite(value) && value > 0) {
                    setTolerance(units.fromDisplay('distance', value));
                  }
                }}
                className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <p className="text-xs text-gray-600 mt-1" data-testid="convert-preview">
                {selectedPoints.length} track points → {previewWaypoints} waypoints
                {previewWaypoints === MAX_CONVERTED_WAYPOINTS && ' (the most a converted route gets)'}
              </p>
              <button
                onClick={() => handleConvertToRoute(selectedTrack)}
                disabled={previewWaypoints < 2}
                className="mt-2 w-full px-4 py-2 border border-blue-600 text-blue-700 rounded hover:bg-blue-50 transition-colors font-medium disabled:opacity-50"
              >
                Convert to route
              </button>
              {convertedRoute && (
                <p role="status" className="text-sm text-green-700 mt-2">
                  Route “{convertedRoute.name}” created with {convertedRoute.waypoints} waypoints.{' '}
                  <Link to="/routes" className="underline">
                    Open Routes
                  </Link>
                </p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleExportTrack(selectedTrack)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
              >
                Export as GPX
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
