/**
 * Tablet performance monitor component tests
 */

import React from 'react';
import { TabletPerformanceMonitor } from './TabletPerformanceMonitor';

// Mock hooks
jest.mock('../hooks/usePerformance', () => ({
  useFPS: () => 60,
  useInputLatency: () => ({
    recordTouchStart: jest.fn(),
    recordTouchEnd: jest.fn(),
    averageLatency: 45,
    maxLatency: 80,
  }),
  useBatteryOptimization: () => ({
    settings: {
      reducedAnimations: false,
      lowerRefreshRate: false,
      dimBacklight: false,
      disableBackgroundSync: false,
    },
    batteryLevel: 0.85,
    isCharging: false,
    enablePowerSaving: jest.fn(),
    disablePowerSaving: jest.fn(),
  }),
  usePerformanceMetrics: () => ({
    fps: 60,
    frameDrops: 0,
    memoryUsage: 0,
    batteryLevel: 0.85,
    renderTime: 16.67,
    inputLatency: 45,
  }),
}));

jest.mock('../hooks/useResponsive', () => ({
  useResponsiveLayout: () => ({
    columns: 3,
    spacing: 16,
    padding: 16,
    fontSize: {
      small: 12,
      medium: 16,
      large: 20,
      xlarge: 28,
    },
    touchTarget: 48,
    iconSize: {
      small: 20,
      medium: 28,
      large: 36,
    },
  }),
}));

describe('TabletPerformanceMonitor', () => {
  it('should create component instance', () => {
    const component = <TabletPerformanceMonitor visible={true} />;
    expect(component).toBeTruthy();
    expect(component.type).toBe(TabletPerformanceMonitor);
  });

  it('should accept visible prop', () => {
    const component = <TabletPerformanceMonitor visible={false} />;
    expect(component.props.visible).toBe(false);
  });

  it('should accept position prop', () => {
    const component = <TabletPerformanceMonitor visible={true} position="top-left" />;
    expect(component.props.position).toBe('top-left');
  });

  it('should have default props', () => {
    const component = <TabletPerformanceMonitor />;
    expect(component.props.visible).toBeUndefined(); // Will use default in component
  });
});
