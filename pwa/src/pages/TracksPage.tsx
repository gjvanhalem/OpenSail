import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setTracks, deleteTrack } from '@/store/slices/tracksSlice';
import { trackRepository } from '@/database/repositories/TrackRepository';
import { TrackList } from '@/components/tracks/TrackList';
import { TrackRecordingControls } from '@/components/tracks/TrackRecordingControls';
import { downloadGPX } from '@/utils/gpxExport';
import type { Track as DBTrack } from '@/database/db';

export const TracksPage: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedTrack, setSelectedTrack] = useState<DBTrack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbTracks, setDbTracks] = useState<DBTrack[]>([]);

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
      const tracksWithPoints = loadedTracks.map((track) => ({
        id: track.id!,
        name: track.name,
        startTime: track.startTime,
        endTime: track.endTime,
        distance: track.distance,
        maxSpeed: track.maxSpeed,
        avgSpeed: track.avgSpeed,
        points: JSON.parse(track.points.data),
      }));
      
      dispatch(setTracks(tracksWithPoints));
    } catch (error) {
      console.error('Failed to load tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTrack = (track: DBTrack) => {
    setSelectedTrack(track);
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
        <TrackRecordingControls />

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
                    {selectedTrack.distance.toFixed(2)} nm
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Speed</p>
                  <p className="text-sm font-medium">
                    {selectedTrack.avgSpeed.toFixed(1)} kts
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Max Speed</p>
                  <p className="text-sm font-medium">
                    {selectedTrack.maxSpeed.toFixed(1)} kts
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Points</p>
                  <p className="text-sm font-medium">
                    {JSON.parse(selectedTrack.points.data).length}
                  </p>
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
