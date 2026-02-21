import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { InstrumentData, InstrumentDataType, UnitSystem } from '../types';
import {
  convertSpeed,
  getSpeedUnit,
  convertDepth,
  getDepthUnit,
  convertTemperature,
  getTemperatureUnit,
  formatValue,
  formatLatitude,
  formatLongitude,
  formatBearing,
} from '../utils/unitConversion';

export interface InstrumentPanelConfig {
  id: string;
  dataType: InstrumentDataType;
  label: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
}

export interface InstrumentPanelProps {
  config: InstrumentPanelConfig;
  data: InstrumentData | null;
  units: UnitSystem;
  alertThreshold?: { min?: number; max?: number };
  onPress?: () => void;
}

export const InstrumentPanel: React.FC<InstrumentPanelProps> = ({
  config,
  data,
  units,
  alertThreshold,
  onPress,
}) => {
  const { label, size } = config;

  // Format value based on data type and units
  const formatValue = (): { value: string; unit: string } => {
    if (!data || data.value === null || data.value === undefined) {
      return { value: '--', unit: '' };
    }

    switch (data.type) {
      case InstrumentDataType.Speed:
        return formatSpeed(data.value as number, units);
      case InstrumentDataType.Depth:
        return formatDepth(data.value as number, units);
      case InstrumentDataType.Wind:
        return formatWind(data.value as { speed: number; direction: number }, units);
      case InstrumentDataType.Heading:
        return formatHeading(data.value as number);
      case InstrumentDataType.Temperature:
        return formatTemperature(data.value as number, units);
      case InstrumentDataType.GPS:
        return formatGPS(data.value as { latitude: number; longitude: number });
      default:
        return { value: String(data.value), unit: data.unit };
    }
  };

  const { value, unit } = formatValue();

  // Check if value exceeds threshold
  const isAlert = checkAlert(data, alertThreshold);

  // Get panel size styles
  const sizeStyle = getSizeStyle(size);

  return (
    <View
      style={[
        styles.container,
        sizeStyle,
        isAlert && styles.alertContainer,
      ]}
      onTouchEnd={onPress}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, isAlert && styles.alertValue]}>{value}</Text>
      {unit && <Text style={styles.unit}>{unit}</Text>}
      {!data && <Text style={styles.noData}>No Data</Text>}
    </View>
  );
};

// Unit conversion functions
function formatSpeed(speed: number, units: UnitSystem): { value: string; unit: string } {
  const converted = convertSpeed(speed, units);
  return { value: formatValue(converted, 1), unit: getSpeedUnit(units) };
}

function formatDepth(depth: number, units: UnitSystem): { value: string; unit: string } {
  const converted = convertDepth(depth, units);
  return { value: formatValue(converted, 1), unit: getDepthUnit(units) };
}

function formatWind(
  wind: { speed: number; direction: number },
  units: UnitSystem
): { value: string; unit: string } {
  const speedConverted = convertSpeed(wind.speed, units);
  return {
    value: `${formatValue(speedConverted, 1)} @ ${formatBearing(wind.direction)}`,
    unit: getSpeedUnit(units),
  };
}

function formatHeading(heading: number): { value: string; unit: string } {
  return { value: formatBearing(heading), unit: '' };
}

function formatTemperature(temp: number, units: UnitSystem): { value: string; unit: string } {
  const converted = convertTemperature(temp, units);
  return { value: formatValue(converted, 1), unit: getTemperatureUnit(units) };
}

function formatGPS(gps: { latitude: number; longitude: number }): { value: string; unit: string } {
  return {
    value: `${formatLatitude(gps.latitude)}\n${formatLongitude(gps.longitude)}`,
    unit: '',
  };
}

function checkAlert(
  data: InstrumentData | null,
  threshold?: { min?: number; max?: number }
): boolean {
  if (!data || !threshold || typeof data.value !== 'number') {
    return false;
  }

  const value = data.value as number;
  if (threshold.min !== undefined && value < threshold.min) {
    return true;
  }
  if (threshold.max !== undefined && value > threshold.max) {
    return true;
  }
  return false;
}

function getSizeStyle(size: 'small' | 'medium' | 'large'): ViewStyle {
  switch (size) {
    case 'small':
      return { width: 100, height: 80 };
    case 'large':
      return { width: 200, height: 160 };
    case 'medium':
    default:
      return { width: 150, height: 120 };
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  alertContainer: {
    borderColor: '#ff4444',
    backgroundColor: '#2a1a1a',
  },
  label: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  alertValue: {
    color: '#ff4444',
  },
  unit: {
    fontSize: 14,
    color: '#aaa',
  },
  noData: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
});
