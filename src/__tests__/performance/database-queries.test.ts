/**
 * Performance Test: Database Query Performance
 * Target: Route/track queries under 50ms
 */

import { RouteRepository } from '../../database/RouteRepository';
import { TrackRepository } from '../../database/TrackRepository';
import { LogbookRepository } from '../../database/LogbookRepository';
import { AISRepository } from '../../database/AISRepository';
import { Waypoint, Position, AISTarget } from '../../types';

describe('Performance: Database Query Performance', () => {
  let routeRepo: RouteRepository;
  let trackRepo: TrackRepository;
  let logbookRepo: LogbookRepository;
  let aisRepo: AISRepository;

  beforeEach(() => {
    routeRepo = new RouteRepository();
    trackRepo = new TrackRepository();
    logbookRepo = new LogbookRepository();
    aisRepo = new AISRepository();
  });

  describe('Route Queries', () => {
    it('should retrieve routes within 50ms', async () => {
      // Create 50 routes
      const routeIds: string[] = [];
      for (let i = 0; i < 50; i++) {
        const waypoints: Waypoint[] = [
          {
            id: `wp1_${i}`,
            position: { latitude: 52.0 + (i * 0.01), longitude: 5.0, accuracy: 5, timestamp: Date.now() },
            name: `Start ${i}`,
            arrivalRadius: 50
          },
          {
            id: `wp2_${i}`,
            position: { latitude: 52.1 + (i * 0.01), longitude: 5.1, accuracy: 5, timestamp: Date.now() },
            name: `End ${i}`,
            arrivalRadius: 50
          }
        ];

        const route = await routeRepo.createRoute(`Route ${i}`, waypoints);
        routeIds.push(route.id);
      }

      // Measure query time
      const queryTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        await routeRepo.getAllRoutes();
        const endTime = performance.now();
        queryTimes.push(endTime - startTime);
      }

      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;

      // Query should be fast
      expect(avgQueryTime).toBeLessThan(50);
    });

    it('should retrieve single route quickly', async () => {
      // Create a route
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
          name: 'Start',
          arrivalRadius: 50
        },
        {
          id: 'wp2',
          position: { latitude: 52.1, longitude: 5.1, accuracy: 5, timestamp: Date.now() },
          name: 'End',
          arrivalRadius: 50
        }
      ];

      const route = await routeRepo.createRoute('Test Route', waypoints);

      // Measure retrieval time
      const retrievalTimes: number[] = [];

      for (let i = 0; i < 100; i++) {
        const startTime = performance.now();
        await routeRepo.getRoute(route.id);
        const endTime = performance.now();
        retrievalTimes.push(endTime - startTime);
      }

      const avgRetrievalTime = retrievalTimes.reduce((a, b) => a + b, 0) / retrievalTimes.length;

      // Single route retrieval should be very fast
      expect(avgRetrievalTime).toBeLessThan(10);
    });

    it('should handle route creation efficiently', async () => {
      const creationTimes: number[] = [];

      for (let i = 0; i < 50; i++) {
        const waypoints: Waypoint[] = [
          {
            id: `wp1_${i}`,
            position: { latitude: 52.0 + (i * 0.01), longitude: 5.0, accuracy: 5, timestamp: Date.now() },
            name: `Start ${i}`,
            arrivalRadius: 50
          },
          {
            id: `wp2_${i}`,
            position: { latitude: 52.1 + (i * 0.01), longitude: 5.1, accuracy: 5, timestamp: Date.now() },
            name: `End ${i}`,
            arrivalRadius: 50
          }
        ];

        const startTime = performance.now();
        await routeRepo.createRoute(`Route ${i}`, waypoints);
        const endTime = performance.now();
        creationTimes.push(endTime - startTime);
      }

      const avgCreationTime = creationTimes.reduce((a, b) => a + b, 0) / creationTimes.length;

      // Route creation should be fast
      expect(avgCreationTime).toBeLessThan(50);
    });

    it('should update routes efficiently', async () => {
      // Create routes
      const routeIds: string[] = [];
      for (let i = 0; i < 20; i++) {
        const waypoints: Waypoint[] = [
          {
            id: `wp1_${i}`,
            position: { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
            name: 'Start',
            arrivalRadius: 50
          },
          {
            id: `wp2_${i}`,
            position: { latitude: 52.1, longitude: 5.1, accuracy: 5, timestamp: Date.now() },
            name: 'End',
            arrivalRadius: 50
          }
        ];

        const route = await routeRepo.createRoute(`Route ${i}`, waypoints);
        routeIds.push(route.id);
      }

      // Measure update time
      const updateTimes: number[] = [];

      for (const routeId of routeIds) {
        const newWaypoints: Waypoint[] = [
          {
            id: 'wp1_new',
            position: { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
            name: 'Start',
            arrivalRadius: 50
          },
          {
            id: 'wp2_new',
            position: { latitude: 52.2, longitude: 5.2, accuracy: 5, timestamp: Date.now() },
            name: 'Mid',
            arrivalRadius: 50
          },
          {
            id: 'wp3_new',
            position: { latitude: 52.3, longitude: 5.3, accuracy: 5, timestamp: Date.now() },
            name: 'End',
            arrivalRadius: 50
          }
        ];

        const startTime = performance.now();
        await routeRepo.updateRoute(routeId, newWaypoints);
        const endTime = performance.now();
        updateTimes.push(endTime - startTime);
      }

      const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;

      // Updates should be fast
      expect(avgUpdateTime).toBeLessThan(50);
    });
  });

  describe('Track Queries', () => {
    it('should retrieve tracks within 50ms', async () => {
      // Create 30 tracks with points
      const trackIds: string[] = [];
      for (let i = 0; i < 30; i++) {
        const track = await trackRepo.createTrack(`Track ${i}`);
        trackIds.push(track.id);

        // Add 50 points to each track
        for (let j = 0; j < 50; j++) {
          await trackRepo.addTrackPoint(track.id, {
            position: {
              latitude: 52.0 + (j * 0.001),
              longitude: 5.0 + (j * 0.001),
              accuracy: 5,
              timestamp: Date.now() + (j * 1000)
            },
            speed: 5.0,
            heading: 90,
            timestamp: new Date(Date.now() + (j * 1000))
          });
        }
      }

      // Measure query time
      const queryTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        await trackRepo.getAllTracks();
        const endTime = performance.now();
        queryTimes.push(endTime - startTime);
      }

      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;

      // Query should be fast
      expect(avgQueryTime).toBeLessThan(50);
    });

    it('should retrieve track with points efficiently', async () => {
      // Create track with many points
      const track = await trackRepo.createTrack('Performance Test Track');

      // Add 1000 points
      for (let i = 0; i < 1000; i++) {
        await trackRepo.addTrackPoint(track.id, {
          position: {
            latitude: 52.0 + (i * 0.0001),
            longitude: 5.0 + (i * 0.0001),
            accuracy: 5,
            timestamp: Date.now() + (i * 1000)
          },
          speed: 5.0,
          heading: 90,
          timestamp: new Date(Date.now() + (i * 1000))
        });
      }

      // Measure retrieval time
      const retrievalTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await trackRepo.getTrack(track.id);
        const endTime = performance.now();
        retrievalTimes.push(endTime - startTime);
      }

      const avgRetrievalTime = retrievalTimes.reduce((a, b) => a + b, 0) / retrievalTimes.length;

      // Should retrieve track with 1000 points reasonably fast
      expect(avgRetrievalTime).toBeLessThan(200);
    });

    it('should add track points efficiently', async () => {
      const track = await trackRepo.createTrack('Point Addition Test');

      const addTimes: number[] = [];

      for (let i = 0; i < 100; i++) {
        const startTime = performance.now();
        await trackRepo.addTrackPoint(track.id, {
          position: {
            latitude: 52.0 + (i * 0.001),
            longitude: 5.0 + (i * 0.001),
            accuracy: 5,
            timestamp: Date.now() + (i * 1000)
          },
          speed: 5.0,
          heading: 90,
          timestamp: new Date(Date.now() + (i * 1000))
        });
        const endTime = performance.now();
        addTimes.push(endTime - startTime);
      }

      const avgAddTime = addTimes.reduce((a, b) => a + b, 0) / addTimes.length;

      // Adding points should be fast
      expect(avgAddTime).toBeLessThan(20);
    });
  });

  describe('Logbook Queries', () => {
    it('should retrieve logbook entries within 50ms', async () => {
      // Create voyage with entries
      const voyage = await logbookRepo.createVoyage({
        latitude: 52.0,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      });

      // Add 100 entries
      for (let i = 0; i < 100; i++) {
        await logbookRepo.addEntry({
          id: `entry_${i}`,
          voyageId: voyage.id,
          timestamp: new Date(Date.now() + (i * 60000)),
          position: {
            latitude: 52.0 + (i * 0.001),
            longitude: 5.0 + (i * 0.001),
            accuracy: 5,
            timestamp: Date.now() + (i * 60000)
          },
          type: 'note',
          notes: `Entry ${i}`
        });
      }

      // Measure query time
      const queryTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        await logbookRepo.getEntries({ voyageId: voyage.id });
        const endTime = performance.now();
        queryTimes.push(endTime - startTime);
      }

      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;

      // Query should be fast
      expect(avgQueryTime).toBeLessThan(50);
    });

    it('should filter entries efficiently', async () => {
      // Create multiple voyages
      const voyageIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const voyage = await logbookRepo.createVoyage({
          latitude: 52.0,
          longitude: 5.0,
          accuracy: 5,
          timestamp: Date.now()
        });
        voyageIds.push(voyage.id);

        // Add entries to each voyage
        for (let j = 0; j < 20; j++) {
          await logbookRepo.addEntry({
            id: `entry_${i}_${j}`,
            voyageId: voyage.id,
            timestamp: new Date(Date.now() + (j * 60000)),
            position: {
              latitude: 52.0,
              longitude: 5.0,
              accuracy: 5,
              timestamp: Date.now()
            },
            type: 'note',
            notes: `Entry ${j}`
          });
        }
      }

      // Measure filter time
      const filterTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        await logbookRepo.getEntries({
          startDate: new Date(Date.now() - 86400000),
          endDate: new Date()
        });
        const endTime = performance.now();
        filterTimes.push(endTime - startTime);
      }

      const avgFilterTime = filterTimes.reduce((a, b) => a + b, 0) / filterTimes.length;

      // Filtering should be fast
      expect(avgFilterTime).toBeLessThan(50);
    });
  });

  describe('AIS Queries', () => {
    it('should retrieve AIS targets within 50ms', async () => {
      // Add 100 AIS targets
      for (let i = 0; i < 100; i++) {
        const target: AISTarget = {
          mmsi: `${100000000 + i}`,
          name: `VESSEL_${i}`,
          callSign: `V${i}`,
          position: {
            latitude: 52.0 + (Math.random() * 0.5),
            longitude: 5.0 + (Math.random() * 0.5),
            accuracy: 10,
            timestamp: Date.now()
          },
          course: Math.random() * 360,
          speed: Math.random() * 20,
          heading: Math.random() * 360,
          vesselType: 70,
          length: 100,
          width: 20,
          lastUpdate: new Date(),
          history: []
        };
        await aisRepo.addTarget(target);
      }

      // Measure query time
      const queryTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        await aisRepo.getAllTargets();
        const endTime = performance.now();
        queryTimes.push(endTime - startTime);
      }

      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;

      // Query should be fast
      expect(avgQueryTime).toBeLessThan(50);
    });

    it('should query targets by bounds efficiently', async () => {
      // Add 200 targets across large area
      for (let i = 0; i < 200; i++) {
        const target: AISTarget = {
          mmsi: `${100000000 + i}`,
          name: `VESSEL_${i}`,
          callSign: `V${i}`,
          position: {
            latitude: 50.0 + (Math.random() * 5),
            longitude: 3.0 + (Math.random() * 5),
            accuracy: 10,
            timestamp: Date.now()
          },
          course: Math.random() * 360,
          speed: Math.random() * 20,
          heading: Math.random() * 360,
          vesselType: 70,
          length: 100,
          width: 20,
          lastUpdate: new Date(),
          history: []
        };
        await aisRepo.addTarget(target);
      }

      const bounds = {
        north: 52.5,
        south: 52.0,
        east: 5.5,
        west: 5.0
      };

      // Measure query time
      const queryTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        await aisRepo.getTargetsInBounds(bounds);
        const endTime = performance.now();
        queryTimes.push(endTime - startTime);
      }

      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;

      // Spatial query should be fast
      expect(avgQueryTime).toBeLessThan(50);
    });

    it('should handle target history queries efficiently', async () => {
      // Add target with extensive history
      const history: Position[] = [];
      for (let i = 0; i < 500; i++) {
        history.push({
          latitude: 52.0 + (i * 0.0001),
          longitude: 5.0 + (i * 0.0001),
          accuracy: 10,
          timestamp: Date.now() - (i * 60000)
        });
      }

      const target: AISTarget = {
        mmsi: '123456789',
        name: 'TEST VESSEL',
        callSign: 'TEST',
        position: history[0],
        course: 90,
        speed: 10,
        heading: 90,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history
      };

      await aisRepo.addTarget(target);

      // Measure retrieval time
      const retrievalTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        await aisRepo.getTargetHistory('123456789');
        const endTime = performance.now();
        retrievalTimes.push(endTime - startTime);
      }

      const avgRetrievalTime = retrievalTimes.reduce((a, b) => a + b, 0) / retrievalTimes.length;

      // History retrieval should be reasonably fast
      expect(avgRetrievalTime).toBeLessThan(100);
    });
  });

  describe('Concurrent Queries', () => {
    it('should handle concurrent database operations', async () => {
      const startTime = performance.now();

      // Perform multiple concurrent operations
      const operations = [];

      // Route operations
      for (let i = 0; i < 10; i++) {
        operations.push(routeRepo.getAllRoutes());
      }

      // Track operations
      for (let i = 0; i < 10; i++) {
        operations.push(trackRepo.getAllTracks());
      }

      // AIS operations
      for (let i = 0; i < 10; i++) {
        operations.push(aisRepo.getAllTargets());
      }

      await Promise.all(operations);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Concurrent operations should complete quickly
      expect(totalTime).toBeLessThan(500);
    });
  });
});
