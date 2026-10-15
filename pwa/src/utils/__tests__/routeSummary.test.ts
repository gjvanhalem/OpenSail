import { describe, it, expect } from 'vitest';
import type { Route, Waypoint } from '@/models';
import { calculateRouteSummary, courseChange, plannedSpeed } from '../routeCalculations';

const wp = (latitude: number, longitude: number, name: string): Waypoint => ({
  id: name,
  name,
  position: { latitude, longitude, accuracy: 0, timestamp: 0 },
  arrivalRadius: 0.1,
});

describe('courseChange', () => {
  it('is positive to starboard and negative to port, the short way round', () => {
    expect(courseChange(0, 90)).toBe(90);
    expect(courseChange(90, 0)).toBe(-90);
    expect(courseChange(350, 10)).toBe(20);
    expect(courseChange(10, 350)).toBe(-20);
    expect(courseChange(0, 180)).toBe(180);
  });
});

describe('calculateRouteSummary', () => {
  // On the equator, so a degree is 60.04 nm both ways: N, E, then S
  const route = [wp(0, 0, 'A'), wp(1, 0, 'B'), wp(1, 1, 'C'), wp(0, 1, 'D'), wp(0, 2, 'E')];
  const departure = new Date(Date.UTC(2026, 9, 15, 8, 0, 0));

  it('adds up distance and time, and gives the ETA from the departure', () => {
    const s = calculateRouteSummary(route, 6, departure);
    expect(s.legs).toHaveLength(4);
    expect(s.totalDistance).toBeCloseTo(4 * 60.04, 0);
    expect(s.totalTime).toBeCloseTo(s.totalDistance / 6, 6);
    expect(s.eta!.getTime()).toBeCloseTo(departure.getTime() + s.totalTime * 3_600_000, -3);
  });

  it('lists the course change at each turning waypoint', () => {
    const changes = calculateRouteSummary(route, 6, departure).courseChanges;
    expect(changes.map((c) => c.waypoint.name)).toEqual(['B', 'C', 'D']);
    expect(changes[0].fromCourse).toBeCloseTo(0, 0);
    expect(changes[0].toCourse).toBeCloseTo(90, 0);
    expect(changes[0].change).toBeCloseTo(90, 0);
    expect(changes[1].change).toBeCloseTo(90, 0);
    // South, then east: a turn to port
    expect(changes[2].change).toBeCloseTo(-90, 0);
  });

  it('leaves out waypoints where the course stays the same', () => {
    const straight = [wp(0, 0, 'A'), wp(1, 0, 'B'), wp(2, 0, 'C')];
    expect(calculateRouteSummary(straight, 5, departure).courseChanges).toEqual([]);
  });

  it('has no ETA without a speed or a leg', () => {
    expect(calculateRouteSummary(route, 0, departure).eta).toBeNull();
    expect(calculateRouteSummary([wp(0, 0, 'A')], 5, departure).eta).toBeNull();
  });
});

describe('plannedSpeed', () => {
  const base: Route = {
    id: 'r', name: 'r', waypoints: [], totalDistance: 30, estimatedDuration: 5,
    createdAt: new Date(0), updatedAt: new Date(0),
  };
  it('is distance over planned duration, or 5 kn without a plan', () => {
    expect(plannedSpeed(base)).toBe(6);
    expect(plannedSpeed({ ...base, estimatedDuration: 0 })).toBe(5);
  });
});
