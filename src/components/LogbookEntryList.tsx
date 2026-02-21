import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { LogbookEntry } from '../types';

interface LogbookEntryListProps {
  entries: LogbookEntry[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const LogbookEntryList: React.FC<LogbookEntryListProps> = ({
  entries,
  onRefresh,
  refreshing = false,
}) => {
  const getEntryTypeColor = (type: LogbookEntry['type']): string => {
    switch (type) {
      case 'voyage_start':
        return '#4CAF50';
      case 'voyage_end':
        return '#F44336';
      case 'waypoint':
        return '#2196F3';
      case 'note':
        return '#FF9800';
      case 'event':
        return '#9C27B0';
      default:
        return '#757575';
    }
  };

  const renderEntry = ({ item }: { item: LogbookEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={[styles.typeBadge, { backgroundColor: getEntryTypeColor(item.type) }]}>
          <Text style={styles.typeBadgeText}>{item.type.replace('_', ' ').toUpperCase()}</Text>
        </View>
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleDateString()} {item.timestamp.toLocaleTimeString()}
        </Text>
      </View>

      {item.position && (
        <View style={styles.positionRow}>
          <Text style={styles.label}>Position:</Text>
          <Text style={styles.value}>
            {item.position.latitude.toFixed(6)}°N, {item.position.longitude.toFixed(6)}°E
          </Text>
        </View>
      )}

      {item.notes && (
        <View style={styles.notesRow}>
          <Text style={styles.label}>Notes:</Text>
          <Text style={styles.notes}>{item.notes}</Text>
        </View>
      )}

      {(item.distance !== undefined || item.avgSpeed !== undefined || item.maxSpeed !== undefined) && (
        <View style={styles.statsRow}>
          {item.distance !== undefined && (
            <Text style={styles.stat}>Distance: {item.distance.toFixed(1)} nm</Text>
          )}
          {item.avgSpeed !== undefined && (
            <Text style={styles.stat}>Avg: {item.avgSpeed.toFixed(1)} kn</Text>
          )}
          {item.maxSpeed !== undefined && (
            <Text style={styles.stat}>Max: {item.maxSpeed.toFixed(1)} kn</Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      data={entries}
      renderItem={renderEntry}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No logbook entries</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  entryCard: {
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
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  positionRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    color: '#333',
  },
  value: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  notesRow: {
    marginBottom: 8,
  },
  notes: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  stat: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
