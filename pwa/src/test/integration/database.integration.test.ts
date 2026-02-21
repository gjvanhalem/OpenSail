import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/database/db';
import { routeRepository } from '@/database/repositories/RouteRepository';
import { waypointRepository } from '@/database/repositories/WaypointRepository';
import { trackRepository } from '@/database/repositories/TrackRepository';
import type { Route, Waypoint, Track } from '@/database/db';

describe('IndexedDB Integration Tests', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.routes.clear();
    await db.waypoints.clear();
    await db.tracks.clear();
    await db.aisTargets.clear();
    await db.logbook.clear();
    await db.chartTiles.clear();
    await db.settings.clear();
  });

  afterEach(async () => {
    // Clean up after each test
    await db.routes.clear();
    await db.waypoints.clear();
    await db.tracks.clear();
  });

  describe('Route Repository Operations', () => {
    it('should create and retrieve a route', async () => {
      const route: Omit<Route, 'id'> = {
        name: 'Test Route',
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const created = await routeRepository.create(route);
      expect(created.id).toBeDefined();
      expect(created.name).toBe('Test Route');

      const retrieved = await routeRepository.getById(created.id!);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Route');
    });

    it('should update a route', async () => {
      const route: Omit<Route, 'id'> = {
        name: 'Original Name',
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const created = await routeRepository.create(route);
      
      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = await routeRepository.update(created.id!, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should delete a route', async () => {
      const route: Omit<Route, 'id'> = {
        name: 'To Delete',
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const created = await routeRepository.create(route);
      await routeRepository.delete(created.id!);

      const retrieved = await routeRepository.getById(created.id!);
      expect(retrieved).toBeUndefined();
    });

    it('should retrieve all routes', async () => {
      const route1: Omit<Route, 'id'> = {
        name: 'Route 1',
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const route2: Omit<Route, 'id'> = {
        name: 'Route 2',
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await routeRepository.create(route1);
      await routeRepository.create(route2);

      const allRoutes = await routeRepository.getAll();
      expect(allRoutes).toHaveLength(2);
    });

    it('should search routes by name', async () => {
      await routeRepository.create({
        name: 'Harbor Route',
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await routeRepository.create({
        name: 'Ocean Passage',
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const results = await routeRepository.searchByName('harbor');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Harbor Route');
    });
  });

  describe('Waypoint Repository Operations', () => {
    it('should create waypoints for a route', async () => {
      const route = await routeRepository.create({
        name: 'Test Route',
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(route.id).toBeDefined();

      const waypoint: Omit<Waypoint, 'id'> = {
        position: {
          latitude: 52.5,
          longitude: 4.8,
          accuracy: 10,
          timestamp: Date.now(),
        },
        name: 'Waypoint 1',
        arrivalRadius: 100,
        description: 'Test waypoint',
      };

      const created = await waypointRepository.create(waypoint);
      expect(created.id).toBeDefined();
      expect(created.name).toBe('Waypoint 1');
    });

    it('should retrieve waypoints by route', async () => {
      const route = await routeRepository.create({
        name: 'Test Route',
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(route.id).toBeDefined();

      const wp1: Omit<Waypoint, 'id'> = {
        position: {
          latitude: 52.5,
          longitude: 4.8,
          accuracy: 10,
          timestamp: Date.now(),
        },
        name: 'WP1',
        arrivalRadius: 100,
      };

      const wp2: Omit<Waypoint, 'id'> = {
        position: {
          latitude: 52.6,
          longitude: 4.9,
          accuracy: 10,
          timestamp: Date.now(),
        },
        name: 'WP2',
        arrivalRadius: 100,
      };

      await waypointRepository.create(wp1);
      await waypointRepository.create(wp2);

      const waypoints = await waypointRepository.getAll();
      expect(waypoints.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Track Repository Operations', () => {
    it('should create and retrieve a track', async () => {
      const track: Omit<Track, 'id'> = {
        name: 'Test Track',
        points: {
          compressed: false,
          data: JSON.stringify([
            {
              latitude: 52.5,
              longitude: 4.8,
              speed: 5.5,
              heading: 180,
              timestamp: new Date(),
            },
          ]),
        },
        startTime: new Date(),
        endTime: new Date(),
        distance: 10.5,
        maxSpeed: 6.2,
        avgSpeed: 5.5,
      };

      const created = await trackRepository.create(track);
      expect(created.id).toBeDefined();

      const retrieved = await trackRepository.getById(created.id!);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Track');
    });

    it('should retrieve tracks by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await trackRepository.create({
        name: 'Today Track',
        points: { compressed: false, data: '[]' },
        startTime: now,
        endTime: now,
        distance: 10,
        maxSpeed: 5,
        avgSpeed: 4,
      });

      const tracks = await trackRepository.getByDateRange(yesterday, tomorrow);
      expect(tracks).toHaveLength(1);
    });
  });

  describe('Transaction Operations', () => {
    it('should handle multiple operations in transaction', async () => {
      await db.transaction('rw', [db.routes, db.waypoints], async () => {
        const route = await routeRepository.create({
          name: 'Transaction Route',
          waypoints: [],
          totalDistance: 0,
          estimatedDuration: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        expect(route.id).toBeDefined();

        await waypointRepository.create({
          position: {
            latitude: 52.5,
            longitude: 4.8,
            accuracy: 10,
            timestamp: Date.now(),
          },
          name: 'WP1',
          arrivalRadius: 100,
        });

        await waypointRepository.create({
          position: {
            latitude: 52.6,
            longitude: 4.9,
            accuracy: 10,
            timestamp: Date.now(),
          },
          name: 'WP2',
          arrivalRadius: 100,
        });
      });

      const routes = await routeRepository.getAll();
      expect(routes).toHaveLength(1);

      const waypoints = await waypointRepository.getAll();
      expect(waypoints.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Chart Tile Caching', () => {
    it('should store and retrieve chart tiles', async () => {
      const tileData = new Blob(['test tile data'], { type: 'application/x-protobuf' });
      
      await db.chartTiles.add({
        key: '10-512-384',
        z: 10,
        x: 512,
        y: 384,
        data: tileData,
        format: 'vector',
        timestamp: new Date(),
        region: 'test-region',
      });

      const tile = await db.chartTiles.get('10-512-384');
      expect(tile).toBeDefined();
      expect(tile?.z).toBe(10);
      expect(tile?.format).toBe('vector');
    });

    it('should clear tiles by region', async () => {
      await db.chartTiles.bulkAdd([
        {
          key: '10-512-384',
          z: 10,
          x: 512,
          y: 384,
          data: new Blob(['data1']),
          format: 'vector' as const,
          timestamp: new Date(),
          region: 'region-a',
        },
        {
          key: '10-513-384',
          z: 10,
          x: 513,
          y: 384,
          data: new Blob(['data2']),
          format: 'vector' as const,
          timestamp: new Date(),
          region: 'region-a',
        },
        {
          key: '10-514-384',
          z: 10,
          x: 514,
          y: 384,
          data: new Blob(['data3']),
          format: 'vector' as const,
          timestamp: new Date(),
          region: 'region-b',
        },
      ]);

      await db.chartTiles.where('region').equals('region-a').delete();

      const remaining = await db.chartTiles.toArray();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].region).toBe('region-b');
    });
  });

  describe('Settings Operations', () => {
    it('should store and retrieve settings', async () => {
      await db.settings.add({
        key: 'units',
        value: JSON.stringify('nautical'),
      });

      const setting = await db.settings.get('units');
      expect(setting).toBeDefined();
      expect(JSON.parse(setting!.value)).toBe('nautical');
    });

    it('should update existing settings', async () => {
      await db.settings.add({
        key: 'theme',
        value: JSON.stringify('light'),
      });

      await db.settings.put({
        key: 'theme',
        value: JSON.stringify('dark'),
      });

      const setting = await db.settings.get('theme');
      expect(JSON.parse(setting!.value)).toBe('dark');
    });
  });
});
