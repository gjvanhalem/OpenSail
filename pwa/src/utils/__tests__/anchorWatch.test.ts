import { describe, it, expect } from 'vitest';
import type { Position } from '@/models';
import {
  ANCHOR_GPS_LOST_MS,
  DRAG_CONFIRM_MS,
  checkAnchor,
  initialAnchorCheck,
  type AnchorWatchCheck,
  type AnchorWatchEvent,
} from '../safety';

const ANCHOR: Position = { latitude: 52, longitude: 4, accuracy: 3, timestamp: 0 };
const watch = { anchor: ANCHOR, radiusM: 50 };

/** A fix `north` and `east` metres from the anchor */
function offset(north: number, east: number, timestamp: number, accuracy = 3): Position {
  return {
    latitude: ANCHOR.latitude + north / 111_195,
    longitude: ANCHOR.longitude + east / (111_195 * Math.cos((ANCHOR.latitude * Math.PI) / 180)),
    accuracy,
    timestamp,
  };
}

/** Run fixes through the watch, one a second, and collect the events */
function run(
  fixes: ((t: number) => Position)[],
  start: AnchorWatchCheck = initialAnchorCheck(0),
  intervalMs = 1000
) {
  let check = start;
  const events: { at: number; event: AnchorWatchEvent }[] = [];
  fixes.forEach((fix, i) => {
    const t = (i + 1) * intervalMs;
    const result = checkAnchor(watch, check, fix(t), t);
    check = result.check;
    result.events.forEach((event) => events.push({ at: t, event }));
  });
  return { check, events };
}

/** Deterministic pseudo-random jitter in [-1, 1] */
const noise = (i: number) => Math.sin(i * 12.9898 + 78.233) % 1;

describe('checkAnchor', () => {
  it('measures the distance from the anchor', () => {
    const { check } = run([(t) => offset(30, 40, t)]);
    expect(check.distanceM).toBeCloseTo(50, 0);
    expect(check.maxDistanceM).toBeCloseTo(50, 0);
    expect(check.dragging).toBe(false);
  });

  it('holding inside the circle with GPS jitter never alarms', () => {
    // Swinging 30 m from the anchor with ±15 m of jitter, for 10 minutes
    const fixes = Array.from({ length: 600 }, (_, i) => (t: number) => {
      const swing = (i / 100) * Math.PI;
      return offset(
        30 * Math.cos(swing) + 15 * noise(i),
        30 * Math.sin(swing) + 15 * noise(i + 1000),
        t
      );
    });
    const { events, check } = run(fixes);
    expect(events).toEqual([]);
    expect(check.maxDistanceM).toBeLessThan(50);
  });

  it('a single jump outside the circle is ignored', () => {
    const { events } = run([
      (t) => offset(20, 0, t),
      (t) => offset(120, 0, t), // multipath glitch
      (t) => offset(20, 0, t),
      (t) => offset(20, 0, t),
    ]);
    expect(events).toEqual([]);
  });

  it('a few seconds of jitter just outside the edge is ignored', () => {
    // 3 fixes outside, but within DRAG_CONFIRM_MS
    const { events } = run([
      (t) => offset(52, 0, t),
      (t) => offset(53, 0, t),
      (t) => offset(52, 0, t),
      (t) => offset(45, 0, t),
    ]);
    expect(events).toEqual([]);
  });

  it('dragging out of the circle alarms within seconds', () => {
    // Drifting away at 1 m/s from 40 m out
    const fixes = Array.from({ length: 30 }, (_, i) => (t: number) => offset(40 + i, 0, t));
    const { events, check } = run(fixes);
    expect(events.map((e) => e.event)).toEqual(['drag']);
    // First fix outside is 51 m at t = 12 s; confirmed 5 s of fixes later
    expect(events[0].at).toBe(12_000 + DRAG_CONFIRM_MS);
    expect(check.dragging).toBe(true);
  });

  it('with a fix only every 10 s it still alarms after three outside', () => {
    const fixes = Array.from({ length: 5 }, () => (t: number) => offset(80, 0, t));
    const { events } = run(fixes, initialAnchorCheck(0), 10_000);
    expect(events).toEqual([{ at: 30_000, event: 'drag' }]);
  });

  it('back inside needs a small margin, so the alarm does not flap at the edge', () => {
    const outside = Array.from({ length: 8 }, () => (t: number) => offset(60, 0, t));
    const dragging = run(outside);
    expect(dragging.check.dragging).toBe(true);

    // 48 m is inside 50 m but not by the 5 m margin
    const edge = run([(t) => offset(48, 0, t + 10_000)], dragging.check);
    expect(edge.events).toEqual([]);
    expect(edge.check.dragging).toBe(true);

    const back = run([(t) => offset(40, 0, t + 10_000)], dragging.check);
    expect(back.events.map((e) => e.event)).toEqual(['back_inside']);
  });

  it('counts each fix once, however often it is checked', () => {
    let check = initialAnchorCheck(0);
    const fix = offset(80, 0, 1000);
    for (let t = 1000; t < 20_000; t += 1000) {
      check = checkAnchor(watch, check, fix, t).check;
    }
    expect(check.outsideCount).toBe(1);
    expect(check.dragging).toBe(false);
  });

  it('ignores fixes too inaccurate for the radius', () => {
    const fixes = Array.from({ length: 10 }, () => (t: number) => offset(90, 0, t, 80));
    const { events, check } = run(fixes);
    expect(events).toEqual([]);
    expect(check.poorAccuracy).toBe(true);
    expect(check.distanceM).toBeNull();
  });

  it('raises GPS lost after a minute without a usable fix, and clears it after', () => {
    let check = initialAnchorCheck(0);
    const fix = offset(10, 0, 0);
    let result = checkAnchor(watch, check, fix, 0);
    check = result.check;
    result = checkAnchor(watch, check, fix, ANCHOR_GPS_LOST_MS);
    expect(result.events).toEqual([]);
    result = checkAnchor(watch, result.check, fix, ANCHOR_GPS_LOST_MS + 1);
    expect(result.events).toEqual(['gps_lost']);
    expect(result.check.gpsLost).toBe(true);

    result = checkAnchor(watch, result.check, offset(10, 0, 70_000), 70_000);
    expect(result.events).toEqual(['gps_restored']);
    expect(result.check.gpsLost).toBe(false);
  });

  it('no fix at all also counts as GPS lost', () => {
    const result = checkAnchor(watch, initialAnchorCheck(0), null, ANCHOR_GPS_LOST_MS + 1);
    expect(result.events).toEqual(['gps_lost']);
  });
});
