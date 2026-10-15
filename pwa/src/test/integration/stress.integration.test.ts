import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { db, type TrackPoint } from '@/database/db';
import { RouteRepository } from '@/database/repositories/RouteRepository';
import { TrackRepository } from '@/database/repositories/TrackRepository';
import routesReducer, {
  addRoute,
  advanceToNextWaypoint,
  startNavigation,
} from '@/store/slices/routesSlice';
import tracksReducer, { fromStoredTrack } from '@/store/slices/tracksSlice';
import type { Route, Waypoint } from '@/models';
import { calculateDestination } from '@/utils/calculations';
import { calculateRouteGuidance, nextWaypointIndex } from '@/utils/routeGuidance';
import { calculateRouteSummary } from '@/utils/routeCalculations';
import { simplifyTrack, trackToRoute } from '@/utils/trackToRoute';

/**
 * Phase 2 stress tests: a route with 50+ waypoints (R2.1), 100 hours of
 * track data (R9.2) and 10+ routes stored for offline use (R5.3).
 */

const HOURS_100_AT_10S = 100 * 360;

function longRoute(count: number, name = `Route of ${count}`): Omit<Route, 'id'> {
  // A zig-zag up the coast, 1 nm legs alternating NE and NW
  let position = { latitude: 52, longitude: 4, accuracy: 0, timestamp: 0 };
  const waypoints: Waypoint[] = [];
  for (let i = 0; i < count; i++) {
    waypoints.push({ id: `${name}-wp${i}`, name: `WP${i + 1}`, position, arrivalRadius: 0.1 });
    position = calculateDestination(position, i % 2 === 0 ? 45 : 315, 1);
  }
  const now = new Date();
  return { name, waypoints, totalDistance: count - 1, estimatedDuration: (count - 1) / 5, createdAt: now, updatedAt: now };
}

/** 100 hours at 5 kn, a point every 10 seconds, in a slow loop round the bay */
function hundredHourTrack(): TrackPoint[] {
  const start = Date.UTC(2026, 6, 1);
  let position = { latitude: 52, longitude: 4, accuracy: 0, timestamp: 0 };
  const points: TrackPoint[] = [];
  for (let i = 0; i < HOURS_100_AT_10S; i++) {
    const heading = (i / 20) % 360;
    points.push({ latitude: position.latitude, longitude: position.longitude, speed: 5, heading, timestamp: new Date(start + i * 10_000) });
    position = calculateDestination(position, heading, 5 / 360);
  }
  return points;
}

beforeEach(async () => {
  await db.routes.clear();
  await db.tracks.clear();
});

describe('R2.1: a route with 50+ waypoints', () => {
  const route = { ...longRoute(60), id: 'long' } as Route;

  it('is saved and read back with every waypoint in order', async () => {
    const repository = new RouteRepository();
    const created = await repository.create(longRoute(60));
    const loaded = await new RouteRepository().getById(created.id);
    expect(loaded!.waypoints).toHaveLength(60);
    expect(loaded!.waypoints.map((w) => w.name)).toEqual(route.waypoints.map((w) => w.name));
  });

  it('summarises all 59 legs and 58 course changes', () => {
    const summary = calculateRouteSummary(route.waypoints, 5);
    expect(summary.legs).toHaveLength(59);
    expect(summary.totalDistance).toBeCloseTo(59, 1);
    expect(summary.courseChanges).toHaveLength(58);
  });

  it('is navigated waypoint by waypoint to the end', () => {
    const store = configureStore({ reducer: { routes: routesReducer } });
    store.dispatch(addRoute(route));
    store.dispatch(startNavigation('long', route.waypoints[0].position));

    let switches = 0;
    for (const waypoint of route.waypoints) {
      const { activeWaypointIndex } = store.getState().routes;
      // Arrive right at each waypoint in turn
      const next = nextWaypointIndex(route, activeWaypointIndex, waypoint.position, 0.1);
      for (let i = activeWaypointIndex; i < next; i++) {
        store.dispatch(advanceToNextWaypoint());
        switches++;
      }
      const state = store.getState().routes;
      if (state.isNavigating) {
        const guidance = calculateRouteGuidance({
          route,
          activeIndex: state.activeWaypointIndex,
          position: waypoint.position,
          sog: 5,
        })!;
        // On the route: no XTE, the next waypoint 1 nm (12 minutes) away
        expect(Math.abs(guidance.crossTrackError!)).toBeLessThan(1e-6);
        expect(guidance.distanceToWaypoint).toBeCloseTo(1, 3);
      }
    }
    expect(switches).toBe(60);
    expect(store.getState().routes.routeCompleted).toBe(true);
  });
});

describe('R9.2: 100 hours of track data', () => {
  it('stores and reads back 36,000 points', async () => {
    const points = hundredHourTrack();
    const repository = new TrackRepository();
    const created = await repository.create({
      name: '100 hours',
      points: { compressed: false, data: JSON.stringify(points) },
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
      distance: 500,
      maxSpeed: 5,
      avgSpeed: 5,
    });

    const loaded = await new TrackRepository().getById(created.id!);
    const track = fromStoredTrack(loaded!);
    // At 5 kn the boat moves ~26 m between points, so storage keeps them all
    expect(track.points).toHaveLength(HOURS_100_AT_10S);
    expect(new Date(track.points[HOURS_100_AT_10S - 1].timestamp).getTime() -
      new Date(track.points[0].timestamp).getTime()).toBe((HOURS_100_AT_10S - 1) * 10_000);

    // ...and it goes into the store and converts to a route
    const state = tracksReducer(undefined, { type: 'tracks/setTracks', payload: [track] });
    expect(state.tracks[0].points).toHaveLength(HOURS_100_AT_10S);
    const started = performance.now();
    const route = trackToRoute(track);
    expect(performance.now() - started).toBeLessThan(3000);
    expect(route.waypoints.length).toBeGreaterThan(2);
    expect(route.waypoints.length).toBeLessThanOrEqual(50);
  });

  it('simplifies without losing the start or the end', () => {
    const points = hundredHourTrack();
    const simplified = simplifyTrack(points);
    expect(simplified[0]).toBe(points[0]);
    expect(simplified[simplified.length - 1]).toBe(points[points.length - 1]);
  });
});

describe('R5.3: 10+ routes stored offline', () => {
  it('keeps 12 routes in IndexedDB across repository instances', async () => {
    const writer = new RouteRepository();
    for (let i = 1; i <= 12; i++) {
      await writer.create(longRoute(5 + i, `Passage ${i}`));
    }
    // A new instance stands in for the app starting again without a network
    const routes = await new RouteRepository().getAll();
    expect(routes).toHaveLength(12);
    expect(routes.map((r) => r.name).sort()).toEqual(
      Array.from({ length: 12 }, (_, i) => `Passage ${i + 1}`).sort()
    );
    expect(routes.find((r) => r.name === 'Passage 12')!.waypoints).toHaveLength(17);
  });
});
