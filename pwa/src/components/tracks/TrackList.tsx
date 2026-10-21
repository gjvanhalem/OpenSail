import React, { useState, useCallback } from 'react';
import type { Track } from '@/database/db';
import { useUnits } from '@/hooks/useUnits';
import { trackColor } from '@/utils/trackColors';

interface TrackListProps {
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
  onDeleteTrack: (trackId: string) => void;
  onExportTrack: (track: Track) => void;
  selectedTrackId?: string;
}

// Memoized track item component
const TrackItem = React.memo<{
  track: Track;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
  onExport: () => void;
}>(({ track, isSelected, isExpanded, onSelect, onToggleExpand, onDelete, onExport }) => {
  const units = useUnits();
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (startTime: Date, endTime: Date) => {
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatDistance = (distance: number) => {
    return units.format('distance', distance);
  };

  const formatSpeed = (speed: number) => {
    return units.format('speed', speed);
  };

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-colors ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-surface'
      }`}
    >
      {/* Track Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={onSelect}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: trackColor(track) }}
                data-testid="track-color"
                aria-hidden="true"
              />
              <h3 className="font-semibold text-lg text-gray-900">{track.name}</h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formatDate(track.startTime)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <svg
              className={`w-5 h-5 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Track Stats */}
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div>
            <p className="text-xs text-gray-500">Distance</p>
            <p className="text-sm font-medium">{formatDistance(track.distance)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Duration</p>
            <p className="text-sm font-medium">
              {formatDuration(track.startTime, track.endTime)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg Speed</p>
            <p className="text-sm font-medium">{formatSpeed(track.avgSpeed)}</p>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">Start Time</p>
              <p className="text-sm">{formatDate(track.startTime)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">End Time</p>
              <p className="text-sm">{formatDate(track.endTime)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Max Speed</p>
              <p className="text-sm">{formatSpeed(track.maxSpeed)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Points</p>
              <p className="text-sm">
                {JSON.parse(track.points.data).length} points
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onExport}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Export GPX
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

TrackItem.displayName = 'TrackItem';

export const TrackList: React.FC<TrackListProps> = React.memo(({
  tracks,
  onSelectTrack,
  onDeleteTrack,
  onExportTrack,
  selectedTrackId,
}) => {
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  const toggleExpand = useCallback((trackId: string) => {
    setExpandedTrackId(prev => prev === trackId ? null : trackId);
  }, []);

  const handleDelete = useCallback((track: Track) => {
    if (window.confirm(`Are you sure you want to delete "${track.name}"?`)) {
      onDeleteTrack(track.id!);
    }
  }, [onDeleteTrack]);

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg
          className="w-16 h-16 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <p className="text-lg font-medium">No tracks recorded</p>
        <p className="text-sm">Start recording to create your first track</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tracks.map((track) => (
        <TrackItem
          key={track.id}
          track={track}
          isSelected={selectedTrackId === track.id}
          isExpanded={expandedTrackId === track.id}
          onSelect={() => onSelectTrack(track)}
          onToggleExpand={() => toggleExpand(track.id!)}
          onDelete={() => handleDelete(track)}
          onExport={() => onExportTrack(track)}
        />
      ))}
    </div>
  );
});

TrackList.displayName = 'TrackList';
