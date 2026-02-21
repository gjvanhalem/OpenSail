import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Voyage } from '../types';

interface VoyageCardProps {
  voyage: Voyage;
  onPress: () => void;
  selected?: boolean;
}

export const VoyageCard: React.FC<VoyageCardProps> = ({
  voyage,
  onPress,
  selected = false,
}) => {
  const formatDuration = (): string => {
    const end = voyage.endTime || new Date();
    const durationMs = end.getTime() - voyage.startTime.getTime();
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.floor((durationMs % 3600000) / 60000);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  const isActive = !voyage.endTime;

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.selectedCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.date}>
            {voyage.startTime.toLocaleDateString()}
          </Text>
          <Text style={styles.time}>
            {voyage.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {voyage.endTime && ` - ${voyage.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </Text>
        </View>
        
        {isActive && (
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>ACTIVE</Text>
          </View>
        )}
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={styles.statValue}>{formatDuration()}</Text>
        </View>

        {voyage.distance !== undefined && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{voyage.distance.toFixed(1)} nm</Text>
          </View>
        )}

        {voyage.avgSpeed !== undefined && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg Speed</Text>
            <Text style={styles.statValue}>{voyage.avgSpeed.toFixed(1)} kn</Text>
          </View>
        )}

        {voyage.maxSpeed !== undefined && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Max Speed</Text>
            <Text style={styles.statValue}>{voyage.maxSpeed.toFixed(1)} kn</Text>
          </View>
        )}
      </View>

      {voyage.startPosition && (
        <Text style={styles.position}>
          Start: {voyage.startPosition.latitude.toFixed(4)}°, {voyage.startPosition.longitude.toFixed(4)}°
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  time: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 4,
  },
  activeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  statItem: {
    minWidth: 80,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  position: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
});
