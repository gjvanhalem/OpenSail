/**
 * Performance monitoring component for tablet optimization testing
 * Displays real-time performance metrics
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  useFPS,
  useInputLatency,
  useBatteryOptimization,
  usePerformanceMetrics,
} from '../hooks/usePerformance';
import { useResponsiveLayout } from '../hooks/useResponsive';

export interface TabletPerformanceMonitorProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const TabletPerformanceMonitor: React.FC<TabletPerformanceMonitorProps> = ({
  visible = true,
  position = 'top-right',
}) => {
  const metrics = usePerformanceMetrics();
  const layout = useResponsiveLayout();
  const { batteryLevel, isCharging, settings } = useBatteryOptimization();

  if (!visible) return null;

  const getPositionStyle = () => {
    const base = {
      position: 'absolute' as const,
      padding: layout.spacing / 2,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderRadius: 8,
      minWidth: 150,
    };

    switch (position) {
      case 'top-left':
        return { ...base, top: 10, left: 10 };
      case 'top-right':
        return { ...base, top: 10, right: 10 };
      case 'bottom-left':
        return { ...base, bottom: 10, left: 10 };
      case 'bottom-right':
        return { ...base, bottom: 10, right: 10 };
      default:
        return { ...base, top: 10, right: 10 };
    }
  };

  const getFPSColor = (fps: number): string => {
    if (fps >= 55) return '#4CAF50'; // Green
    if (fps >= 45) return '#FFC107'; // Yellow
    return '#f44336'; // Red
  };

  const getLatencyColor = (latency: number): string => {
    if (latency <= 50) return '#4CAF50'; // Green
    if (latency <= 100) return '#FFC107'; // Yellow
    return '#f44336'; // Red
  };

  return (
    <View style={getPositionStyle()}>
      <Text style={[styles.title, { fontSize: layout.fontSize.small }]}>
        Performance
      </Text>

      <View style={styles.metric}>
        <Text style={[styles.label, { fontSize: layout.fontSize.small }]}>
          FPS:
        </Text>
        <Text
          style={[
            styles.value,
            { fontSize: layout.fontSize.small, color: getFPSColor(metrics.fps) },
          ]}
        >
          {metrics.fps.toFixed(0)}
        </Text>
      </View>

      <View style={styles.metric}>
        <Text style={[styles.label, { fontSize: layout.fontSize.small }]}>
          Latency:
        </Text>
        <Text
          style={[
            styles.value,
            {
              fontSize: layout.fontSize.small,
              color: getLatencyColor(metrics.inputLatency),
            },
          ]}
        >
          {metrics.inputLatency.toFixed(0)}ms
        </Text>
      </View>

      <View style={styles.metric}>
        <Text style={[styles.label, { fontSize: layout.fontSize.small }]}>
          Battery:
        </Text>
        <Text style={[styles.value, { fontSize: layout.fontSize.small }]}>
          {((batteryLevel || 1) * 100).toFixed(0)}%
          {isCharging && ' ⚡'}
        </Text>
      </View>

      {settings.reducedAnimations && (
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { fontSize: layout.fontSize.small }]}>
            Power Saving
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: '#aaa',
    marginRight: 8,
  },
  value: {
    color: '#fff',
    fontWeight: '600',
  },
  badge: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FFC107',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
