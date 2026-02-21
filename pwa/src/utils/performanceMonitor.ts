/**
 * Performance monitoring utilities
 * Track and report performance metrics
 */

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  dbQueryTime: number;
}

class PerformanceMonitor {
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private fps = 60;
  private renderTimes: number[] = [];
  private dbQueryTimes: number[] = [];
  private readonly MAX_SAMPLES = 60;

  /**
   * Start monitoring FPS
   */
  startFPSMonitoring(): void {
    const measureFPS = () => {
      this.frameCount++;
      const currentTime = performance.now();
      const elapsed = currentTime - this.lastFrameTime;

      if (elapsed >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.lastFrameTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * Measure render time
   */
  measureRender<T>(fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    this.renderTimes.push(duration);
    if (this.renderTimes.length > this.MAX_SAMPLES) {
      this.renderTimes.shift();
    }

    return result;
  }

  /**
   * Measure async render time
   */
  async measureRenderAsync<T>(fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    this.renderTimes.push(duration);
    if (this.renderTimes.length > this.MAX_SAMPLES) {
      this.renderTimes.shift();
    }

    return result;
  }

  /**
   * Measure database query time
   */
  async measureDBQuery<T>(fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    this.dbQueryTimes.push(duration);
    if (this.dbQueryTimes.length > this.MAX_SAMPLES) {
      this.dbQueryTimes.shift();
    }

    return result;
  }

  /**
   * Get average render time
   */
  getAverageRenderTime(): number {
    if (this.renderTimes.length === 0) return 0;
    return this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
  }

  /**
   * Get average DB query time
   */
  getAverageDBQueryTime(): number {
    if (this.dbQueryTimes.length === 0) return 0;
    return this.dbQueryTimes.reduce((a, b) => a + b, 0) / this.dbQueryTimes.length;
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
    return 0;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      fps: this.getFPS(),
      memoryUsage: this.getMemoryUsage(),
      renderTime: this.getAverageRenderTime(),
      dbQueryTime: this.getAverageDBQueryTime(),
    };
  }

  /**
   * Check if performance is degraded
   */
  isPerformanceDegraded(): boolean {
    const metrics = this.getMetrics();
    return (
      metrics.fps < 30 ||
      metrics.memoryUsage > 0.9 ||
      metrics.renderTime > 100 ||
      metrics.dbQueryTime > 500
    );
  }

  /**
   * Log performance metrics to console
   */
  logMetrics(): void {
    const metrics = this.getMetrics();
    console.log('Performance Metrics:', {
      fps: `${metrics.fps} FPS`,
      memory: `${(metrics.memoryUsage * 100).toFixed(1)}%`,
      render: `${metrics.renderTime.toFixed(2)}ms`,
      dbQuery: `${metrics.dbQueryTime.toFixed(2)}ms`,
    });
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.fps = 60;
    this.renderTimes = [];
    this.dbQueryTimes = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start FPS monitoring
if (typeof window !== 'undefined') {
  performanceMonitor.startFPSMonitoring();
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor() {
  return {
    measureRender: performanceMonitor.measureRender.bind(performanceMonitor),
    measureRenderAsync: performanceMonitor.measureRenderAsync.bind(performanceMonitor),
    measureDBQuery: performanceMonitor.measureDBQuery.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    isPerformanceDegraded: performanceMonitor.isPerformanceDegraded.bind(performanceMonitor),
  };
}
