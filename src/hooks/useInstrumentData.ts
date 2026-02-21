import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { InstrumentData, InstrumentDataType } from '../types';
import { RootState } from '../store';

/**
 * Hook to get real-time instrument data with throttling
 * Updates are throttled to 1 second (1Hz) to meet requirement 14.3
 */
export function useInstrumentData(
  dataType: InstrumentDataType
): InstrumentData | null {
  const latestData = useSelector(
    (state: RootState) => state.instrument.latestData[dataType]
  );
  const [throttledData, setThrottledData] = useState<InstrumentData | null>(latestData);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    // Throttle updates to 1 second (1000ms)
    if (timeSinceLastUpdate >= 1000) {
      setThrottledData(latestData);
      lastUpdateRef.current = now;
      return;
    }
    
    // Schedule update for remaining time
    const timeoutId = setTimeout(() => {
      setThrottledData(latestData);
      lastUpdateRef.current = Date.now();
    }, 1000 - timeSinceLastUpdate);

    return () => clearTimeout(timeoutId);
  }, [latestData]);

  return throttledData;
}

/**
 * Hook to get all instrument data
 */
export function useAllInstrumentData(): Record<InstrumentDataType, InstrumentData | null> {
  return useSelector((state: RootState) => state.instrument.latestData);
}

/**
 * Hook to get connection status
 */
export function useInstrumentConnection(): {
  connected: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
  stubMode: boolean;
} {
  return useSelector((state: RootState) => ({
    connected: state.instrument.connected,
    status: state.instrument.connectionStatus,
    error: state.instrument.error,
    stubMode: state.instrument.stubMode,
  }));
}
