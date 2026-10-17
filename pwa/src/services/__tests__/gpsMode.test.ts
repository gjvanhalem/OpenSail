import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppDispatch } from '@/store';
import { GPSSimulator, getGPSSimulator } from '../GPSSimulator';
import { getGeolocationService } from '../GeolocationService';
import { findSimulatorTrack, getRunningGpsMode, startGpsMode } from '../gpsMode';
import { calculateBearing } from '@/utils/calculations';

const dispatch = vi.fn() as unknown as AppDispatch;

afterEach(() => {
  getGPSSimulator().stop();
  getGeolocationService().stop();
  vi.restoreAllMocks();
});

describe('simulator tracks', () => {
  const tracks = GPSSimulator.getPredefinedTracks();

  it('all run on the IJsselmeer, inside the Dutch inland chart area', () => {
    for (const track of tracks) {
      for (const point of track.waypoints) {
        expect(point.latitude, track.name).toBeGreaterThan(52.7);
        expect(point.latitude, track.name).toBeLessThan(52.95);
        expect(point.longitude, track.name).toBeGreaterThan(5.25);
        expect(point.longitude, track.name).toBeLessThan(5.4);
      }
    }
  });

  it('the harbor track leaves Stavoren heading west, not north', () => {
    const [start, next] = findSimulatorTrack('Harbor Navigation').waypoints;
    const bearing = calculateBearing(start, next);
    expect(bearing).toBeGreaterThan(200);
    expect(bearing).toBeLessThan(300);
  });
});

describe('findSimulatorTrack', () => {
  it('finds a track by name and falls back to the first one', () => {
    expect(findSimulatorTrack('Coastal Cruise').name).toBe('Coastal Cruise');
    expect(findSimulatorTrack('No such track').name).toBe('Harbor Navigation');
  });
});

describe('startGpsMode', () => {
  it('starts the simulator on the named track and reports it as running', async () => {
    await startGpsMode('simulator', 'Open Water Passage', dispatch);
    expect(getRunningGpsMode()).toBe('simulator');
    expect(getGPSSimulator().getTrackName()).toBe('Open Water Passage');
  });

  it('stops whatever runs when switching to off', async () => {
    await startGpsMode('simulator', 'Harbor Navigation', dispatch);
    await startGpsMode('off', 'Harbor Navigation', dispatch);
    expect(getRunningGpsMode()).toBe('off');
  });

  it('switches from the simulator to real GPS', async () => {
    const watchPosition = vi.fn(() => 1);
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { watchPosition, clearWatch: vi.fn() },
    });
    await startGpsMode('simulator', 'Harbor Navigation', dispatch);
    await startGpsMode('real', 'Harbor Navigation', dispatch);
    expect(watchPosition).toHaveBeenCalledOnce();
    expect(getRunningGpsMode()).toBe('real');
    vi.unstubAllGlobals();
  });
});
