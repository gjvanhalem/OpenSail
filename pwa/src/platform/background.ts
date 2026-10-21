import { nativePlatform, type LoadedPlugin } from './platform';

/** An alarm shown as a system notification while the app isn't on screen */
export interface BackgroundAlarm {
  id: string;
  title: string;
  text: string;
}

/**
 * Keeping the app alive with the screen off. A phone stops a web page, and
 * Android may stop an app, once the screen locks; the Android app runs a
 * foreground service with a permanent notification instead, so GPS, the
 * instrument link and the anchor check keep running, and shows alarms as
 * notifications that sound and wake the screen.
 *
 * In the browser and the Windows app (which keeps running when minimised)
 * these calls do nothing.
 */
export interface PlatformBackground {
  /** Keep running while `activities` (e.g. "Anchor watch") are on; an empty list stops it */
  keepRunning(activities: string[]): Promise<void>;
  /** Show (or update) an alarm notification; the Android app only shows it while the app is off screen */
  showAlarm(alarm: BackgroundAlarm): Promise<void>;
  clearAlarm(id: string): Promise<void>;
  /** The user silenced the alarms from the notification */
  onAlarmsSilenced(handler: () => void): Promise<() => void>;
}

/** The Android app's Kotlin plugin (BackgroundPlugin.kt), as registerPlugin('OpenSailBackground') returns it */
export interface CapacitorBackgroundPlugin {
  keepRunning(options: { activities: string[] }): Promise<void>;
  showAlarm(options: BackgroundAlarm): Promise<void>;
  clearAlarm(options: { id: string }): Promise<void>;
  addListener(event: 'alarmsSilenced', handler: () => void): Promise<{ remove(): Promise<void> }>;
}

export function capacitorBackground(load: () => Promise<LoadedPlugin<CapacitorBackgroundPlugin>>): PlatformBackground {
  return {
    keepRunning: async (activities) => (await load()).plugin.keepRunning({ activities }),
    showAlarm: async (alarm) => (await load()).plugin.showAlarm(alarm),
    clearAlarm: async (id) => (await load()).plugin.clearAlarm({ id }),
    onAlarmsSilenced: async (handler) => {
      const handle = await (await load()).plugin.addListener('alarmsSilenced', handler);
      return () => void handle.remove();
    },
  };
}

const nothing: PlatformBackground = {
  keepRunning: async () => {},
  showAlarm: async () => {},
  clearAlarm: async () => {},
  onAlarmsSilenced: async () => () => {},
};

let capacitor: PlatformBackground | null = null;

/** Background support of the platform this page runs on */
export function platformBackground(): PlatformBackground {
  if (nativePlatform() !== 'capacitor') return nothing;
  // Register the plugin once: every load() shares this promise
  let loaded: Promise<LoadedPlugin<CapacitorBackgroundPlugin>> | null = null;
  capacitor ??= capacitorBackground(() =>
    (loaded ??= import('@capacitor/core').then(({ registerPlugin }) => ({
      plugin: registerPlugin<CapacitorBackgroundPlugin>('OpenSailBackground'),
    })))
  );
  return capacitor;
}
