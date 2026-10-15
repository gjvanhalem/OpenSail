import { describe, it, expect } from 'vitest';
import type { Route } from '@/models';
import reducer, {
  advanceToNextWaypoint,
  setActiveRoute,
  startNavigation,
  stopNavigation,
} from '../routesSlice';

const route: Route = {
  id: 'r1',
  name: 'Test',
  waypoints: [0, 1].map((i) => ({
    id: `w${i}`,
    name: `W${i}`,
    position: { latitude: 50 + i, longitude: -5, accuracy: 0, timestamp: 0 },
    arrivalRadius: 0.1,
  })),
  totalDistance: 60,
  estimatedDuration: 10,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const from = { latitude: 49.9, longitude: -5, accuracy: 5, timestamp: 1 };
const withRoute = reducer(undefined, { type: 'routes/addRoute', payload: route });

describe('routesSlice navigation', () => {
  it('starts navigation from the boat position', () => {
    const state = reducer(withRoute, startNavigation('r1', from));
    expect(state).toMatchObject({
      activeRouteId: 'r1',
      activeWaypointIndex: 0,
      isNavigating: true,
      navigationStart: from,
      routeCompleted: false,
    });
  });

  it('still accepts a route id alone', () => {
    expect(reducer(withRoute, startNavigation('r1')).navigationStart).toBeNull();
  });

  it('marks the route completed after the last waypoint', () => {
    let state = reducer(withRoute, startNavigation('r1', from));
    state = reducer(state, advanceToNextWaypoint());
    expect(state.activeWaypointIndex).toBe(1);
    state = reducer(state, advanceToNextWaypoint());
    expect(state.isNavigating).toBe(false);
    expect(state.routeCompleted).toBe(true);
  });

  it('stops navigation', () => {
    const state = reducer(reducer(withRoute, startNavigation('r1', from)), stopNavigation());
    expect(state.isNavigating).toBe(false);
    expect(state.navigationStart).toBeNull();
  });

  it('stops navigating when another route is made active', () => {
    const state = reducer(reducer(withRoute, startNavigation('r1', from)), setActiveRoute('r2'));
    expect(state.isNavigating).toBe(false);
  });
});
