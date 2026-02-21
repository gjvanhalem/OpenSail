/**
 * Performance utilities tests
 */

import {
  throttle,
  debounce,
  CircularBuffer,
  FPSMonitor,
  InputLatencyTracker,
  BatteryOptimizer,
  ChartRenderOptimizer,
} from './performance';

describe('Performance Utilities', () => {
  describe('throttle', () => {
    jest.useFakeTimers();

    it('should throttle function calls', () => {
      const mockFn = jest.fn();
      const throttled = throttle(mockFn, 100);

      throttled();
      throttled();
      throttled();

      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      throttled();

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    afterEach(() => {
      jest.clearAllTimers();
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 100);

      debounced();
      debounced();
      debounced();

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    afterEach(() => {
      jest.clearAllTimers();
    });
  });

  describe('CircularBuffer', () => {
    it('should store items up to capacity', () => {
      const buffer = new CircularBuffer<number>(3);

      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.toArray()).toEqual([1, 2, 3]);
      expect(buffer.getSize()).toBe(3);
    });

    it('should overwrite oldest items when full', () => {
      const buffer = new CircularBuffer<number>(3);

      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);

      expect(buffer.toArray()).toEqual([2, 3, 4]);
      expect(buffer.getSize()).toBe(3);
    });

    it('should clear buffer', () => {
      const buffer = new CircularBuffer<number>(3);

      buffer.push(1);
      buffer.push(2);
      buffer.clear();

      expect(buffer.toArray()).toEqual([]);
      expect(buffer.getSize()).toBe(0);
    });
  });

  describe('FPSMonitor', () => {
    it('should initialize with 60 FPS', () => {
      const monitor = new FPSMonitor();
      expect(monitor.getFPS()).toBe(60);
    });

    it('should start and stop monitoring', () => {
      const monitor = new FPSMonitor();
      const callback = jest.fn();

      monitor.start(callback);
      expect(monitor.getFPS()).toBeGreaterThanOrEqual(0);
      
      monitor.stop();
      expect(monitor.getFPS()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('InputLatencyTracker', () => {
    it('should track input latency', () => {
      const tracker = new InputLatencyTracker();

      tracker.recordTouchStart();
      const latency = tracker.recordTouchEnd();

      expect(latency).toBeGreaterThanOrEqual(0);
      expect(tracker.getAverageLatency()).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average latency', () => {
      const tracker = new InputLatencyTracker();

      tracker.recordTouchStart();
      tracker.recordTouchEnd();

      tracker.recordTouchStart();
      tracker.recordTouchEnd();

      const avg = tracker.getAverageLatency();
      expect(avg).toBeGreaterThanOrEqual(0);
    });

    it('should track max latency', () => {
      const tracker = new InputLatencyTracker();

      tracker.recordTouchStart();
      tracker.recordTouchEnd();

      const max = tracker.getMaxLatency();
      expect(max).toBeGreaterThanOrEqual(0);
    });

    it('should reset tracking', () => {
      const tracker = new InputLatencyTracker();

      tracker.recordTouchStart();
      tracker.recordTouchEnd();
      tracker.reset();

      expect(tracker.getAverageLatency()).toBe(0);
      expect(tracker.getMaxLatency()).toBe(0);
    });
  });

  describe('BatteryOptimizer', () => {
    it('should initialize with default settings', () => {
      const optimizer = new BatteryOptimizer();
      const settings = optimizer.getSettings();

      expect(settings.reducedAnimations).toBe(false);
      expect(settings.lowerRefreshRate).toBe(false);
    });

    it('should enable power saving mode', () => {
      const optimizer = new BatteryOptimizer();
      optimizer.enablePowerSavingMode();

      const settings = optimizer.getSettings();
      expect(settings.reducedAnimations).toBe(true);
      expect(settings.lowerRefreshRate).toBe(true);
      expect(settings.dimBacklight).toBe(true);
      expect(settings.disableBackgroundSync).toBe(true);
    });

    it('should disable power saving mode', () => {
      const optimizer = new BatteryOptimizer();
      optimizer.enablePowerSavingMode();
      optimizer.disablePowerSavingMode();

      const settings = optimizer.getSettings();
      expect(settings.reducedAnimations).toBe(false);
      expect(settings.lowerRefreshRate).toBe(false);
    });

    it('should auto-enable power saving when battery is low', () => {
      const optimizer = new BatteryOptimizer();
      optimizer.updateBatteryStatus(0.15, false);

      const settings = optimizer.getSettings();
      expect(settings.reducedAnimations).toBe(true);
    });

    it('should disable power saving when charging', () => {
      const optimizer = new BatteryOptimizer();
      optimizer.updateBatteryStatus(0.15, false);
      optimizer.updateBatteryStatus(0.6, true);

      const settings = optimizer.getSettings();
      expect(settings.reducedAnimations).toBe(false);
    });

    it('should return target FPS based on settings', () => {
      const optimizer = new BatteryOptimizer();

      expect(optimizer.getTargetFPS()).toBe(60);

      optimizer.enablePowerSavingMode();
      expect(optimizer.getTargetFPS()).toBe(30);
    });

    it('should track battery level', () => {
      const optimizer = new BatteryOptimizer();
      optimizer.updateBatteryStatus(0.75, false);

      expect(optimizer.getBatteryLevel()).toBe(0.75);
      expect(optimizer.isDeviceCharging()).toBe(false);
    });
  });

  describe('ChartRenderOptimizer', () => {
    jest.useFakeTimers();

    it('should allow render when enough time has passed', () => {
      const optimizer = new ChartRenderOptimizer();
      optimizer.setTargetFPS(60);

      expect(optimizer.shouldRender()).toBe(true);
      optimizer.markRendered();

      expect(optimizer.shouldRender()).toBe(false);

      jest.advanceTimersByTime(17); // ~60 FPS
      expect(optimizer.shouldRender()).toBe(true);
    });

    it('should throttle render requests', () => {
      const optimizer = new ChartRenderOptimizer();
      optimizer.setTargetFPS(60);

      const mockRender = jest.fn();
      optimizer.requestRender(mockRender);
      optimizer.requestRender(mockRender);

      expect(mockRender).toHaveBeenCalledTimes(1);
    });

    it('should adjust target FPS', () => {
      const optimizer = new ChartRenderOptimizer();
      optimizer.setTargetFPS(30);

      optimizer.markRendered();
      jest.advanceTimersByTime(20);

      expect(optimizer.shouldRender()).toBe(false);

      jest.advanceTimersByTime(15);
      expect(optimizer.shouldRender()).toBe(true);
    });

    afterEach(() => {
      jest.clearAllTimers();
    });
  });
});
