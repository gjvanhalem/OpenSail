import type { AppDispatch } from '@/store';
import type { GpsMode } from '@/database/repositories/SettingsRepository';
import { getGeolocationService } from './GeolocationService';
import { getGPSSimulator, GPSSimulator, type SimulatedTrack } from './GPSSimulator';

/** The predefined simulator track with this name, or the first one */
export function findSimulatorTrack(name: string): SimulatedTrack {
  const tracks = GPSSimulator.getPredefinedTracks();
  return tracks.find((track) => track.name === name) ?? tracks[0];
}

/** Which position source is running right now */
export function getRunningGpsMode(): GpsMode {
  if (getGPSSimulator().getIsActive()) return 'simulator';
  if (getGeolocationService().getIsActive()) return 'real';
  return 'off';
}

/**
 * Stop whatever position source runs and start `mode`. Used by the GPS
 * settings and on start-up, to resume the saved mode. Throws when the mode
 * can't start (no Geolocation API, permission denied).
 */
export async function startGpsMode(
  mode: GpsMode,
  trackName: string,
  dispatch: AppDispatch
): Promise<void> {
  const geolocation = getGeolocationService();
  const simulator = getGPSSimulator();
  geolocation.initialize(dispatch);
  simulator.initialize(dispatch);

  if (geolocation.getIsActive()) geolocation.stop();
  if (simulator.getIsActive()) simulator.stop();

  if (mode === 'real') {
    if (!geolocation.isSupported()) {
      throw new Error('Geolocation API is not supported in this browser');
    }
    await geolocation.start();
  } else if (mode === 'simulator') {
    simulator.start(findSimulatorTrack(trackName));
  }
}
