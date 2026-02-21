import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TideService, CurrentPrediction, Position, GeoBounds } from '../types';

export interface CurrentArrowsProps {
  tideService: TideService;
  bounds: GeoBounds;
  currentTime?: Date;
  onCurrentsLoaded?: (currents: CurrentPrediction[]) => void;
}

interface ArrowPosition {
  latitude: number;
  longitude: number;
  direction: number;
  speed: number;
}

export const CurrentArrows: React.FC<CurrentArrowsProps> = ({ 
  tideService, 
  bounds,
  currentTime = new Date(),
  onCurrentsLoaded
}) => {
  const [arrows, setArrows] = useState<ArrowPosition[]>([]);

  useEffect(() => {
    loadCurrentData();
  }, [bounds, currentTime]);

  const loadCurrentData = async () => {
    try {
      // Find stations within bounds
      const centerLat = (bounds.north + bounds.south) / 2;
      const centerLon = (bounds.east + bounds.west) / 2;
      
      const station = await tideService.getNearbyStation({
        latitude: centerLat,
        longitude: centerLon,
        accuracy: 0,
        timestamp: Date.now()
      });

      if (!station) {
        return;
      }

      // Get current predictions for the next hour
      const predictions = await tideService.getCurrentPredictions(station.id, 1);
      
      // Find the prediction closest to current time
      const currentPrediction = predictions.reduce((closest, pred) => {
        const predTime = pred.timestamp.getTime();
        const currentTimeMs = currentTime.getTime();
        const closestTime = closest.timestamp.getTime();
        
        return Math.abs(predTime - currentTimeMs) < Math.abs(closestTime - currentTimeMs)
          ? pred
          : closest;
      }, predictions[0]);

      if (currentPrediction && currentPrediction.speed > 0.1) {
        // Create arrow at station position
        const arrowPos: ArrowPosition = {
          latitude: station.position.latitude,
          longitude: station.position.longitude,
          direction: currentPrediction.direction,
          speed: currentPrediction.speed
        };
        
        setArrows([arrowPos]);
        
        if (onCurrentsLoaded) {
          onCurrentsLoaded([currentPrediction]);
        }
      } else {
        setArrows([]);
      }
    } catch (err) {
      console.error('Failed to load current data:', err);
      setArrows([]);
    }
  };

  // This component is meant to be used as an overlay on a map
  // The actual rendering would be done by the map library (e.g., Mapbox)
  // This component manages the data and provides it to parent components
  
  return null;
};

// Helper function to convert current data to map markers
export const createCurrentMarkers = (
  predictions: CurrentPrediction[],
  position: Position
): ArrowPosition[] => {
  return predictions
    .filter(pred => pred.speed > 0.1) // Only show significant currents
    .map(pred => ({
      latitude: position.latitude,
      longitude: position.longitude,
      direction: pred.direction,
      speed: pred.speed
    }));
};

// Helper function to get arrow color based on current speed
export const getCurrentSpeedColor = (speed: number): string => {
  if (speed < 0.5) return '#4CAF50'; // Green - weak
  if (speed < 1.0) return '#FFC107'; // Yellow - moderate
  if (speed < 2.0) return '#FF9800'; // Orange - strong
  return '#F44336'; // Red - very strong
};

// Helper function to calculate arrow size based on speed
export const getArrowSize = (speed: number): number => {
  const baseSize = 20;
  const scaleFactor = Math.min(speed / 2, 2); // Cap at 2x size
  return baseSize * (1 + scaleFactor);
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
});
