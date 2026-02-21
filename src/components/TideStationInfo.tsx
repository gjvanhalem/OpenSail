import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TideService, TideStation, TidePrediction, CurrentPrediction, Position } from '../types';

export interface TideStationInfoProps {
  tideService: TideService;
  position: Position;
  onClose?: () => void;
}

export const TideStationInfo: React.FC<TideStationInfoProps> = ({ 
  tideService, 
  position,
  onClose 
}) => {
  const [station, setStation] = useState<TideStation | null>(null);
  const [nextTide, setNextTide] = useState<TidePrediction | null>(null);
  const [currentFlow, setCurrentFlow] = useState<CurrentPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStationData();
  }, [position]);

  const loadStationData = async () => {
    try {
      setLoading(true);
      
      const nearbyStation = await tideService.getNearbyStation(position);
      if (!nearbyStation) {
        setLoading(false);
        return;
      }

      setStation(nearbyStation);

      // Get next tide prediction
      const predictions = await tideService.getTidePredictions(nearbyStation.id, 1);
      const now = new Date();
      const upcoming = predictions.find(p => p.timestamp > now);
      setNextTide(upcoming || null);

      // Get current flow
      const currents = await tideService.getCurrentPredictions(nearbyStation.id, 1);
      const currentPred = currents.find(c => {
        const timeDiff = Math.abs(c.timestamp.getTime() - now.getTime());
        return timeDiff < 30 * 60 * 1000; // Within 30 minutes
      });
      setCurrentFlow(currentPred || null);

    } catch (err) {
      console.error('Failed to load station data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatHeight = (height: number): string => {
    return `${height.toFixed(1)}m`;
  };

  const formatSpeed = (speed: number): string => {
    return `${speed.toFixed(1)} kn`;
  };

  const formatDirection = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(((degrees % 360) / 22.5)) % 16;
    return directions[index];
  };

  const calculateDistance = (pos1: Position, pos2: Position): number => {
    const R = 3440.065; // Nautical miles
    const dLat = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
    const dLon = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;
    const lat1 = (pos1.latitude * Math.PI) / 180;
    const lat2 = (pos2.latitude * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading station info...</Text>
      </View>
    );
  }

  if (!station) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No tide station found nearby</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const distance = calculateDistance(position, station.position);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{station.name}</Text>
        <Text style={styles.distance}>{distance.toFixed(1)} nm away</Text>
      </View>

      {nextTide && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Tide</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Time:</Text>
            <Text style={styles.value}>{formatTime(nextTide.timestamp)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Type:</Text>
            <Text style={[
              styles.value,
              nextTide.type === 'high' ? styles.highTide : styles.lowTide
            ]}>
              {nextTide.type === 'high' ? 'High Tide' : 'Low Tide'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Height:</Text>
            <Text style={styles.value}>{formatHeight(nextTide.height)}</Text>
          </View>
        </View>
      )}

      {currentFlow && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Flow</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Direction:</Text>
            <Text style={styles.value}>
              {formatDirection(currentFlow.direction)} ({currentFlow.direction}°)
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Speed:</Text>
            <Text style={styles.value}>{formatSpeed(currentFlow.speed)}</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Station Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>ID:</Text>
          <Text style={styles.value}>{station.id}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Position:</Text>
          <Text style={styles.value}>
            {station.position.latitude.toFixed(4)}°, {station.position.longitude.toFixed(4)}°
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Timezone:</Text>
          <Text style={styles.value}>{station.timezone}</Text>
        </View>
      </View>

      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  distance: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  highTide: {
    color: '#2196F3',
  },
  lowTide: {
    color: '#FF9800',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
    padding: 20,
  },
});
