import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import type { Route, RouteWarning } from '@/models';
import { checkRouteHazards } from '@/services/routeHazardService';

/** Safety depth when the depth alert has no minimum set, in metres */
export const DEFAULT_SAFETY_DEPTH = 3;

export interface RouteHazardState {
  warnings: RouteWarning[];
  checking: boolean;
  /** Least depth the route was checked against, in metres */
  safetyDepth: number;
  error: string | null;
}

/**
 * Check a route against the ENC depth data whenever its waypoints change (R2.5).
 * The safety depth is the depth alert's minimum (Settings → Alerts).
 */
export function useRouteHazards(route: Route | null, debounceMs = 400): RouteHazardState {
  const depthAlert = useSelector((state: RootState) => state.settings.settings.alertThresholds?.depth);
  const safetyDepth = depthAlert?.min ?? DEFAULT_SAFETY_DEPTH;
  const [state, setState] = useState<Omit<RouteHazardState, 'safetyDepth'>>({
    warnings: [],
    checking: false,
    error: null,
  });

  // Only the positions matter, not names or timestamps
  const legsKey = useMemo(
    () => route?.waypoints.map((w) => `${w.position.latitude},${w.position.longitude}`).join(';') ?? '',
    [route]
  );

  useEffect(() => {
    if (!route || route.waypoints.length < 2) {
      setState({ warnings: [], checking: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState((previous) => ({ ...previous, checking: true }));
    const timer = setTimeout(() => {
      checkRouteHazards(route, { safetyDepth, signal: controller.signal })
        .then((warnings) => {
          if (!controller.signal.aborted) setState({ warnings, checking: false, error: null });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setState({ warnings: [], checking: false, error: error instanceof Error ? error.message : String(error) });
        });
    }, debounceMs);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // route is read through legsKey: re-check only when a position changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legsKey, safetyDepth, debounceMs]);

  return { ...state, safetyDepth };
}
