import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GeolocationPlugin, Position, WatchPositionCallback } from '@capacitor/geolocation';
import { capacitorGeolocation, platformGeolocation, toPositionError } from '../geolocation';

const win = window as unknown as Record<string, unknown>;

afterEach(() => {
  delete win.Capacitor;
});

function position(overrides: Partial<Position['coords']> = {}): Position {
  return {
    timestamp: 1_760_000_000_000,
    coords: {
      latitude: 52.88,
      longitude: 5.36,
      accuracy: 4,
      altitudeAccuracy: null,
      altitude: null,
      speed: 2.5,
      heading: 90,
      magneticHeading: undefined,
      trueHeading: undefined,
      headingAccuracy: undefined,
      course: 85,
      ...overrides,
    },
  };
}

/** @capacitor/geolocation, driven by hand */
function fakePlugin() {
  const callbacks = new Map<string, WatchPositionCallback>();
  let next = 0;
  const plugin = {
    watchPosition: vi.fn(async (_options: unknown, callback: WatchPositionCallback) => {
      const id = `watch-${++next}`;
      callbacks.set(id, callback);
      return id;
    }),
    clearWatch: vi.fn(async ({ id }: { id: string }) => void callbacks.delete(id)),
    getCurrentPosition: vi.fn(async () => position()),
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
  };
  return { plugin: plugin as unknown as GeolocationPlugin & typeof plugin, callbacks };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('platformGeolocation', () => {
  it('is navigator.geolocation in the browser and the Windows app', () => {
    expect(platformGeolocation()).toBe(navigator.geolocation);
  });

  it('is the Capacitor plugin in the Android app', () => {
    win.Capacitor = { isNativePlatform: () => true };
    const geo = platformGeolocation();
    expect(geo).not.toBe(navigator.geolocation);
    expect(geo).toBe(platformGeolocation());
  });
});

describe('capacitorGeolocation', () => {
  it('watches the position and reports the course over ground as heading', async () => {
    const { plugin, callbacks } = fakePlugin();
    const geo = capacitorGeolocation(async () => ({ plugin }));
    const positions: GeolocationPosition[] = [];
    const id = geo.watchPosition((p) => positions.push(p), () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    await flush();
    expect(plugin.watchPosition).toHaveBeenCalledWith({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }, expect.any(Function));
    callbacks.get('watch-1')!(position());
    expect(positions).toHaveLength(1);
    expect(positions[0].coords).toMatchObject({ latitude: 52.88, longitude: 5.36, accuracy: 4, speed: 2.5, heading: 85 });
    expect(positions[0].timestamp).toBe(1_760_000_000_000);

    geo.clearWatch(id);
    await flush();
    expect(plugin.clearWatch).toHaveBeenCalledWith({ id: 'watch-1' });
  });

  it('falls back to heading without a course, and to null', async () => {
    const { plugin, callbacks } = fakePlugin();
    const geo = capacitorGeolocation(async () => ({ plugin }));
    const headings: (number | null)[] = [];
    geo.watchPosition((p) => headings.push(p.coords.heading), () => {});
    await flush();
    callbacks.get('watch-1')!(position({ course: undefined }));
    callbacks.get('watch-1')!(position({ course: undefined, heading: null }));
    expect(headings).toEqual([90, null]);
  });

  it('stops a watch that is cleared before the plugin answered', async () => {
    const { plugin, callbacks } = fakePlugin();
    const geo = capacitorGeolocation(async () => ({ plugin }));
    const success = vi.fn();
    const id = geo.watchPosition(success, () => {});
    geo.clearWatch(id);
    await flush();
    expect(plugin.clearWatch).toHaveBeenCalledWith({ id: 'watch-1' });
    callbacks.get('watch-1')?.(position());
    expect(success).not.toHaveBeenCalled();
  });

  it('reports a denied permission like the browser does', async () => {
    const { plugin, callbacks } = fakePlugin();
    const geo = capacitorGeolocation(async () => ({ plugin }));
    const errors: GeolocationPositionError[] = [];
    geo.watchPosition(() => {}, (e) => errors.push(e));
    await flush();
    callbacks.get('watch-1')!(null, new Error('Location permission was denied'));
    expect(errors[0].code).toBe(errors[0].PERMISSION_DENIED);
    expect(errors[0].message).toBe('Location permission was denied');
  });

  it('reports a plugin that fails to start', async () => {
    const geo = capacitorGeolocation(async () => {
      throw new Error('Location services are not enabled');
    });
    const error = vi.fn();
    geo.watchPosition(() => {}, error);
    await flush();
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ code: 2, message: 'Location services are not enabled' }));
  });

  it('reads the position once', async () => {
    const { plugin } = fakePlugin();
    const geo = capacitorGeolocation(async () => ({ plugin }));
    const position = await new Promise<GeolocationPosition>((resolve, reject) => geo.getCurrentPosition(resolve, reject));
    expect(position.coords.latitude).toBe(52.88);
    expect(JSON.parse(JSON.stringify(position)).coords.longitude).toBe(5.36);
  });

  it('never lets a Promise resolve to the plugin, which is a proxy that answers `then` too', async () => {
    const { plugin } = fakePlugin();
    // Like Capacitor's registerPlugin: every property is a native method, so `then` "exists"
    const proxy = new Proxy(plugin, {
      get: (target, key) =>
        key in target
          ? target[key as keyof typeof target]
          : () => Promise.reject(new Error(`"Geolocation.${String(key)}()" is not implemented on android`)),
    });
    const geo = capacitorGeolocation(async () => ({ plugin: proxy }));
    const position = await new Promise<GeolocationPosition>((resolve, reject) => geo.getCurrentPosition(resolve, reject));
    expect(position.coords.latitude).toBe(52.88);
  });

  it('maps error messages to codes', () => {
    expect(toPositionError(new Error('Could not obtain location in time. Try with a higher timeout.')).code).toBe(3);
    expect(toPositionError(new Error('Location permission request was denied.')).code).toBe(1);
    expect(toPositionError('something else').code).toBe(2);
  });
});
