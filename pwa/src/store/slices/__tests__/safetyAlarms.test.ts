import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import alertsReducer, {
  alarmSoundFor,
  clearAlarm,
  evaluateAlerts,
  raiseAlarm,
  raiseSafetyAlarm,
  silenceAlarms,
  unacknowledgedAlarms,
  DEFAULT_ALERT_THRESHOLDS,
  type AlertsState,
} from '../alertsSlice';

const empty: AlertsState = { active: {}, alarms: {} };

describe('safety alarms', () => {
  it('raising an alarm again keeps its start time and updates the message', () => {
    let state = alertsReducer(empty, raiseAlarm({ kind: 'anchorDrag', message: 'a', now: 1000 }));
    state = alertsReducer(state, raiseAlarm({ kind: 'anchorDrag', message: 'b', now: 5000 }));
    expect(state.alarms.anchorDrag).toEqual({
      kind: 'anchorDrag',
      message: 'b',
      since: 1000,
      acknowledged: false,
    });
  });

  it('silencing keeps real alarms listed but drops the test alarm', () => {
    let state = alertsReducer(empty, raiseAlarm({ kind: 'mob', message: 'MOB', now: 1 }));
    state = alertsReducer(state, raiseAlarm({ kind: 'test', message: 'test', now: 2 }));
    expect(unacknowledgedAlarms(state).map((a) => a.kind)).toEqual(['mob', 'test']);
    state = alertsReducer(state, silenceAlarms());
    expect(state.alarms.test).toBeUndefined();
    expect(state.alarms.mob?.acknowledged).toBe(true);
    expect(unacknowledgedAlarms(state)).toEqual([]);
  });

  it('a silenced alarm stays silent when raised again, until it is cleared', () => {
    let state = alertsReducer(empty, raiseAlarm({ kind: 'anchorDrag', message: 'a', now: 1 }));
    state = alertsReducer(state, silenceAlarms());
    state = alertsReducer(state, raiseAlarm({ kind: 'anchorDrag', message: 'a', now: 2 }));
    expect(state.alarms.anchorDrag?.acknowledged).toBe(true);
    state = alertsReducer(state, clearAlarm('anchorDrag'));
    state = alertsReducer(state, raiseAlarm({ kind: 'anchorDrag', message: 'a', now: 3 }));
    expect(state.alarms.anchorDrag?.acknowledged).toBe(false);
  });

  it('the siren wins over the instrument beep', () => {
    let state = alertsReducer(
      empty,
      evaluateAlerts({
        readings: { depth: 2, speed: null, windSpeed: null },
        thresholds: DEFAULT_ALERT_THRESHOLDS,
        now: 0,
      })
    );
    expect(alarmSoundFor(state)).toBe('warning');
    state = alertsReducer(state, raiseAlarm({ kind: 'mob', message: 'MOB', now: 1 }));
    expect(alarmSoundFor(state)).toBe('alarm');
    state = alertsReducer(state, silenceAlarms());
    expect(alarmSoundFor(state)).toBe('warning');
    expect(alarmSoundFor(empty)).toBeNull();
  });

  it('the collision alarm follows enableCollisionAlarm', () => {
    const makeStore = (enableCollisionAlarm: boolean) =>
      configureStore({
        reducer: {
          alerts: alertsReducer,
          settings: () => ({ settings: { enableCollisionAlarm } }),
        },
      });
    const off = makeStore(false);
    off.dispatch(raiseSafetyAlarm('collision', 'Target on collision course'));
    off.dispatch(raiseSafetyAlarm('mob', 'MOB'));
    expect(Object.keys(off.getState().alerts.alarms)).toEqual(['mob']);

    const on = makeStore(true);
    on.dispatch(raiseSafetyAlarm('collision', 'Target on collision course'));
    expect(on.getState().alerts.alarms.collision?.message).toBe('Target on collision course');
  });
});
