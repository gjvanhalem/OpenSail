/**
 * React hooks for performance monitoring and optimization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  performanceOptimizer,
  PerformanceMetrics,
  BatteryOptimization,
  throttle,
  debounce,
} from '../utils/performance';

/**
 * Hook to monitor FPS
 */
export const useFPS = (): number => {
  const [fps, setFPS] = useState(60);

  useEffect(() => {
    performanceOptimizer.fpsMonitor.start((newFps) => {
      setFPS(newFps);
    });

    return () => {
      performanceOptimizer.fpsMonitor.stop();
    };
  }, []);

  return fps;
};

/**
 * Hook to track input latency
 */
export const useInputLatency = (): {
  recordTouchStart: () => void;
  recordTouchEnd: () => number;
  averageLatency: number;
  maxLatency: number;
} => {
  const [averageLatency, setAverageLatency] = useState(0);
  const [maxLatency, setMaxLatency] = useState(0);

  const recordTouchStart = useCallback(() => {
    performanceOptimizer.inputLatencyTracker.recordTouchStart();
  }, []);

  const recordTouchEnd = useCallback(() => {
    const latency = performanceOptimizer.inputLatencyTracker.recordTouchEnd();
    setAverageLatency(performanceOptimizer.inputLatencyTracker.getAverageLatency());
    setMaxLatency(performanceOptimizer.inputLatencyTracker.getMaxLatency());
    return latency;
  }, []);

  return {
    recordTouchStart,
    recordTouchEnd,
    averageLatency,
    maxLatency,
  };
};

/**
 * Hook for battery optimization
 */
export const useBatteryOptimization = (): {
  settings: BatteryOptimization;
  batteryLevel: number;
  isCharging: boolean;
  enablePowerSaving: () => void;
  disablePowerSaving: () => void;
} => {
  const [settings, setSettings] = useState<BatteryOptimization>(
    performanceOptimizer.batteryOptimizer.getSettings()
  );
  const [batteryLevel, setBatteryLevel] = useState(1.0);
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    // In a real app, you would use a battery API here
    // For now, we'll simulate battery monitoring
    const interval = setInterval(() => {
      const level = performanceOptimizer.batteryOptimizer.getBatteryLevel();
      const charging = performanceOptimizer.batteryOptimizer.isDeviceCharging();
      setBatteryLevel(level);
      setIsCharging(charging);
      setSettings(performanceOptimizer.batteryOptimizer.getSettings());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const enablePowerSaving = useCallback(() => {
    performanceOptimizer.batteryOptimizer.enablePowerSavingMode();
    setSettings(performanceOptimizer.batteryOptimizer.getSettings());
  }, []);

  const disablePowerSaving = useCallback(() => {
    performanceOptimizer.batteryOptimizer.disablePowerSavingMode();
    setSettings(performanceOptimizer.batteryOptimizer.getSettings());
  }, []);

  return {
    settings,
    batteryLevel,
    isCharging,
    enablePowerSaving,
    disablePowerSaving,
  };
};

/**
 * Hook for throttled callbacks
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const throttledRef = useRef(throttle(callback, delay));

  useEffect(() => {
    throttledRef.current = throttle(callback, delay);
  }, [callback, delay]);

  return throttledRef.current;
};

/**
 * Hook for debounced callbacks
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const debouncedRef = useRef(debounce(callback, delay));

  useEffect(() => {
    debouncedRef.current = debounce(callback, delay);
  }, [callback, delay]);

  return debouncedRef.current;
};

/**
 * Hook for optimized chart rendering
 */
export const useChartRenderOptimization = (): {
  requestRender: (callback: () => void) => void;
  setTargetFPS: (fps: number) => void;
} => {
  const requestRender = useCallback((callback: () => void) => {
    performanceOptimizer.chartRenderOptimizer.requestRender(callback);
  }, []);

  const setTargetFPS = useCallback((fps: number) => {
    performanceOptimizer.chartRenderOptimizer.setTargetFPS(fps);
  }, []);

  return {
    requestRender,
    setTargetFPS,
  };
};

/**
 * Hook to get comprehensive performance metrics
 */
export const usePerformanceMetrics = (): PerformanceMetrics => {
  const fps = useFPS();
  const { averageLatency, maxLatency } = useInputLatency();
  const { batteryLevel } = useBatteryOptimization();

  return {
    fps,
    frameDrops: fps < 55 ? 60 - fps : 0,
    memoryUsage: 0, // Would need native module to get actual memory usage
    batteryLevel,
    renderTime: 1000 / fps,
    inputLatency: averageLatency,
  };
};
