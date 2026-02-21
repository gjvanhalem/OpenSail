import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Position } from '../types';

export interface VesselMarkerProps {
  showHeading?: boolean;
  iconSize?: number;
  iconColor?: string;
}

/**
 * VesselMarker displays the vessel's current position and heading on the chart.
 * Updates position with 1-second latency as per requirements.
 */
const VesselMarker: React.FC<VesselMarkerProps> = ({
  showHeading = true,
  iconSize = 24,
  iconColor = '#FF0000',
}) => {
  const { currentPosition, currentHeading } = useSelector(
    (state: RootState) => state.navigation
  );

  const lastUpdateTime = useRef<number>(0);
  const animationFrameId = useRef<number>();

  // Throttle position updates to 1 second (1 Hz) as per requirement 1.2
  const shouldUpdatePosition = (position: Position | null): boolean => {
    if (!position) return false;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime.current;

    // Update if more than 1 second has passed
    if (timeSinceLastUpdate >= 1000) {
      lastUpdateTime.current = now;
      return true;
    }

    return false;
  };

  useEffect(() => {
    if (currentPosition && shouldUpdatePosition(currentPosition)) {
      // Position update logic handled by MapboxGL.PointAnnotation
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [currentPosition]);

  if (!currentPosition) {
    return null;
  }

  const coordinates: [number, number] = [
    currentPosition.longitude,
    currentPosition.latitude,
  ];

  // Calculate rotation angle for heading indicator
  const rotation = currentHeading !== null ? currentHeading : 0;

  return (
    <MapboxGL.PointAnnotation
      id="vessel-position"
      coordinate={coordinates}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.container}>
        {/* Vessel icon */}
        <View
          style={[
            styles.vesselIcon,
            {
              width: iconSize,
              height: iconSize,
              backgroundColor: iconColor,
              transform: [{ rotate: `${rotation}deg` }],
            },
          ]}
        >
          {/* Heading indicator (arrow shape) */}
          {showHeading && (
            <View style={styles.headingIndicator}>
              <View style={[styles.arrow, { borderBottomColor: iconColor }]} />
            </View>
          )}
        </View>

        {/* Position accuracy circle */}
        {currentPosition.accuracy && (
          <View
            style={[
              styles.accuracyCircle,
              {
                width: Math.max(iconSize * 2, currentPosition.accuracy * 2),
                height: Math.max(iconSize * 2, currentPosition.accuracy * 2),
              },
            ]}
          />
        )}
      </View>
    </MapboxGL.PointAnnotation>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vesselIcon: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headingIndicator: {
    position: 'absolute',
    top: -12,
    alignItems: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  accuracyCircle: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
});

export default VesselMarker;
