import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { InstrumentDataType } from '../types';
import { RootState } from '../store';

export interface InstrumentAlert {
  id: string;
  dataType: InstrumentDataType;
  message: string;
  value: number;
  threshold: { min?: number; max?: number };
  timestamp: number;
  acknowledged: boolean;
}

export interface InstrumentAlertsProps {
  thresholds: Record<InstrumentDataType, { min?: number; max?: number } | undefined>;
  onAcknowledge?: (alertId: string) => void;
}

/**
 * Component to display active instrument data alerts
 * Requirement 14.5: Visual alerts when thresholds exceeded
 */
export const InstrumentAlerts: React.FC<InstrumentAlertsProps> = ({
  thresholds,
  onAcknowledge,
}) => {
  const [alerts, setAlerts] = useState<InstrumentAlert[]>([]);
  const instrumentData = useSelector((state: RootState) => state.instrument.latestData);

  useEffect(() => {
    const newAlerts: InstrumentAlert[] = [];

    // Check each instrument data type for threshold violations
    Object.entries(instrumentData).forEach(([dataType, data]) => {
      if (!data || typeof data.value !== 'number') return;

      const threshold = thresholds[dataType as InstrumentDataType];
      if (!threshold) return;

      const value = data.value as number;
      let violated = false;
      let message = '';

      if (threshold.min !== undefined && value < threshold.min) {
        violated = true;
        message = `${getDataTypeLabel(dataType as InstrumentDataType)} below minimum (${value.toFixed(1)} < ${threshold.min})`;
      } else if (threshold.max !== undefined && value > threshold.max) {
        violated = true;
        message = `${getDataTypeLabel(dataType as InstrumentDataType)} above maximum (${value.toFixed(1)} > ${threshold.max})`;
      }

      if (violated) {
        newAlerts.push({
          id: `${dataType}-${Date.now()}`,
          dataType: dataType as InstrumentDataType,
          message,
          value,
          threshold,
          timestamp: Date.now(),
          acknowledged: false,
        });
      }
    });

    // Only update if alerts have changed
    if (newAlerts.length > 0 || alerts.length > 0) {
      setAlerts(newAlerts);
    }
  }, [instrumentData, thresholds]);

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
    onAcknowledge?.(alertId);
  };

  const activeAlerts = alerts.filter(alert => !alert.acknowledged);

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>⚠️ Instrument Alerts ({activeAlerts.length})</Text>
      </View>
      <ScrollView style={styles.alertList}>
        {activeAlerts.map(alert => (
          <View key={alert.id} style={styles.alertItem}>
            <View style={styles.alertContent}>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>
                {new Date(alert.timestamp).toLocaleTimeString()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.acknowledgeButton}
              onPress={() => handleAcknowledge(alert.id)}
            >
              <Text style={styles.acknowledgeText}>OK</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

function getDataTypeLabel(dataType: InstrumentDataType): string {
  switch (dataType) {
    case InstrumentDataType.Depth:
      return 'Depth';
    case InstrumentDataType.Speed:
      return 'Speed';
    case InstrumentDataType.Wind:
      return 'Wind';
    case InstrumentDataType.Temperature:
      return 'Temperature';
    case InstrumentDataType.Heading:
      return 'Heading';
    case InstrumentDataType.GPS:
      return 'GPS';
    default:
      return 'Instrument';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2a1a1a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ff4444',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#ff4444',
    padding: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  alertList: {
    maxHeight: 200,
  },
  alertItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a2a2a',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#aaa',
  },
  acknowledgeButton: {
    backgroundColor: '#4a4a4a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  acknowledgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
