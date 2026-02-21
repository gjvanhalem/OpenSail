import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import navigationReducer, {
  updatePosition,
  updateHeading,
  updateSpeed,
  resetNavigation,
} from '@/store/slices/navigationSlice';
import routesReducer, {
  addRoute,
  updateRoute,
  deleteRoute,
  startNavigation,
  advanceToNextWaypoint,
  addWaypointToRoute,
} from '@/store/slices/routesSlice';
import tracksReducer, {
  startRecording,
  stopRecording,
  addTrackPoint,
} from '@/store/slices/tracksSlice';
import aisReducer, {
  updateTarget,
  removeTarget,
  clearOldTargets,
} from '@/store/slices/aisSlice';
import type { Route, Waypoint, Position, AISTarget } from '@/models';

describe('State Management Integration Tests', () => {
  describe('Navigation State', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          navigation: navigationReducer,
        },
      });
    });

    it('should update position', () => {
      const position: Position = {
        latitude: 52.5,
        longitude: 4.8,
        timestamp: Date.now(),
        accuracy: 10,
      };

      store.dispatch(updatePosition(position));

      const state = (store.getState() as any).navigation;
      expect(state.position).toEqual(position);
      expect(state.isGPSActive).toBe(true);
    });

    it('should update heading and speed', () => {
      store.dispatch(updateHeading(180));
      store.dispatch(updateSpeed(5.5));

      const state = (store.getState() as any).navigation;
      expect(state.heading).toBe(180);
      expect(state.speed).toBe(5.5);
    });

    it('should reset navigation state', () => {
      store.dispatch(updatePosition({
        latitude: 52.5,
        longitude: 4.8,
        timestamp: Date.now(),
        accuracy: 10,
      }));
      store.dispatch(updateHeading(180));

      store.dispatch(resetNavigation());

      const state = (store.getState() as any).navigation;
      expect(state.position).toBeNull();
      expect(state.heading).toBeNull();
      expect(state.isGPSActive).toBe(false);
    });
  });

  describe('Routes State', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          routes: routesReducer,
        },
      });
    });

    it('should add and retrieve routes', () => {
      const route: Route = {
        id: 'route-1',
        name: 'Test Route',
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addRoute(route));

      const state = (store.getState() as any).routes;
      expect(state.routes).toHaveLength(1);
      expect(state.routes[0].name).toBe('Test Route');
    });

    it('should update a route', () => {
      const route: Route = {
        id: 'route-1',
        name: 'Original',
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addRoute(route));
      store.dispatch(updateRoute({
        ...route,
        name: 'Updated',
      }));

      const state = (store.getState() as any).routes;
      expect(state.routes[0].name).toBe('Updated');
    });

    it('should delete a route', () => {
      const route: Route = {
        id: 'route-1',
        name: 'To Delete',
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addRoute(route));
      store.dispatch(deleteRoute('route-1'));

      const state = (store.getState() as any).routes;
      expect(state.routes).toHaveLength(0);
    });

    it('should handle navigation workflow', () => {
      const waypoint1: Waypoint = {
        id: 'wp-1',
        position: { latitude: 52.5, longitude: 4.8, accuracy: 10, timestamp: Date.now() },
        name: 'WP1',
        arrivalRadius: 100,
      };
      const waypoint2: Waypoint = {
        id: 'wp-2',
        position: { latitude: 52.6, longitude: 4.9, accuracy: 10, timestamp: Date.now() },
        name: 'WP2',
        arrivalRadius: 100,
      };
      const waypoint3: Waypoint = {
        id: 'wp-3',
        position: { latitude: 52.7, longitude: 5.0, accuracy: 10, timestamp: Date.now() },
        name: 'WP3',
        arrivalRadius: 100,
      };

      const route: Route = {
        id: 'route-1',
        name: 'Nav Route',
        waypoints: [waypoint1, waypoint2, waypoint3],
        totalDistance: 20,
        estimatedDuration: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addRoute(route));
      store.dispatch(startNavigation('route-1'));

      let state = (store.getState() as any).routes;
      expect(state.isNavigating).toBe(true);
      expect(state.activeRouteId).toBe('route-1');
      expect(state.activeWaypointIndex).toBe(0);

      store.dispatch(advanceToNextWaypoint());
      state = (store.getState() as any).routes;
      expect(state.activeWaypointIndex).toBe(1);

      store.dispatch(advanceToNextWaypoint());
      state = (store.getState() as any).routes;
      expect(state.activeWaypointIndex).toBe(2);

      // Advancing past last waypoint should stop navigation
      store.dispatch(advanceToNextWaypoint());
      state = (store.getState() as any).routes;
      expect(state.isNavigating).toBe(false);
    });

    it('should add waypoints to route', () => {
      const route: Route = {
        id: 'route-1',
        name: 'Test Route',
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const waypoint: Waypoint = {
        id: 'wp-1',
        position: {
          latitude: 52.5,
          longitude: 4.8,
          accuracy: 10,
          timestamp: Date.now(),
        },
        name: 'Waypoint 1',
        arrivalRadius: 100,
      };

      store.dispatch(addRoute(route));
      store.dispatch(addWaypointToRoute({ routeId: 'route-1', waypoint }));

      const state = (store.getState() as any).routes;
      expect(state.routes[0].waypoints).toHaveLength(1);
      expect(state.routes[0].waypoints[0].name).toBe('Waypoint 1');
    });
  });

  describe('Tracks State', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          tracks: tracksReducer,
        },
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: {
              ignoredActions: ['tracks/addTrackPoint'],
              ignoredPaths: ['tracks.currentTrack.points'],
            },
          }),
      });
    });

    it('should start and stop recording', () => {
      store.dispatch(startRecording({ id: 'track-1', name: 'Test Track' }));

      let state = (store.getState() as any).tracks;
      expect(state.isRecording).toBe(true);
      expect(state.currentTrack).toBeDefined();
      expect(state.currentTrack?.name).toBe('Test Track');

      store.dispatch(stopRecording());

      state = (store.getState() as any).tracks;
      expect(state.isRecording).toBe(false);
    });

    it('should add track points during recording', () => {
      store.dispatch(startRecording({ id: 'track-1', name: 'Test Track' }));

      store.dispatch(addTrackPoint({
        latitude: 52.5,
        longitude: 4.8,
        speed: 5.5,
        heading: 180,
        timestamp: new Date(),
      }));

      store.dispatch(addTrackPoint({
        latitude: 52.51,
        longitude: 4.81,
        speed: 5.6,
        heading: 181,
        timestamp: new Date(),
      }));

      const state = (store.getState() as any).tracks;
      expect(state.currentTrack?.points).toHaveLength(2);
    });
  });

  describe('AIS State', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          ais: aisReducer,
        },
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: {
              ignoredActions: ['ais/updateTarget'],
              ignoredPaths: ['ais.targets'],
            },
          }),
      });
    });

    it('should add and update AIS targets', () => {
      const target: AISTarget = {
        mmsi: '123456789',
        name: 'Test Vessel',
        callSign: 'TEST',
        position: {
          latitude: 52.5,
          longitude: 4.8,
          accuracy: 10,
          timestamp: Date.now(),
        },
        course: 180,
        speed: 10,
        heading: 180,
        vesselType: 70,
        length: 50,
        width: 10,
        lastUpdate: new Date(),
        history: [],
      };

      store.dispatch(updateTarget(target));

      const state = (store.getState() as any).ais;
      expect(state.targets['123456789']).toBeDefined();
      expect(state.targets['123456789'].name).toBe('Test Vessel');
    });

    it('should remove AIS targets', () => {
      const target: AISTarget = {
        mmsi: '123456789',
        name: 'Test Vessel',
        callSign: 'TEST',
        position: {
          latitude: 52.5,
          longitude: 4.8,
          accuracy: 10,
          timestamp: Date.now(),
        },
        course: 180,
        speed: 10,
        heading: 180,
        vesselType: 70,
        length: 50,
        width: 10,
        lastUpdate: new Date(),
        history: [],
      };

      store.dispatch(updateTarget(target));
      store.dispatch(removeTarget('123456789'));

      const state = (store.getState() as any).ais;
      expect(state.targets['123456789']).toBeUndefined();
    });

    it('should clear expired targets', () => {
      const now = new Date();
      const expired = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago

      store.dispatch(updateTarget({
        mmsi: '111111111',
        name: 'Recent',
        callSign: 'REC',
        position: {
          latitude: 52.5,
          longitude: 4.8,
          accuracy: 10,
          timestamp: Date.now(),
        },
        course: 180,
        speed: 10,
        heading: 180,
        vesselType: 70,
        length: 50,
        width: 10,
        lastUpdate: now,
        history: [],
      }));

      store.dispatch(updateTarget({
        mmsi: '222222222',
        name: 'Expired',
        callSign: 'EXP',
        position: {
          latitude: 52.6,
          longitude: 4.9,
          accuracy: 10,
          timestamp: Date.now(),
        },
        course: 180,
        speed: 10,
        heading: 180,
        vesselType: 70,
        length: 50,
        width: 10,
        lastUpdate: expired,
        history: [],
      }));

      // Clear targets older than 24 hours (24 * 60 * 60 * 1000 ms)
      store.dispatch(clearOldTargets(24 * 60 * 60 * 1000));

      const state = (store.getState() as any).ais;
      expect(state.targets['111111111']).toBeDefined();
      expect(state.targets['222222222']).toBeUndefined();
    });
  });

  describe('Multi-Slice Integration', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          navigation: navigationReducer,
          routes: routesReducer,
          tracks: tracksReducer,
        },
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: {
              ignoredActions: ['navigation/updatePosition', 'tracks/addTrackPoint'],
              ignoredPaths: ['navigation.timestamp', 'tracks.currentTrack.points'],
            },
          }),
      });
    });

    it('should coordinate navigation and track recording', () => {
      // Start navigation
      const waypoint: Waypoint = {
        id: 'wp-1',
        position: {
          latitude: 52.5,
          longitude: 4.8,
          accuracy: 10,
          timestamp: Date.now(),
        },
        name: 'WP1',
        arrivalRadius: 100,
      };

      const route: Route = {
        id: 'route-1',
        name: 'Test Route',
        waypoints: [waypoint],
        totalDistance: 10,
        estimatedDuration: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addRoute(route));
      store.dispatch(startNavigation('route-1'));

      // Start track recording
      store.dispatch(startRecording({ id: 'track-1', name: 'Navigation Track' }));

      // Update position
      const position: Position = {
        latitude: 52.5,
        longitude: 4.8,
        timestamp: Date.now(),
        accuracy: 10,
      };
      store.dispatch(updatePosition(position));

      // Add track point
      store.dispatch(addTrackPoint({
        latitude: 52.5,
        longitude: 4.8,
        speed: 5.5,
        heading: 180,
        timestamp: new Date(),
      }));

      const state = store.getState() as any;
      expect(state.routes.isNavigating).toBe(true);
      expect(state.tracks.isRecording).toBe(true);
      expect(state.navigation.position).toEqual(position);
      expect(state.tracks.currentTrack?.points).toHaveLength(1);
    });
  });
});
