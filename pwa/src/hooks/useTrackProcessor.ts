import { useEffect, useRef, useCallback } from 'react';
import type { TrackPoint } from '@/database/db';
import type { TrackProcessingMessage, TrackProcessingResult } from '@/workers/trackProcessor.worker';

/**
 * Hook to use Web Worker for track processing
 * Offloads heavy computations from main thread
 */
export function useTrackProcessor() {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<Map<string, (result: any) => void>>(new Map());

  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(
      new URL('../workers/trackProcessor.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from worker
    workerRef.current.onmessage = (event: MessageEvent<TrackProcessingResult>) => {
      const { type, data } = event.data;
      const callback = callbacksRef.current.get(type);
      if (callback) {
        callback(data);
        callbacksRef.current.delete(type);
      }
    };

    // Cleanup
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const compressTrack = useCallback(
    (points: TrackPoint[], tolerance: number = 0.0001): Promise<string> => {
      return new Promise((resolve) => {
        if (!workerRef.current) {
          resolve(JSON.stringify(points));
          return;
        }

        callbacksRef.current.set('compressed', resolve);
        const message: TrackProcessingMessage = {
          type: 'compress',
          data: { points, tolerance },
        };
        workerRef.current.postMessage(message);
      });
    },
    []
  );

  const calculateStats = useCallback(
    (
      points: TrackPoint[]
    ): Promise<{
      distance: number;
      avgSpeed: number;
      maxSpeed: number;
      duration: number;
    }> => {
      return new Promise((resolve) => {
        if (!workerRef.current) {
          resolve({ distance: 0, avgSpeed: 0, maxSpeed: 0, duration: 0 });
          return;
        }

        callbacksRef.current.set('calculated', resolve);
        const message: TrackProcessingMessage = {
          type: 'calculate',
          data: { points },
        };
        workerRef.current.postMessage(message);
      });
    },
    []
  );

  const simplifyTrack = useCallback(
    (points: TrackPoint[], tolerance: number = 0.0001): Promise<TrackPoint[]> => {
      return new Promise((resolve) => {
        if (!workerRef.current) {
          resolve(points);
          return;
        }

        callbacksRef.current.set('simplified', resolve);
        const message: TrackProcessingMessage = {
          type: 'simplify',
          data: { points, tolerance },
        };
        workerRef.current.postMessage(message);
      });
    },
    []
  );

  return {
    compressTrack,
    calculateStats,
    simplifyTrack,
  };
}
