import { afterEach, describe, expect, it, vi } from 'vitest';
import { capacitorBackground, platformBackground, type CapacitorBackgroundPlugin } from '../background';

const win = window as unknown as Record<string, unknown>;

afterEach(() => {
  delete win.Capacitor;
  delete win.__TAURI_INTERNALS__;
});

function fakePlugin() {
  let silenced: (() => void) | null = null;
  const remove = vi.fn(async () => {
    silenced = null;
  });
  const plugin = {
    keepRunning: vi.fn(async () => {}),
    showAlarm: vi.fn(async () => {}),
    clearAlarm: vi.fn(async () => {}),
    addListener: vi.fn(async (_event: 'alarmsSilenced', handler: () => void) => {
      silenced = handler;
      return { remove };
    }),
  };
  return { plugin: plugin as CapacitorBackgroundPlugin & typeof plugin, silence: () => silenced?.(), remove };
}

describe('platformBackground', () => {
  it('does nothing in the browser and the Windows app', async () => {
    await expect(platformBackground().keepRunning(['Anchor watch'])).resolves.toBeUndefined();
    win.__TAURI_INTERNALS__ = {};
    await expect(platformBackground().showAlarm({ id: 'mob', title: 't', text: 'x' })).resolves.toBeUndefined();
    const stop = await platformBackground().onAlarmsSilenced(() => {});
    expect(() => stop()).not.toThrow();
  });

  it('is the OpenSailBackground plugin in the Android app', () => {
    win.Capacitor = { isNativePlatform: () => true };
    expect(platformBackground()).toBe(platformBackground());
  });
});

describe('capacitorBackground', () => {
  it('passes the calls to the Kotlin plugin', async () => {
    const { plugin } = fakePlugin();
    const background = capacitorBackground(async () => ({ plugin }));
    await background.keepRunning(['Anchor watch', 'Instruments']);
    await background.showAlarm({ id: 'anchorDrag', title: 'OpenSail alarm', text: 'Anchor dragging' });
    await background.clearAlarm('anchorDrag');
    expect(plugin.keepRunning).toHaveBeenCalledWith({ activities: ['Anchor watch', 'Instruments'] });
    expect(plugin.showAlarm).toHaveBeenCalledWith({ id: 'anchorDrag', title: 'OpenSail alarm', text: 'Anchor dragging' });
    expect(plugin.clearAlarm).toHaveBeenCalledWith({ id: 'anchorDrag' });
  });

  it('reports Silence taps until unsubscribed', async () => {
    const { plugin, silence, remove } = fakePlugin();
    const handler = vi.fn();
    const stop = await capacitorBackground(async () => ({ plugin })).onAlarmsSilenced(handler);
    silence();
    expect(handler).toHaveBeenCalledOnce();
    stop();
    expect(remove).toHaveBeenCalledOnce();
  });
});
