import { describe, it, expect } from 'vitest';
import type { Position } from '@/models';
import {
  clampAnchorRadius,
  mobFix,
  mobGuidance,
  METRES_PER_NM,
  STALE_FIX_MS,
} from '../safety';

const at = (latitude: number, longitude: number, timestamp = 0): Position => ({
  latitude,
  longitude,
  accuracy: 3,
  timestamp,
});

describe('mobGuidance', () => {
  const target = at(52, 4);

  it('gives bearing and distance back to the MOB spot', () => {
    // 0.01° of latitude due north of the spot is 0.6 nm
    const g = mobGuidance({ target, position: at(52.01, 4), sog: null, direction: null, now: 0 });
    expect(g.bearing).toBeCloseTo(180, 1);
    expect(g.distanceNm).toBeCloseTo(0.6, 2);
    expect(g.distanceM).toBeCloseTo(0.6 * METRES_PER_NM, -1);
    expect(g.eta).toBeNull();
    expect(g.turn).toBeNull();
  });

  it('is accurate to metres close to the spot', () => {
    // 0.0005° of longitude at 52°N is about 34.3 m, the spot is due west
    const g = mobGuidance({ target, position: at(52, 4.0005), sog: 0, direction: 0, now: 0 });
    expect(g.distanceM).toBeGreaterThan(33.5);
    expect(g.distanceM).toBeLessThan(35);
    expect(g.bearing).toBeCloseTo(270, 0);
  });

  it('says which way to turn, the short way round', () => {
    const north = at(52.01, 4); // spot is due south
    const turn = (direction: number) =>
      mobGuidance({ target, position: north, sog: 5, direction, now: 0 }).turn!;
    expect(turn(90)).toBeCloseTo(90, 0); // heading east: starboard 90
    expect(turn(270)).toBeCloseTo(-90, 0); // heading west: port 90
    expect(turn(10)).toBeCloseTo(170, 0);
    expect(turn(350)).toBeCloseTo(-170, 0);
  });

  it('gives an ETA at the current speed', () => {
    const g = mobGuidance({ target, position: at(52.01, 4), sog: 6, direction: 180, now: 1000 });
    // 0.6 nm at 6 kn: 6 minutes
    expect(g.eta!.getTime() - 1000).toBeCloseTo(6 * 60 * 1000, -3);
  });
});

describe('mobFix', () => {
  it('uses the latest fix and flags an old one', () => {
    const fix = at(52, 4, 100_000);
    expect(mobFix(fix, 100_500)).toEqual({ position: fix, stale: false });
    expect(mobFix(fix, 100_000 + STALE_FIX_MS + 1)?.stale).toBe(true);
    expect(mobFix(null, 0)).toBeNull();
  });
});

describe('clampAnchorRadius', () => {
  it('keeps the radius within 10–500 m (R8.1)', () => {
    expect(clampAnchorRadius(5)).toBe(10);
    expect(clampAnchorRadius(42.4)).toBe(42);
    expect(clampAnchorRadius(800)).toBe(500);
    expect(clampAnchorRadius(Number.NaN)).toBe(10);
  });
});
