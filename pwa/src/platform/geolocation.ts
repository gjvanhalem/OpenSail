import { NATIVE_BUILD, nativePlatform, type LoadedPlugin } from './platform';
import type { GeolocationPlugin, Position as CapacitorPosition } from '@capacitor/geolocation';

/**
 * The phone's or computer's own GPS, with the callback API of
 * navigator.geolocation. In the browser and the Windows app it is
 * navigator.geolocation. In the Android app it is @capacitor/geolocation, which
 * asks for the location permission itself and reads Android's fused location
 * provider: that keeps working while the app runs in the background.
 */
export interface PlatformGeolocation {
  watchPosition(success: PositionCallback, error: PositionErrorCallback, options?: PositionOptions): number;
  clearWatch(id: number): void;
  getCurrentPosition(success: PositionCallback, error: PositionErrorCallback, options?: PositionOptions): void;
}

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

/** A GeolocationPositionError for a plugin error, so callers handle both the same way */
export function toPositionError(error: unknown): GeolocationPositionError {
  const message = error instanceof Error ? error.message : String(error ?? 'Location unavailable');
  let code = POSITION_UNAVAILABLE;
  if (/denied|permission/i.test(message)) code = PERMISSION_DENIED;
  else if (/time ?out|timed out|in time/i.test(message)) code = TIMEOUT;
  return { code, message, PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT } as GeolocationPositionError;
}

/** A GeolocationPosition for a plugin position. `course` is the direction of travel (COG). */
export function toGeolocationPosition(position: CapacitorPosition): GeolocationPosition {
  const { coords } = position;
  const plain = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude ?? null,
    altitudeAccuracy: coords.altitudeAccuracy ?? null,
    heading: coords.course ?? coords.heading ?? null,
    speed: coords.speed ?? null,
  };
  const geoCoords = { ...plain, toJSON: () => plain } as GeolocationCoordinates;
  return {
    coords: geoCoords,
    timestamp: position.timestamp,
    toJSON: () => ({ coords: plain, timestamp: position.timestamp }),
  } as GeolocationPosition;
}

/** navigator.geolocation's API on top of the Capacitor plugin, which is asynchronous and loaded on first use */
export function capacitorGeolocation(load: () => Promise<LoadedPlugin<GeolocationPlugin>>): PlatformGeolocation {
  let nextId = 1;
  /** Our watch ids → the plugin's, once watchPosition answered */
  const watches = new Map<number, Promise<string | null>>();
  const pluginOptions = (options?: PositionOptions) => ({
    enableHighAccuracy: options?.enableHighAccuracy ?? true,
    timeout: options?.timeout,
    maximumAge: options?.maximumAge,
  });

  return {
    watchPosition(success, error, options) {
      const id = nextId++;
      const pluginId = load()
        .then(({ plugin }) =>
          plugin.watchPosition(pluginOptions(options), (position, err) => {
            if (!watches.has(id)) return;
            if (err || !position) error?.(toPositionError(err));
            else success(toGeolocationPosition(position));
          })
        )
        .catch((err: unknown) => {
          error?.(toPositionError(err));
          return null;
        });
      watches.set(id, pluginId);
      return id;
    },

    clearWatch(id) {
      const pluginId = watches.get(id);
      watches.delete(id);
      void pluginId?.then(async (callbackId) => {
        if (callbackId) await (await load()).plugin.clearWatch({ id: callbackId });
      });
    },

    getCurrentPosition(success, error, options) {
      load()
        .then(({ plugin }) => plugin.getCurrentPosition(pluginOptions(options)))
        .then((position) => success(toGeolocationPosition(position)))
        .catch((err: unknown) => error?.(toPositionError(err)));
    },
  };
}

let capacitor: PlatformGeolocation | null = null;

/** The location source of the platform this page runs on, or null without one */
export function platformGeolocation(): PlatformGeolocation | null {
  if (nativePlatform() === 'capacitor') {
    capacitor ??= capacitorGeolocation(() => import('@capacitor/geolocation').then(({ Geolocation }) => ({ plugin: Geolocation })));
    return capacitor;
  }
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) return navigator.geolocation;
  return null;
}

declare global {
  interface Window {
    /** The Android app's smoke test (android/smoke) reads the emulator's position with it */
    __OPENSAIL_GEOLOCATION__?: typeof platformGeolocation;
  }
}

if (NATIVE_BUILD && typeof window !== 'undefined') window.__OPENSAIL_GEOLOCATION__ = platformGeolocation;
