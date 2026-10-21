import type { BackgroundAlarm, PlatformBackground } from '@/platform/background';
import type { AlertValue, AlertsState } from '@/store/slices/alertsSlice';
import { unacknowledgedAlarms } from '@/store/slices/alertsSlice';

/** The parts of the app state that decide whether the app keeps running with the screen off */
export interface BackgroundModeState {
  safety: { mob: unknown; anchor: unknown };
  routes: { isNavigating: boolean };
  tracks: { isRecording: boolean };
  instruments: { connections: { status: string }[] };
  alerts: AlertsState;
}

/**
 * What needs the app to keep running with the screen off, for the permanent
 * notification: the anchor watch, a man overboard, a route being followed, a
 * track being recorded and an instrument connection (which reconnects by itself).
 */
export function backgroundActivities(state: BackgroundModeState): string[] {
  const activities: string[] = [];
  if (state.safety.mob) activities.push('Man overboard');
  if (state.safety.anchor) activities.push('Anchor watch');
  if (state.routes.isNavigating) activities.push('Route');
  if (state.tracks.isRecording) activities.push('Track recording');
  if (state.instruments.connections.some((c) => c.status === 'connected' || c.status === 'connecting')) {
    activities.push('Instruments');
  }
  return activities;
}

const ALERT_TEXT: Record<AlertValue, { below: string; above: string }> = {
  depth: { below: 'Shallow water', above: 'Depth above the limit' },
  speed: { below: 'Speed below the limit', above: 'Speed above the limit' },
  windSpeed: { below: 'Wind below the limit', above: 'Strong wind' },
};

/** The alarms to show as notifications: safety alarms and instrument alerts nobody silenced yet */
export function backgroundAlarms(alerts: AlertsState): BackgroundAlarm[] {
  const safety = unacknowledgedAlarms(alerts).map((alarm) => ({
    id: alarm.kind,
    title: alarm.kind === 'test' ? 'OpenSail test alarm' : 'OpenSail alarm',
    text: alarm.message,
  }));
  const instruments = Object.values(alerts.active)
    .filter((alert) => alert && !alert.acknowledged)
    .map((alert) => ({
      id: `alert-${alert!.value}`,
      title: ALERT_TEXT[alert!.value][alert!.kind],
      text: 'Open OpenSail to see the reading',
    }));
  return [...safety, ...instruments];
}

/**
 * Hands the app state to the platform's background support: starts, updates
 * and stops the foreground service, and mirrors the alarms as notifications.
 * Platform-neutral: in the browser and the Windows app the calls do nothing.
 */
export class BackgroundModeController {
  private activitiesKey = '';
  private alarms = new Map<string, string>();
  private readonly background: PlatformBackground;

  constructor(background: PlatformBackground) {
    this.background = background;
  }

  update(state: BackgroundModeState): void {
    const activities = backgroundActivities(state);
    const key = activities.join('|');
    if (key !== this.activitiesKey) {
      this.activitiesKey = key;
      this.report(this.background.keepRunning(activities));
    }

    const alarms = backgroundAlarms(state.alerts);
    const ids = new Set(alarms.map((alarm) => alarm.id));
    for (const id of this.alarms.keys()) {
      if (!ids.has(id)) {
        this.alarms.delete(id);
        this.report(this.background.clearAlarm(id));
      }
    }
    for (const alarm of alarms) {
      const shown = `${alarm.title}|${alarm.text}`;
      if (this.alarms.get(alarm.id) === shown) continue;
      this.alarms.set(alarm.id, shown);
      this.report(this.background.showAlarm(alarm));
    }
  }

  private report(call: Promise<void>): void {
    call.catch((error: unknown) => console.warn('Background mode:', error));
  }
}
