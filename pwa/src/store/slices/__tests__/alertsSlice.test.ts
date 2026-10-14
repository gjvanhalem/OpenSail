import { describe, it, expect } from 'vitest';
import alertsReducer, {
  acknowledgeAlerts,
  evaluateAlerts,
  nextAlert,
  DEFAULT_ALERT_THRESHOLDS,
  type AlertThresholds,
} from '../alertsSlice';

const shallow = { enabled: true, min: 3, max: null };

describe('nextAlert', () => {
  it('starts when a reading goes below the minimum', () => {
    expect(nextAlert(undefined, 'depth', 3.5, shallow, 0)).toBeUndefined();
    expect(nextAlert(undefined, 'depth', 2.9, shallow, 1000)).toEqual({
      value: 'depth',
      kind: 'below',
      limit: 3,
      reading: 2.9,
      since: 1000,
      acknowledged: false,
    });
  });

  it('starts when a reading goes above the maximum', () => {
    const alert = nextAlert(undefined, 'windSpeed', 26, { enabled: true, min: null, max: 25 }, 0);
    expect(alert?.kind).toBe('above');
  });

  it('keeps the start time and updates the reading while active', () => {
    const first = nextAlert(undefined, 'depth', 2.9, shallow, 1000);
    const next = nextAlert(first, 'depth', 2.5, shallow, 2000);
    expect(next).toMatchObject({ since: 1000, reading: 2.5 });
  });

  it('clears only once the reading is back past the hysteresis margin', () => {
    const active = nextAlert(undefined, 'depth', 2.9, shallow, 0);
    // 3.1 is above the 3 m limit but within the 0.2 m margin
    expect(nextAlert(active, 'depth', 3.1, shallow, 1)).toBeDefined();
    expect(nextAlert(active, 'depth', 3.25, shallow, 2)).toBeUndefined();
  });

  it('does nothing when disabled or without a reading', () => {
    expect(nextAlert(undefined, 'depth', 1, { ...shallow, enabled: false }, 0)).toBeUndefined();
    expect(nextAlert(undefined, 'depth', null, shallow, 0)).toBeUndefined();
  });

  it('starts again when the limit changes', () => {
    const active = nextAlert(undefined, 'depth', 2.9, shallow, 0);
    const moved = nextAlert(active, 'depth', 2.9, { ...shallow, min: 4 }, 5);
    expect(moved).toMatchObject({ limit: 4, since: 5, acknowledged: false });
  });
});

describe('alerts reducer', () => {
  const thresholds: AlertThresholds = {
    ...DEFAULT_ALERT_THRESHOLDS,
    windSpeed: { enabled: true, min: null, max: 25 },
  };
  const evaluate = (state: ReturnType<typeof alertsReducer> | undefined, depth: number, wind: number, now: number) =>
    alertsReducer(
      state,
      evaluateAlerts({ readings: { depth, speed: 5, windSpeed: wind }, thresholds, now })
    );

  it('tracks each value separately', () => {
    const state = evaluate(undefined, 2, 30, 0);
    expect(Object.keys(state.active).sort()).toEqual(['depth', 'windSpeed']);
    expect(evaluate(state, 5, 30, 1).active.depth).toBeUndefined();
  });

  it('acknowledged alerts stay acknowledged until they clear and come back', () => {
    let state = evaluate(undefined, 2, 10, 0);
    state = alertsReducer(state, acknowledgeAlerts());
    state = evaluate(state, 1.8, 10, 1);
    expect(state.active.depth?.acknowledged).toBe(true);

    state = evaluate(state, 5, 10, 2);
    state = evaluate(state, 2, 10, 3);
    expect(state.active.depth?.acknowledged).toBe(false);
  });
});
