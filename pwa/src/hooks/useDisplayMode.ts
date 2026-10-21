import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { isNight } from '@/utils/daylight';

/**
 * Whether the night (red on black) colours are on: always, never, or in Auto
 * from dusk to dawn at the boat's position. Auto checks again every minute.
 */
export function useNightMode(): boolean {
  const mode = useAppSelector((state) => state.settings.settings.displayMode);
  const position = useAppSelector((state) => state.navigation.position);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (mode !== 'auto') return;
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [mode]);

  if (mode === 'auto') return isNight(new Date(now), position);
  return mode === 'night';
}

/** Puts the display mode on <html data-theme>, where the colour tokens (index.css) pick it up */
export function useApplyDisplayMode(): boolean {
  const night = useNightMode();
  useEffect(() => {
    document.documentElement.dataset.theme = night ? 'night' : 'day';
  }, [night]);
  return night;
}
