import { describe, it, expect } from 'vitest';
import type { Position, Route, Waypoint } from '@/models';
import { calculateDestination, calculateDistance } from '../calculations';
import {
  calculateRouteGuidance,
  effectiveArrivalRadius,
  nextWaypointIndex,
} from '../routeGuidance';

const pos = (latitude: number, longitude: number): Position => ({
  latitude,
  longitude,
  accuracy: 0,
  timestamp: 0,
});

const wp = (latitude: number, longitude: number, name: string, arrivalRadius = 0.1): Waypoint => ({
  id: `wp-${name}`,
  name,
  position: pos(latitude, longitude),
  arrivalRadius,
});

const routeOf = (waypoints: Waypoint[]): Route => ({
  id: 'r1',
  name: 'Test',
  waypoints,
  totalDistance: 0,
  estimatedDuration: 0,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

// Due north along 5°W: one degree of latitude is 60 nm
const north = routeOf([wp(50, -5, 'A'), wp(51, -5, 'B'), wp(52, -5, 'C')]);
const NOW = Date.UTC(2026, 9, 15, 12, 0, 0);

describe('calculateRouteGuidance', () => {
  it('gives bearing and distance to the active waypoint', () => {
    const g = calculateRouteGuidance({ route: north, activeIndex: 1, position: pos(50.5, -5), sog: 6, now: NOW })!;
    expect(g.targetWaypoint.name).toBe('B');
    expect(g.bearingToWaypoint).toBeCloseTo(0, 5);
    expect(g.distanceToWaypoint).toBeCloseTo(30, 0);
    expect(g.legBearing).toBeCloseTo(0, 5);
  });

  it('measures cross-track error: positive right of the leg, negative left', () => {
    const onLeg = pos(50.5, -5);
    const right = calculateDestination(onLeg, 90, 0.5);
    const left = calculateDestination(onLeg, 270, 0.25);

    const r = calculateRouteGuidance({ route: north, activeIndex: 1, position: right, sog: 6, now: NOW })!;
    const l = calculateRouteGuidance({ route: north, activeIndex: 1, position: left, sog: 6, now: NOW })!;
    const on = calculateRouteGuidance({ route: north, activeIndex: 1, position: onLeg, sog: 6, now: NOW })!;

    expect(r.crossTrackError!).toBeCloseTo(0.5, 2);
    expect(l.crossTrackError!).toBeCloseTo(-0.25, 2);
    expect(on.crossTrackError!).toBeCloseTo(0, 5);
  });

  it('works out ETA to the waypoint and the end of the route from SOG', () => {
    const g = calculateRouteGuidance({ route: north, activeIndex: 1, position: pos(50.5, -5), sog: 6, now: NOW })!;
    // 30 nm to B at 6 kn = 5 h; then 60 nm more to C = 15 h in all
    expect(g.remainingDistance).toBeCloseTo(90, 0);
    expect((g.etaWaypoint!.getTime() - NOW) / 3_600_000).toBeCloseTo(5, 1);
    expect((g.etaRoute!.getTime() - NOW) / 3_600_000).toBeCloseTo(15, 1);
  });

  it('has no ETA when the boat is not moving', () => {
    for (const sog of [null, 0, 0.05]) {
      const g = calculateRouteGuidance({ route: north, activeIndex: 1, position: pos(50.5, -5), sog, now: NOW })!;
      expect(g.etaWaypoint).toBeNull();
      expect(g.etaRoute).toBeNull();
    }
  });

  it('starts the first leg where navigation started', () => {
    const start = pos(49.5, -5);
    const g = calculateRouteGuidance({
      route: north,
      activeIndex: 0,
      position: calculateDestination(pos(49.75, -5), 90, 0.2),
      sog: 5,
      navigationStart: start,
      now: NOW,
    })!;
    expect(g.legStart).toEqual(start);
    expect(g.crossTrackError!).toBeCloseTo(0.2, 2);
  });

  it('has no leg, and so no XTE, for the first waypoint without a start position', () => {
    const g = calculateRouteGuidance({ route: north, activeIndex: 0, position: pos(49.5, -5), sog: 5, now: NOW })!;
    expect(g.crossTrackError).toBeNull();
    expect(g.legBearing).toBeNull();
    expect(g.distanceToWaypoint).toBeCloseTo(30, 0);
  });

  it('returns null past the end of the route', () => {
    expect(calculateRouteGuidance({ route: north, activeIndex: 3, position: pos(50, -5), sog: 5 })).toBeNull();
  });
});

describe('arrival', () => {
  it('uses the setting, or the waypoint radius when that is larger', () => {
    expect(effectiveArrivalRadius(wp(0, 0, 'x', 0.05), 0.1)).toBe(0.1);
    expect(effectiveArrivalRadius(wp(0, 0, 'x', 0.5), 0.1)).toBe(0.5);
  });

  it('stays on the waypoint outside the arrival radius', () => {
    const near = calculateDestination(north.waypoints[1].position, 180, 0.15);
    expect(nextWaypointIndex(north, 1, near, 0.1)).toBe(1);
  });

  it('advances inside the arrival radius', () => {
    const inside = calculateDestination(north.waypoints[1].position, 180, 0.08);
    expect(calculateDistance(inside, north.waypoints[1].position)).toBeLessThan(0.1);
    expect(nextWaypointIndex(north, 1, inside, 0.1)).toBe(2);
  });

  it('skips the first waypoint when navigation starts on it', () => {
    expect(nextWaypointIndex(north, 0, pos(50, -5), 0.1)).toBe(1);
  });

  it('reports the end of the route at the last waypoint', () => {
    expect(nextWaypointIndex(north, 2, pos(52, -5), 0.1)).toBe(3);
  });
});
