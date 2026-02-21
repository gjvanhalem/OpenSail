import { RouteRepository } from './RouteRepository';
import { TrackRepository } from './TrackRepository';
import { LogbookRepository } from './LogbookRepository';
import { AISRepository } from './AISRepository';
import { getDatabase, closeDatabase } from './index';
import { Waypoint, Position } from '../types';

describe('Data Access Layer', () => {
  beforeEach(async () => {
    await getDatabase();
  });

  afterEach(async () => {
    await closeDatabase();
  });

  describe('RouteRepository', () => {
    let repo: RouteRepository;

    beforeEach(() => {
      repo = new RouteRepository();
    });

    it('should create a route with waypoints', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 4.0, accuracy: 0, timestamp: 0 },
          name: 'Start',
          arrivalRadius: 50,
        },
        {
          id: 'wp2',
          position: { latitude: 52.1, longitude: 4.1, accuracy: 0, timestamp: 0 },
          name: 'End',
          arrivalRadius: 50,
        },
      ];

      const route = await repo.createRoute('Test Route', waypoints);

      expect(route).toBeDefined();
      expect(route.id).toBeDefined();
      expect(route.name).toBe('Test Route');
      expect(route.waypoints).toHaveLength(2);
      expect(route.totalDistance).toBeGreaterThan(0);
    });

    it('should retrieve a route by id', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 4.0, accuracy: 0, timestamp: 0 },
          name: 'Start',
          arrivalRadius: 50,
        },
      ];

      const created = await repo.createRoute('Test Route', waypoints);
      const retrieved = await repo.getRoute(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test Route');
    });

    it('should delete a route', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 4.0, accuracy: 0, timestamp: 0 },
          name: 'Start',
          arrivalRadius: 50,
        },
      ];

      const route = await repo.createRoute('Test Route', waypoints);
      await repo.deleteRoute(route.id);

      const retrieved = await repo.getRoute(route.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('TrackRepository', () => {
    let repo: TrackRepository;

    beforeEach(() => {
      repo = new TrackRepository();
    });

    it('should create a track', async () => {
      const track = await repo.createTrack('Test Track');

      expect(track).toBeDefined();
      expect(track.id).toBeDefined();
      expect(track.name).toBe('Test Track');
      expect(track.startTime).toBeDefined();
    });

    it('should add track points', async () => {
      const track = await repo.createTrack('Test Track');
      const position: Position = {
        latitude: 52.0,
        longitude: 4.0,
        accuracy: 10,
        timestamp: Date.now(),
      };

      await repo.addTrackPoint(track.id, position, 5.0, 90);

      const retrieved = await repo.getTrack(track.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.points).toHaveLength(1);
    });
  });

  describe('LogbookRepository', () => {
    let repo: LogbookRepository;

    beforeEach(() => {
      repo = new LogbookRepository();
    });

    it('should create a voyage', async () => {
      const position: Position = {
        latitude: 52.0,
        longitude: 4.0,
        accuracy: 10,
        timestamp: Date.now(),
      };

      const voyage = await repo.createVoyage(position);

      expect(voyage).toBeDefined();
      expect(voyage.id).toBeDefined();
      expect(voyage.startTime).toBeDefined();
      expect(voyage.startPosition).toEqual(position);
    });

    it('should add logbook entry', async () => {
      const position: Position = {
        latitude: 52.0,
        longitude: 4.0,
        accuracy: 10,
        timestamp: Date.now(),
      };

      const voyage = await repo.createVoyage(position);
      await repo.addEntry(voyage.id, 'note', position, 'Test note');

      const entries = await repo.getEntries(voyage.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].notes).toBe('Test note');
    });
  });

  describe('AISRepository', () => {
    let repo: AISRepository;

    beforeEach(() => {
      repo = new AISRepository();
    });

    it('should upsert AIS target', async () => {
      const target = {
        mmsi: '123456789',
        name: 'Test Vessel',
        callSign: 'TEST',
        position: { latitude: 52.0, longitude: 4.0, accuracy: 0, timestamp: Date.now() },
        course: 90,
        speed: 10,
        heading: 90,
        vesselType: 70,
        length: 50,
        width: 10,
        lastUpdate: new Date(),
      };

      await repo.upsertTarget(target);

      const retrieved = await repo.getTarget('123456789');
      expect(retrieved).toBeDefined();
      expect(retrieved?.mmsi).toBe('123456789');
      expect(retrieved?.name).toBe('Test Vessel');
    });

    it('should get all targets', async () => {
      const target1 = {
        mmsi: '111111111',
        name: 'Vessel 1',
        callSign: 'V1',
        position: { latitude: 52.0, longitude: 4.0, accuracy: 0, timestamp: Date.now() },
        course: 90,
        speed: 10,
        heading: 90,
        vesselType: 70,
        length: 50,
        width: 10,
        lastUpdate: new Date(),
      };

      const target2 = {
        mmsi: '222222222',
        name: 'Vessel 2',
        callSign: 'V2',
        position: { latitude: 52.1, longitude: 4.1, accuracy: 0, timestamp: Date.now() },
        course: 180,
        speed: 15,
        heading: 180,
        vesselType: 70,
        length: 60,
        width: 12,
        lastUpdate: new Date(),
      };

      await repo.upsertTarget(target1);
      await repo.upsertTarget(target2);

      const targets = await repo.getAllTargets();
      expect(targets.length).toBeGreaterThanOrEqual(2);
    });
  });
});
