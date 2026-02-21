import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { TideService, TidePrediction, Position } from '../types';

export interface TideDisplayProps {
  tideService: TideService;
  position: Position;
  days?: number;
}

export const TideDisplay: React.FC<TideDisplayProps> = ({ 
  tideService, 
  position, 
  days = 3 
}) => {
  const [predictions, setPredictions] = useState<TidePrediction[]>([]);
  const [stationName, setStationName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTideData();
  }, [position, days]);

  const loadTideData = async () => {
    try {
      setLoading(true);
      setError(null);

      const station = await tideService.getNearbyStation(position);
      if (!station) {
        setError('No tide station found nearby');
        setLoading(false);
        return;
      }

      setStationName(station.name);
      const tidePredictions = await tideService.getTidePredictions(station.id, days);
      setPredictions(tidePredictions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tide data');
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

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatHeight = (height: number): string => {
    return `${height.toFixed(1)}m`;
  };

  const groupByDate = (preds: TidePrediction[]): Map<string, TidePrediction[]> => {
    const grouped = new Map<string, TidePrediction[]>();
    preds.forEach(pred => {
      const dateKey = formatDate(pred.timestamp);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(pred);
    });
    return grouped;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading tide data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const groupedPredictions = groupByDate(predictions);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tide Predictions</Text>
        <Text style={styles.stationName}>{stationName}</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {Array.from(groupedPredictions.entries()).map(([date, preds]) => (
          <View key={date} style={styles.dateGroup}>
            <Text style={styles.dateHeader}>{date}</Text>
            {preds.map((pred, index) => (
              <View 
                key={`${pred.stationId}-${pred.timestamp.getTime()}-${index}`} 
                style={styles.predictionRow}
              >
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>{formatTime(pred.timestamp)}</Text>
                </View>
                <View style={[
                  styles.typeContainer,
                  pred.type === 'high' ? styles.highTide : styles.lowTide
                ]}>
                  <Text style={styles.typeText}>
                    {pred.type === 'high' ? 'High' : 'Low'}
                  </Text>
                </View>
                <View style={styles.heightContainer}>
                  <Text style={styles.heightText}>{formatHeight(pred.height)}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  stationName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
    paddingLeft: 4,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 6,
  },
  timeContainer: {
    flex: 1,
  },
  timeText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  typeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  highTide: {
    backgroundColor: '#e3f2fd',
  },
  lowTide: {
    backgroundColor: '#fff3e0',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  heightContainer: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  heightText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
  },
});
