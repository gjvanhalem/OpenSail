import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** Instrument values that can have a min / max alert (R14.5) */
export type AlertValue = 'depth' | 'speed' | 'windSpeed';

export const ALERT_VALUES: AlertValue[] = ['depth', 'speed', 'windSpeed'];

/** Limits in stored units: depth in metres, speeds in knots. Null means no limit. */
export interface AlertThreshold {
  enabled: boolean;
  min: number | null;
  max: number | null;
}

export type AlertThresholds = Record<AlertValue, AlertThreshold>;

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  // Shallow-water alarm on by default
  depth: { enabled: true, min: 3, max: null },
  speed: { enabled: false, min: null, max: null },
  windSpeed: { enabled: false, min: null, max: null },
};

/**
 * How far back past the limit a reading must go before its alert clears, so
 * a value hovering at the limit doesn't flash the alert on and off.
 */
export const ALERT_HYSTERESIS: Record<AlertValue, number> = {
  depth: 0.2,
  speed: 0.2,
  windSpeed: 1,
};

export interface ActiveAlert {
  value: AlertValue;
  kind: 'below' | 'above';
  limit: number;
  reading: number;
  /** When the alert started, ms since epoch */
  since: number;
  /** The user has seen it; the banner hides it until the alert clears and comes back */
  acknowledged: boolean;
}

/**
 * The alert state for one value after a new reading: starts when the reading
 * passes a limit, updates while it stays past it, and clears once it is back
 * inside by the hysteresis margin.
 */
export function nextAlert(
  previous: ActiveAlert | undefined,
  value: AlertValue,
  reading: number | null,
  threshold: AlertThreshold,
  now: number
): ActiveAlert | undefined {
  if (!threshold.enabled || reading === null) return undefined;
  const margin = ALERT_HYSTERESIS[value];

  const check = (kind: 'below' | 'above', limit: number | null): ActiveAlert | undefined => {
    if (limit === null) return undefined;
    const wasActive = previous?.kind === kind && previous.limit === limit;
    const past = kind === 'below' ? reading < limit : reading > limit;
    const stillPast = kind === 'below' ? reading < limit + margin : reading > limit - margin;
    if (!past && !(wasActive && stillPast)) return undefined;
    return wasActive
      ? { ...previous!, reading }
      : { value, kind, limit, reading, since: now, acknowledged: false };
  };

  return check('below', threshold.min) ?? check('above', threshold.max);
}

export interface AlertsState {
  active: Partial<Record<AlertValue, ActiveAlert>>;
}

const initialState: AlertsState = { active: {} };

export interface EvaluateAlertsPayload {
  readings: Record<AlertValue, number | null>;
  thresholds: AlertThresholds;
  now: number;
}

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    evaluateAlerts: (state, action: PayloadAction<EvaluateAlertsPayload>) => {
      const { readings, thresholds, now } = action.payload;
      for (const value of ALERT_VALUES) {
        const alert = nextAlert(state.active[value], value, readings[value], thresholds[value], now);
        if (alert) state.active[value] = alert;
        else delete state.active[value];
      }
    },
    acknowledgeAlerts: (state) => {
      for (const alert of Object.values(state.active)) {
        if (alert) alert.acknowledged = true;
      }
    },
  },
});

export const { evaluateAlerts, acknowledgeAlerts } = alertsSlice.actions;
export default alertsSlice.reducer;
