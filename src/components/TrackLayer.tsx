import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Track } from '../types';

interface TrackLayerProps {
  tracks: Track[];
  visible: boolean;
  activeTrackId?: string | null;
}

export const TrackLayer: React.FC<TrackLayerProps> = ({
  tracks,
  visible,
  activeTrackId
}) => {
  if (!visible || tracks.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {tracks.map((track, index) => {
        const isActive = track.id === activeTrackId;
        const color = isActive ? '#FF0000' : getTrackColor(index);
        
        return (
          <TrackPolyline
            key={track.id}
            track={track}
            color={color}
            width={isActive ? 3 : 2}
          />
        );
      })}
    </View>
  );
};

interface TrackPolylineProps {
  track: Track;
  color: string;
  width: number;
}

const TrackPolyline: React.FC<TrackPolylineProps> = ({ track, color, width }) => {
  // In a real implementation, this would use Mapbox LineLayer
  // For now, this is a placeholder that shows the structure
  const coordinates = track.points.map(p => [
    p.position.longitude,
    p.position.latitude
  ]);

  return (
    <View style={styles.polyline}>
      {/* Mapbox LineLayer would go here */}
      {/* <LineLayer
        id={`track-${track.id}`}
        sourceID={`track-source-${track.id}`}
        style={{
          lineColor: color,
          lineWidth: width,
          lineOpacity: 0.8
        }}
      /> */}
    </View>
  );
};

const getTrackColor = (index: number): string => {
  const colors = [
    '#2196F3', // Blue
    '#4CAF50', // Green
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#00BCD4', // Cyan
    '#FFEB3B', // Yellow
    '#E91E63', // Pink
    '#795548', // Brown
  ];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none'
  },
  polyline: {
    // Placeholder for polyline rendering
  }
});
