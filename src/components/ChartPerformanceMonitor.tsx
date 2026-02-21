import { useEffect, useRef, useCallback } from 'react';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  droppedFrames: number;
}

export interface ChartPerformanceMonitorProps {
  enabled?: boolean;
  targetFPS?: number;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  onPerformanceWarning?: (message: string) => void;
}

/**
 * ChartPerformanceMonitor tracks rendering performance to ensure 60 FPS target.
 * Monitors frame rate, frame time, and dropped frames.
 */
export const useChartPerformanceMonitor = ({
  enabled = false,
  targetFPS = 60,
  onMetricsUpdate,
  onPerformanceWarning,
}: ChartPerformanceMonitorProps = {}) => {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const droppedFrames = useRef(0);
  const animationFrameId = useRef<number>();

  const targetFrameTime = 1000 / targetFPS;

  const measureFrame = useCallback(() => {
    if (!enabled) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime.current;

    frameCount.current++;

    // Check if frame took too long (dropped frame)
    if (deltaTime > targetFrameTime * 1.5) {
      droppedFrames.current++;
      
      if (onPerformanceWarning) {
        onPerformanceWarning(
          `Frame took ${deltaTime.toFixed(2)}ms (target: ${targetFrameTime.toFixed(2)}ms)`
        );
      }
    }

    // Update metrics every second
    if (deltaTime >= 1000) {
      const fps = (frameCount.current * 1000) / deltaTime;
      const avgFrameTime = deltaTime / frameCount.current;

      if (onMetricsUpdate) {
        onMetricsUpdate({
          fps: Math.round(fps),
          frameTime: avgFrameTime,
          droppedFrames: droppedFrames.current,
        });
      }

      // Warn if FPS is below target
      if (fps < targetFPS * 0.9 && onPerformanceWarning) {
        onPerformanceWarning(
          `FPS below target: ${fps.toFixed(1)} (target: ${targetFPS})`
        );
      }

      // Reset counters
      frameCount.current = 0;
      droppedFrames.current = 0;
      lastTime.current = currentTime;
    }

    animationFrameId.current = requestAnimationFrame(measureFrame);
  }, [enabled, targetFPS, targetFrameTime, onMetricsUpdate, onPerformanceWarning]);

  useEffect(() => {
    if (enabled) {
      lastTime.current = performance.now();
      animationFrameId.current = requestAnimationFrame(measureFrame);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [enabled, measureFrame]);

  return {
    reset: () => {
      frameCount.current = 0;
      droppedFrames.current = 0;
      lastTime.current = performance.now();
    },
  };
};

export default useChartPerformanceMonitor;
