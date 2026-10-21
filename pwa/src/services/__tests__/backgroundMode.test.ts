import { describe, expect, it, vi } from 'vitest';
import type { PlatformBackground } from '@/platform/background';
import type { AlertsState } from '@/store/slices/alertsSlice';
import { BackgroundModeController, backgroundActivities, backgroundAlarms, type BackgroundModeState } from '../backgroundMode';

function state(overrides: Partial<BackgroundModeState> = {}): BackgroundModeState {
  return {
    safety: { mob: null, anchor: null },
    routes: { isNavigating: false },
    tracks: { isRecording: false },
    instruments: { connections: [] },
    alerts: { active: {}, alarms: {} },
    ...overrides,
  };
}

const anchorDrag: AlertsState = {
  active: {},
  alarms: { anchorDrag: { kind: 'anchorDrag', message: 'Anchor dragging: 62 m', since: 1, acknowledged: false } },
};

function fakeBackground() {
  return {
    keepRunning: vi.fn(async () => {}),
    showAlarm: vi.fn(async () => {}),
    clearAlarm: vi.fn(async () => {}),
    onAlarmsSilenced: vi.fn(async () => () => {}),
  } satisfies PlatformBackground;
}

describe('backgroundActivities', () => {
  it('is empty when nothing needs the screen off', () => {
    expect(backgroundActivities(state())).toEqual([]);
    expect(backgroundActivities(state({ instruments: { connections: [{ status: 'error' }, { status: 'disconnected' }] } }))).toEqual([]);
  });

  it('lists watches, routes, tracks and live instrument connections', () => {
    expect(
      backgroundActivities(
        state({
          safety: { mob: {}, anchor: {} },
          routes: { isNavigating: true },
          tracks: { isRecording: true },
          instruments: { connections: [{ status: 'connecting' }] },
        })
      )
    ).toEqual(['Man overboard', 'Anchor watch', 'Route', 'Track recording', 'Instruments']);
  });
});

describe('backgroundAlarms', () => {
  it('shows safety alarms and instrument alerts nobody silenced', () => {
    const alerts: AlertsState = {
      active: {
        depth: { value: 'depth', kind: 'below', limit: 3, reading: 2.4, since: 1, acknowledged: false },
        windSpeed: { value: 'windSpeed', kind: 'above', limit: 25, reading: 28, since: 1, acknowledged: true },
      },
      alarms: {
        ...anchorDrag.alarms,
        mob: { kind: 'mob', message: 'Man overboard', since: 2, acknowledged: true },
      },
    };
    expect(backgroundAlarms(alerts)).toEqual([
      { id: 'anchorDrag', title: 'OpenSail alarm', text: 'Anchor dragging: 62 m' },
      { id: 'alert-depth', title: 'Shallow water', text: 'Open OpenSail to see the reading' },
    ]);
  });
});

describe('BackgroundModeController', () => {
  it('starts, updates and stops running in the background only when the activities change', () => {
    const background = fakeBackground();
    const controller = new BackgroundModeController(background);
    controller.update(state());
    expect(background.keepRunning).not.toHaveBeenCalled();

    controller.update(state({ safety: { mob: null, anchor: {} } }));
    controller.update(state({ safety: { mob: null, anchor: {} } }));
    expect(background.keepRunning).toHaveBeenCalledTimes(1);
    expect(background.keepRunning).toHaveBeenLastCalledWith(['Anchor watch']);

    controller.update(state({ safety: { mob: null, anchor: {} }, instruments: { connections: [{ status: 'connected' }] } }));
    expect(background.keepRunning).toHaveBeenLastCalledWith(['Anchor watch', 'Instruments']);

    controller.update(state());
    expect(background.keepRunning).toHaveBeenLastCalledWith([]);
    expect(background.keepRunning).toHaveBeenCalledTimes(3);
  });

  it('mirrors the alarms as notifications', () => {
    const background = fakeBackground();
    const controller = new BackgroundModeController(background);
    controller.update(state({ alerts: anchorDrag }));
    controller.update(state({ alerts: anchorDrag }));
    expect(background.showAlarm).toHaveBeenCalledTimes(1);
    expect(background.showAlarm).toHaveBeenCalledWith({ id: 'anchorDrag', title: 'OpenSail alarm', text: 'Anchor dragging: 62 m' });

    // A new message updates the notification
    const further: AlertsState = { active: {}, alarms: { anchorDrag: { ...anchorDrag.alarms.anchorDrag!, message: 'Anchor dragging: 80 m' } } };
    controller.update(state({ alerts: further }));
    expect(background.showAlarm).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Anchor dragging: 80 m' }));

    // Silenced in the app: the notification goes
    const silenced: AlertsState = { active: {}, alarms: { anchorDrag: { ...further.alarms.anchorDrag!, acknowledged: true } } };
    controller.update(state({ alerts: silenced }));
    expect(background.clearAlarm).toHaveBeenCalledWith('anchorDrag');
  });

  it('logs a failing platform call instead of throwing', async () => {
    const background = fakeBackground();
    background.keepRunning.mockRejectedValueOnce(new Error('ForegroundServiceStartNotAllowedException'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    new BackgroundModeController(background).update(state({ routes: { isNavigating: true } }));
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledWith('Background mode:', expect.any(Error));
    warn.mockRestore();
  });
});
