/**
 * Performance optimization utilities for tablet hardware
 * Handles battery optimization, rendering performance, and input latency
 */

import { InteractionManager, Platform } from 'react-native';

/**
 * Performance metrics tracking
 */
export interface PerformanceMetrics {
  fps: number;
  frameDrops: number;
  memoryUsage: number;
  batteryLevel?: number;
  renderTime: number;
  inputLatency: number;
}

/**
 * Battery optimization settings
 */
export interface BatteryOptimization {
  reducedAnimations: boolean;
  lowerRefreshRate: boolean;
  dimBacklight: boolean;
  disableBackgroundSync: boolean;
}

/**
 * Throttle function calls to reduce CPU usage
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  let lastResult: ReturnType<T>;

  return function (this: any, ...args: Parameters<T>): void {
    if (!inThrottle) {
      inThrottle = true;
      lastResult = func.apply(this, args);
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Debounce function calls to reduce unnecessary updates
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return function (this: any, ...args: Parameters<T>): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

/**
 * Request animation frame wrapper for smooth animations
 */
export const requestAnimationFramePolyfill = (callback: () => void): number => {
  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16) as unknown as number; // ~60fps
};

/**
 * Cancel animation frame
 */
export const cancelAnimationFramePolyfill = (id: number): void => {
  if (typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
};

/**
 * Run task after interactions complete (improves perceived performance)
 */
export const runAfterInteractions = (task: () => void): Promise<void> => {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      task();
      resolve();
    });
  });
};

/**
 * Batch updates to reduce re-renders
 */
export class UpdateBatcher {
  private updates: Array<() => void> = [];
  private scheduled = false;

  add(update: () => void): void {
    this.updates.push(update);
    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFramePolyfill(() => this.flush());
    }
  }

  private flush(): void {
    const updates = this.updates;
    this.updates = [];
    this.scheduled = false;
    updates.forEach((update) => update());
  }
}

/**
 * Memory-efficient data structure for large datasets
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private tail = 0;
  private size = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.size; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity]);
    }
    return result;
  }

  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  getSize(): number {
    return this.size;
  }
}

/**
 * FPS monitor for performance tracking
 */
export class FPSMonitor {
  private frames = 0;
  private lastTime = Date.now();
  private fps = 60;
  private callback?: (fps: number) => void;
  private animationId?: number;

  start(callback?: (fps: number) => void): void {
    this.callback = callback;
    this.tick();
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFramePolyfill(this.animationId);
    }
  }

  getFPS(): number {
    return this.fps;
  }

  private tick = (): void => {
    this.frames++;
    const now = Date.now();
    const delta = now - this.lastTime;

    if (delta >= 1000) {
      this.fps = Math.round((this.frames * 1000) / delta);
      this.frames = 0;
      this.lastTime = now;

      if (this.callback) {
        this.callback(this.fps);
      }
    }

    this.animationId = requestAnimationFramePolyfill(this.tick);
  };
}

/**
 * Input latency tracker
 */
export class InputLatencyTracker {
  private touchStartTime = 0;
  private latencies: number[] = [];
  private maxSamples = 100;

  recordTouchStart(): void {
    this.touchStartTime = Date.now();
  }

  recordTouchEnd(): number {
    const latency = Date.now() - this.touchStartTime;
    this.latencies.push(latency);
    if (this.latencies.length > this.maxSamples) {
      this.latencies.shift();
    }
    return latency;
  }

  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    return sum / this.latencies.length;
  }

  getMaxLatency(): number {
    return Math.max(...this.latencies, 0);
  }

  reset(): void {
    this.latencies = [];
  }
}

/**
 * Battery optimization manager
 */
export class BatteryOptimizer {
  private settings: BatteryOptimization = {
    reducedAnimations: false,
    lowerRefreshRate: false,
    dimBacklight: false,
    disableBackgroundSync: false,
  };

  private batteryLevel = 1.0;
  private isCharging = false;

  setSettings(settings: Partial<BatteryOptimization>): void {
    this.settings = { ...this.settings, ...settings };
  }

  getSettings(): BatteryOptimization {
    return { ...this.settings };
  }

  updateBatteryStatus(level: number, isCharging: boolean): void {
    this.batteryLevel = level;
    this.isCharging = isCharging;

    // Auto-enable optimizations when battery is low
    if (level < 0.2 && !isCharging) {
      this.enablePowerSavingMode();
    } else if (level > 0.5 || isCharging) {
      this.disablePowerSavingMode();
    }
  }

  enablePowerSavingMode(): void {
    this.settings = {
      reducedAnimations: true,
      lowerRefreshRate: true,
      dimBacklight: true,
      disableBackgroundSync: true,
    };
  }

  disablePowerSavingMode(): void {
    this.settings = {
      reducedAnimations: false,
      lowerRefreshRate: false,
      dimBacklight: false,
      disableBackgroundSync: false,
    };
  }

  shouldReduceAnimations(): boolean {
    return this.settings.reducedAnimations;
  }

  shouldLowerRefreshRate(): boolean {
    return this.settings.lowerRefreshRate;
  }

  getTargetFPS(): number {
    return this.settings.lowerRefreshRate ? 30 : 60;
  }

  getBatteryLevel(): number {
    return this.batteryLevel;
  }

  isDeviceCharging(): boolean {
    return this.isCharging;
  }
}

/**
 * Chart rendering optimizer
 */
export class ChartRenderOptimizer {
  private lastRenderTime = 0;
  private minRenderInterval = 16; // 60 FPS
  private pendingRender = false;

  shouldRender(): boolean {
    const now = Date.now();
    const elapsed = now - this.lastRenderTime;
    return elapsed >= this.minRenderInterval;
  }

  markRendered(): void {
    this.lastRenderTime = Date.now();
    this.pendingRender = false;
  }

  requestRender(callback: () => void): void {
    if (this.pendingRender) return;

    if (this.shouldRender()) {
      callback();
      this.markRendered();
    } else {
      this.pendingRender = true;
      const delay = this.minRenderInterval - (Date.now() - this.lastRenderTime);
      setTimeout(() => {
        callback();
        this.markRendered();
      }, delay);
    }
  }

  setTargetFPS(fps: number): void {
    this.minRenderInterval = 1000 / fps;
  }
}

/**
 * Global performance optimizer instance
 */
export const performanceOptimizer = {
  fpsMonitor: new FPSMonitor(),
  inputLatencyTracker: new InputLatencyTracker(),
  batteryOptimizer: new BatteryOptimizer(),
  chartRenderOptimizer: new ChartRenderOptimizer(),
  updateBatcher: new UpdateBatcher(),
};
