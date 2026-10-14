import { useEffect, useState } from 'react';

/**
 * Debounce a value to reduce update frequency
 * Useful for map updates, search inputs, etc.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle a callback to limit execution frequency
 * Useful for scroll handlers, resize handlers, etc.
 */
export function useThrottle<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number = 300
): T {
  const [lastRun, setLastRun] = useState(() => Date.now());

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRun >= delay) {
      setLastRun(now);
      return callback(...args);
    }
  }) as T;
}
