import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { InstrumentDataType } from '../types';

export interface AlertThreshold {
  enabled: boolean;
  min?: number;
  max?: number;
}

export interface InstrumentAlertConfigProps {
  dataType: InstrumentDataType;
  threshold: AlertThreshold;
  onThresholdChange: (threshold: AlertThreshold) => void;
}

/**
 * Component for configuring alert thresholds for instrument data
 * Requirement 14.5: Configurable threshold alerts
 */
export const InstrumentAlertConfig: React.FC<InstrumentAlertConfigProps> = ({
  dataType,
  threshold,
  onThresholdChange,
}) => {
  const [localThreshold, setLocalThreshold] = useState<AlertThreshold>(threshold);

  const handleToggle = (enabled: boolean) => {
    const updated = { ...localThreshold, enabled };
    setLocalThreshold(updated);
    onThresholdChange(updated);
  };

  const handleMinChange = (value: string) => {
    const min = value ? parseFloat(value) : undefined;
    const updated = { ...localThreshold, min };
    setLocalThreshold(updated);
    onThresholdChange(updated);
  };

  const handleMaxChange = (value: string) => {
    const max = value ? parseFloat(value) : undefined;
    const updated = { ...localThreshold, max };
    setLocalThreshold(updated);
    onThresholdChange(updated);
  };

  const getLabel = (): string => {
    switch (dataType) {
      case InstrumentDataType.Depth:
        return 'Depth Alert';
      case InstrumentDataType.Speed:
        return 'Speed Alert';
      case InstrumentDataType.Wind:
        return 'Wind Alert';
      case InstrumentDataType.Temperature:
        return 'Temperature Alert';
      case InstrumentDataType.Heading:
        return 'Heading Alert';
      default:
        return 'Alert';
    }
  };

  const getUnit = (): string => {
    switch (dataType) {
      case InstrumentDataType.Depth:
        return 'm';
      case InstrumentDataType.Speed:
        return 'kts';
      case InstrumentDataType.Wind:
        return 'kts';
      case InstrumentDataType.Temperature:
        return '°C';
      case InstrumentDataType.Heading:
        return '°';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{getLabel()}</Text>
        <Switch
          value={localThreshold.enabled}
          onValueChange={handleToggle}
          trackColor={{ false: '#444', true: '#4d7c4d' }}
          thumbColor={localThreshold.enabled ? '#6db36d' : '#888'}
        />
      </View>

      {localThreshold.enabled && (
        <View style={styles.thresholds}>
          <View style={styles.thresholdRow}>
            <Text style={styles.thresholdLabel}>Minimum:</Text>
            <TextInput
              style={styles.input}
              value={localThreshold.min?.toString() || ''}
              onChangeText={handleMinChange}
              keyboardType="numeric"
              placeholder="None"
              placeholderTextColor="#666"
            />
            <Text style={styles.unit}>{getUnit()}</Text>
          </View>

          <View style={styles.thresholdRow}>
            <Text style={styles.thresholdLabel}>Maximum:</Text>
            <TextInput
              style={styles.input}
              value={localThreshold.max?.toString() || ''}
              onChangeText={handleMaxChange}
              keyboardType="numeric"
              placeholder="None"
              placeholderTextColor="#666"
            />
            <Text style={styles.unit}>{getUnit()}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  thresholds: {
    marginTop: 16,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  thresholdLabel: {
    fontSize: 14,
    color: '#aaa',
    width: 80,
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    padding: 8,
    color: '#fff',
    fontSize: 14,
    marginRight: 8,
  },
  unit: {
    fontSize: 14,
    color: '#888',
    width: 40,
  },
});
