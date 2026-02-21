import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { InstrumentPanelGrid, defaultPanelConfigs } from './InstrumentPanelGrid';
import { InstrumentAlerts } from './InstrumentAlerts';
import { useInstrumentConnection } from '../hooks/useInstrumentData';
import { InstrumentDataType } from '../types';
import { RootState } from '../store';

export interface InstrumentDisplayProps {
  editable?: boolean;
  alertThresholds?: Record<InstrumentDataType, { min?: number; max?: number } | undefined>;
}

/**
 * Main instrument display component with real-time updates
 * Updates are throttled to 1 second to meet requirement 14.3
 */
export const InstrumentDisplay: React.FC<InstrumentDisplayProps> = ({
  editable = false,
  alertThresholds,
}) => {
  const { connected, status, error, stubMode } = useInstrumentConnection();
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

  // Default alert thresholds if not provided
  const defaultAlertThresholds: Record<InstrumentDataType, { min?: number; max?: number } | undefined> = {
    [InstrumentDataType.Depth]: { min: 2 }, // Alert if depth < 2m
    [InstrumentDataType.Speed]: { max: 30 }, // Alert if speed > 30 knots
    [InstrumentDataType.Wind]: { max: 40 }, // Alert if wind > 40 knots
    [InstrumentDataType.Heading]: undefined,
    [InstrumentDataType.Temperature]: { min: 0, max: 40 },
    [InstrumentDataType.GPS]: undefined,
    [InstrumentDataType.AIS]: undefined,
  };

  const thresholds = alertThresholds || defaultAlertThresholds;

  // Monitor for data updates
  const latestData = useSelector((state: RootState) => state.instrument.latestData);

  useEffect(() => {
    // Update timestamp when any instrument data changes
    setLastUpdateTime(Date.now());
  }, [latestData]);

  // Calculate time since last update
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSinceUpdate(Math.floor((Date.now() - lastUpdateTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdateTime]);

  return (
    <View style={styles.container}>
      {/* Connection status bar */}
      <View style={[styles.statusBar, getStatusBarStyle(status)]}>
        <Text style={styles.statusText}>
          {getStatusText(status, stubMode, timeSinceUpdate)}
        </Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Alert notifications */}
      <View style={styles.alertsContainer}>
        <InstrumentAlerts thresholds={thresholds} />
      </View>

      {/* Instrument panels */}
      <InstrumentPanelGrid configs={defaultPanelConfigs} editable={editable} />
    </View>
  );
};

function getStatusText(
  status: 'disconnected' | 'connecting' | 'connected' | 'error',
  stubMode: boolean,
  timeSinceUpdate: number
): string {
  if (status === 'connected') {
    const mode = stubMode ? 'Simulator' : 'Live';
    return `${mode} - Updated ${timeSinceUpdate}s ago`;
  }
  if (status === 'connecting') {
    return 'Connecting...';
  }
  if (status === 'error') {
    return 'Connection Error';
  }
  return 'Disconnected';
}

function getStatusBarStyle(status: 'disconnected' | 'connecting' | 'connected' | 'error') {
  switch (status) {
    case 'connected':
      return { backgroundColor: '#1a4d1a' };
    case 'connecting':
      return { backgroundColor: '#4d4d1a' };
    case 'error':
      return { backgroundColor: '#4d1a1a' };
    case 'disconnected':
    default:
      return { backgroundColor: '#2a2a2a' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  statusBar: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff6666',
    fontSize: 12,
    marginTop: 4,
  },
  alertsContainer: {
    padding: 16,
    paddingBottom: 0,
  },
});
