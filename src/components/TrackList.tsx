import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { Track, TrackFilter } from '../types';
import { TrackServiceImpl } from '../services/TrackService';

interface TrackListProps {
  onTrackSelect?: (track: Track) => void;
  onConvertToRoute?: (track: Track) => void;
  onExport?: (track: Track) => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  onTrackSelect,
  onConvertToRoute,
  onExport
}) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filter, setFilter] = useState<TrackFilter>({});
  const [loading, setLoading] = useState(true);
  const trackService = new TrackServiceImpl();

  useEffect(() => {
    loadTracks();
  }, [filter]);

  const loadTracks = async () => {
    try {
      setLoading(true);
      const loadedTracks = await trackService.getTracks(filter);
      setTracks(loadedTracks);
    } catch (error) {
      console.error('Failed to load tracks:', error);
      Alert.alert('Error', 'Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (trackId: string) => {
    Alert.alert(
      'Delete Track',
      'Are you sure you want to delete this track?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await trackService.deleteTrack(trackId);
              await loadTracks();
            } catch (error) {
              console.error('Failed to delete track:', error);
              Alert.alert('Error', 'Failed to delete track');
            }
          }
        }
      ]
    );
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatDistance = (distance: number): string => {
    return `${distance.toFixed(2)} nm`;
  };

  const formatSpeed = (speed: number): string => {
    return `${speed.toFixed(1)} kts`;
  };

  const formatDuration = (start: Date, end: Date): string => {
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const renderTrackItem = ({ item }: { item: Track }) => (
    <View style={styles.trackItem}>
      <TouchableOpacity
        style={styles.trackHeader}
        onPress={() => onTrackSelect?.(item)}
      >
        <Text style={styles.trackName}>{item.name}</Text>
        <Text style={styles.trackDate}>{formatDate(item.startTime)}</Text>
      </TouchableOpacity>

      <View style={styles.trackStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{formatDistance(item.distance)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={styles.statValue}>
            {formatDuration(item.startTime, item.endTime)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Avg Speed</Text>
          <Text style={styles.statValue}>{formatSpeed(item.avgSpeed)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Max Speed</Text>
          <Text style={styles.statValue}>{formatSpeed(item.maxSpeed)}</Text>
        </View>
      </View>

      <View style={styles.trackActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onConvertToRoute?.(item)}
        >
          <Text style={styles.actionButtonText}>Convert to Route</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onExport?.(item)}
        >
          <Text style={styles.actionButtonText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recorded Tracks</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            // Open filter dialog
          }}
        >
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading tracks...</Text>
        </View>
      ) : tracks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tracks recorded yet</Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderTrackItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
    borderRadius: 4
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  listContent: {
    padding: 16
  },
  trackItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  trackHeader: {
    marginBottom: 12
  },
  trackName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  trackDate: {
    fontSize: 14,
    color: '#666'
  },
  trackStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0'
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  trackActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2196F3',
    borderRadius: 4,
    marginHorizontal: 4,
    alignItems: 'center'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  deleteButton: {
    backgroundColor: '#f44336'
  },
  deleteButtonText: {
    color: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  }
});
