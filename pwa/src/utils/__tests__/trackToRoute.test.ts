import { describe, it, expect } from 'vitest';
import type { TrackPoint } from '@/database/db';
import { simplifyTrack, trackToRoute, MAX_CONVERTED_WAYPOINTS } from '../trackToRoute';
import { TRACK_COLORS, trackColor } from '../trackColors';

const point = (latitude: number, longitude: number, i = 0): TrackPoint => ({
  latitude,
  longitude,
  speed: 6,
  heading: 0,
  timestamp: new Date(Date.UTC(2026, 9, 15) + i * 10_000),
});

/** North 1.2 nm then east 1.48 nm, a point every ~20 m with ~5 m of wobble */
function lShapedTrack(): TrackPoint[] {
  const points: TrackPoint[] = [];
  const wobble = (i: number) => Math.sin(i * 1.7) * 0.00007;
  for (let i = 0; i <= 100; i++) points.push(point(52 + i * 0.0002, 4 + wobble(i), points.length));
  for (let i = 1; i <= 100; i++) points.push(point(52.02 + wobble(i), 4 + i * 0.0004, points.length));
  return points;
}

describe('simplifyTrack', () => {
  it('keeps the corners of a wobbly track and drops the rest', () => {
    const simplified = simplifyTrack(lShapedTrack(), 0.05);
    expect(simplified).toHaveLength(3);
    expect(simplified[1].latitude).toBeCloseTo(52.02, 3);
    expect(simplified[1].longitude).toBeCloseTo(4, 3);
  });

  it('always keeps the first and last points', () => {
    const track = lShapedTrack();
    const simplified = simplifyTrack(track, 10);
    expect(simplified).toEqual([track[0], track[track.length - 1]]);
  });

  it('keeps more points at a tighter tolerance', () => {
    expect(simplifyTrack(lShapedTrack(), 0.001, 1000).length).toBeGreaterThan(3);
  });

  it('keeps only the most significant points beyond the waypoint limit', () => {
    // A zig-zag with a turn every point would otherwise keep all 400
    const zigzag = Array.from({ length: 400 }, (_, i) => point(52 + i * 0.001, 4 + (i % 2) * 0.002, i));
    expect(simplifyTrack(zigzag, 0.001).length).toBeLessThanOrEqual(MAX_CONVERTED_WAYPOINTS);
    expect(simplifyTrack(zigzag, 0.001, 10).length).toBeLessThanOrEqual(10);
  });

  it('keeps the corners first when the limit cuts points', () => {
    // At a tight tolerance the wobble counts too, but the corner matters most
    const simplified = simplifyTrack(lShapedTrack(), 0.001, 3);
    expect(simplified).toHaveLength(3);
    expect(simplified[1].latitude).toBeCloseTo(52.02, 3);
  });

  it('handles 100 hours of points at one every 10 seconds', () => {
    // A slow circle round and round: 36,000 points
    const points = Array.from({ length: 36_000 }, (_, i) =>
      point(52 + 0.05 * Math.sin(i / 500), 4 + 0.08 * Math.cos(i / 500), i)
    );
    const started = performance.now();
    const simplified = simplifyTrack(points);
    expect(performance.now() - started).toBeLessThan(2000);
    expect(simplified.length).toBeGreaterThan(2);
    expect(simplified.length).toBeLessThanOrEqual(MAX_CONVERTED_WAYPOINTS);
  });

  it('leaves tracks of up to two points alone', () => {
    expect(simplifyTrack([])).toEqual([]);
    expect(simplifyTrack([point(52, 4)])).toHaveLength(1);
  });
});

describe('trackToRoute', () => {
  it('makes a route of named waypoints with distance and planned duration', () => {
    const route = trackToRoute(
      { name: 'Morning sail', points: lShapedTrack(), avgSpeed: 4 },
      { arrivalRadius: 0.05, now: new Date(0) }
    );
    expect(route.name).toBe('Morning sail');
    expect(route.waypoints.map((w) => w.name)).toEqual(['WP1', 'WP2', 'WP3']);
    expect(route.waypoints.every((w) => w.arrivalRadius === 0.05)).toBe(true);
    expect(new Set(route.waypoints.map((w) => w.id)).size).toBe(3);
    // 1.20 nm north + 1.48 nm east
    expect(route.totalDistance).toBeCloseTo(2.68, 1);
    expect(route.estimatedDuration).toBeCloseTo(route.totalDistance / 4, 6);
  });
});

describe('trackColor', () => {
  it('uses the chosen colour', () => {
    expect(trackColor({ id: 'a', color: '#123456' })).toBe('#123456');
  });

  it('picks the same palette colour for the same track every time', () => {
    const palette = TRACK_COLORS.map((c) => c.value) as string[];
    expect(palette).toContain(trackColor({ id: 'track_1' }));
    expect(trackColor({ id: 'track_1' })).toBe(trackColor({ id: 'track_1' }));
  });

  it('gives different tracks different colours', () => {
    const colours = new Set(['t1', 't2', 't3', 't4', 't5', 't6'].map((id) => trackColor({ id })));
    expect(colours.size).toBeGreaterThan(1);
  });
});
