import React from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { TrackPoint } from '@/database/db';
import { trackColor } from '@/utils/trackColors';

// Redux Track type (with uncompressed points)
interface Track {
  id: string;
  name: string;
  points: TrackPoint[];
  startTime: Date;
  endTime: Date;
  distance: number;
  maxSpeed: number;
  avgSpeed: number;
  color?: string;
}

export interface TrackLayerProps {
  tracks: Track[];
  selectedTrackId?: string;
  showAllTracks?: boolean;
  visible?: boolean;
}

export const TrackLayer: React.FC<TrackLayerProps> = ({
  tracks,
  selectedTrackId,
  showAllTracks = false,
  visible = true,
}) => {
  // Don't render if not visible
  if (!visible) {
    return null;
  }

  // Filter tracks to display
  const tracksToDisplay = showAllTracks
    ? tracks
    : tracks.filter((track) => track.id === selectedTrackId);

  if (tracksToDisplay.length === 0) {
    return null;
  }

  return (
    <>
      {tracksToDisplay.map((track) => {
        const points = track.points;
        const isSelected = track.id === selectedTrackId;

        // Convert track points to GeoJSON LineString
        const geojson = {
          type: 'Feature' as const,
          properties: {
            name: track.name,
            distance: track.distance,
            avgSpeed: track.avgSpeed,
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: points.map((point) => [point.longitude, point.latitude]),
          },
        };

        return (
          <React.Fragment key={track.id}>
            {/* Track line */}
            <Source id={`track-${track.id}`} type="geojson" data={geojson}>
              <Layer
                id={`track-line-${track.id}`}
                type="line"
                paint={{
                  // Each track in its own colour (R9.3); the selected one stands out
                  'line-color': trackColor(track),
                  'line-width': isSelected ? 4 : 2.5,
                  'line-opacity': isSelected ? 0.95 : 0.75,
                }}
              />
            </Source>

            {/* Start point marker */}
            {points.length > 0 && (
              <Source
                id={`track-start-${track.id}`}
                type="geojson"
                data={{
                  type: 'Feature',
                  properties: { type: 'start' },
                  geometry: {
                    type: 'Point',
                    coordinates: [points[0].longitude, points[0].latitude],
                  },
                }}
              >
                <Layer
                  id={`track-start-marker-${track.id}`}
                  type="circle"
                  paint={{
                    'circle-radius': 6,
                    'circle-color': '#10b981',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                  }}
                />
              </Source>
            )}

            {/* End point marker */}
            {points.length > 1 && (
              <Source
                id={`track-end-${track.id}`}
                type="geojson"
                data={{
                  type: 'Feature',
                  properties: { type: 'end' },
                  geometry: {
                    type: 'Point',
                    coordinates: [
                      points[points.length - 1].longitude,
                      points[points.length - 1].latitude,
                    ],
                  },
                }}
              >
                <Layer
                  id={`track-end-marker-${track.id}`}
                  type="circle"
                  paint={{
                    'circle-radius': 6,
                    'circle-color': '#ef4444',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                  }}
                />
              </Source>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};
