import { createSlice, type Dispatch, type PayloadAction } from '@reduxjs/toolkit';

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

/**
 * Safety alarms: louder than instrument alerts (a siren and a full-screen
 * alert instead of a beep and a banner). Raised by the safety features and,
 * from Phase 5, the AIS collision check.
 */
export type SafetyAlarmKind = 'mob' | 'anchorDrag' | 'anchorGpsLost' | 'collision' | 'test';

export interface SafetyAlarm {
  kind: SafetyAlarmKind;
  message: string;
  /** When the alarm was raised, ms since epoch */
  since: number;
  /** Silenced by the user; the alarm stays listed until its cause clears */
  acknowledged: boolean;
}

export interface AlertsState {
  active: Partial<Record<AlertValue, ActiveAlert>>;
  alarms: Partial<Record<SafetyAlarmKind, SafetyAlarm>>;
}

const initialState: AlertsState = { active: {}, alarms: {} };

export interface RaiseAlarmPayload {
  kind: SafetyAlarmKind;
  message: string;
  now: number;
}

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
    /** Raise an alarm; raising one that is already active only updates its message */
    raiseAlarm: (state, action: PayloadAction<RaiseAlarmPayload>) => {
      const { kind, message, now } = action.payload;
      const existing = state.alarms[kind];
      if (existing) existing.message = message;
      else state.alarms[kind] = { kind, message, since: now, acknowledged: false };
    },
    /** The cause is gone (or the watch was stopped) */
    clearAlarm: (state, action: PayloadAction<SafetyAlarmKind>) => {
      delete state.alarms[action.payload];
    },
    /** Silence every alarm. A test alarm has no cause to wait for, so it goes away. */
    silenceAlarms: (state) => {
      delete state.alarms.test;
      for (const alarm of Object.values(state.alarms)) {
        if (alarm) alarm.acknowledged = true;
      }
    },
  },
});

export const { evaluateAlerts, acknowledgeAlerts, raiseAlarm, clearAlarm, silenceAlarms } =
  alertsSlice.actions;

interface StateWithAlerts {
  alerts: AlertsState;
  settings?: { settings: { enableCollisionAlarm?: boolean } };
}

/**
 * Raise a safety alarm unless the user turned that kind off in settings
 * (only the collision alarm can be turned off).
 */
export const raiseSafetyAlarm =
  (kind: SafetyAlarmKind, message: string) =>
  (dispatch: Dispatch, getState: () => StateWithAlerts) => {
    if (kind === 'collision' && getState().settings?.settings.enableCollisionAlarm === false) {
      return;
    }
    dispatch(raiseAlarm({ kind, message, now: Date.now() }));
  };

/** Alarms the user has not silenced yet, oldest first */
export function unacknowledgedAlarms(state: AlertsState): SafetyAlarm[] {
  return Object.values(state.alarms)
    .filter((alarm): alarm is SafetyAlarm => alarm !== undefined && !alarm.acknowledged)
    .sort((a, b) => a.since - b.since);
}

/**
 * What should sound: the siren while a safety alarm is not silenced, the beep
 * while an instrument alert is not acknowledged, otherwise nothing.
 */
export function alarmSoundFor(state: AlertsState): 'alarm' | 'warning' | null {
  if (unacknowledgedAlarms(state).length > 0) return 'alarm';
  if (Object.values(state.active).some((alert) => alert && !alert.acknowledged)) return 'warning';
  return null;
}
export default alertsSlice.reducer;
