import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TrackRepository } from '../TrackRepository';
import type { Track, TrackPoint } from '../../db';
import 'fake-indexeddb/auto';

describe('TrackRepository', () => {
  let repository: TrackRepository;

  beforeEach(() => {
    repository = new TrackRepository();
  });

  afterEach(() => {
    repository.destroy();
  });

  const createTrackPoint = (lat: number, lon: number): TrackPoint => ({
    latitude: lat,
    longitude: lon,
    timestamp: new Date(),
    speed: 5.0,
    heading: 180,
  });

  const createTrack = (name: string, pointCount: number = 10): Omit<Track, 'id'> => {
    const points: TrackPoint[] = [];
    for (let i = 0; i < pointCount; i++) {
      points.push(createTrackPoint(50.0 + i * 0.01, -5.0 + i * 0.01));
    }

    return {
      name,
      startTime: new Date(),
      endTime: new Date(),
      points: {
        compressed: false,
        data: JSON.stringify(points),
      },
      distance: 10.5,
      avgSpeed: 5.2,
      maxSpeed: 7.5,
    };
  };

  describe('create', () => {
    it('should create a track with compressed points', async () => {
      const trackData = createTrack('Test Track');

      const created = await repository.create(trackData);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.name).toBe('Test Track');
      expect(created.points.compressed).toBe(true);
    });

    it('should generate unique IDs', async () => {
      const track1 = await repository.create(createTrack('Track 1'));
      const track2 = await repository.create(createTrack('Track 2'));

      expect(track1.id).not.toBe(track2.id);
    });
  });

  describe('getByIdWithPoints', () => {
    it('should retrieve track with decompressed points', async () => {
      const trackData = createTrack('Test Track', 5);
      const created = await repository.create(trackData);

      const retrieved = await repository.getByIdWithPoints(created.id!);

      expect(retrieved).toBeDefined();
      expect(retrieved?.decompressedPoints).toBeDefined();
      expect(retrieved?.decompressedPoints.length).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent track', async () => {
      const retrieved = await repository.getByIdWithPoints('non-existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllSorted', () => {
    it('should return tracks sorted by start time descending', async () => {
      const track1 = createTrack('Track 1');
      track1.startTime = new Date('2024-01-01');
      
      const track2 = createTrack('Track 2');
      track2.startTime = new Date('2024-01-02');

      await repository.create(track1);
      await repository.create(track2);

      const sorted = await repository.getAllSorted('desc');

      expect(sorted.length).toBeGreaterThanOrEqual(2);
      expect(sorted[0].startTime.getTime()).toBeGreaterThanOrEqual(sorted[1].startTime.getTime());
    });

    it('should return tracks sorted by start time ascending', async () => {
      const track1 = createTrack('Track 1');
      track1.startTime = new Date('2024-01-01');
      
      const track2 = createTrack('Track 2');
      track2.startTime = new Date('2024-01-02');

      await repository.create(track1);
      await repository.create(track2);

      const sorted = await repository.getAllSorted('asc');

      expect(sorted.length).toBeGreaterThanOrEqual(2);
      expect(sorted[0].startTime.getTime()).toBeLessThanOrEqual(sorted[1].startTime.getTime());
    });
  });

  describe('searchByName', () => {
    it('should find tracks by name', async () => {
      await repository.create(createTrack('Morning Sail'));
      await repository.create(createTrack('Evening Cruise'));
      await repository.create(createTrack('Morning Run'));

      const results = await repository.searchByName('Morning');

      expect(results.length).toBe(2);
      expect(results.every(t => t.name.includes('Morning'))).toBe(true);
    });

    it('should be case insensitive', async () => {
      await repository.create(createTrack('Test Track'));

      const results = await repository.searchByName('test');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getByMinDistance', () => {
    it('should filter tracks by minimum distance', async () => {
      const track1 = createTrack('Short');
      track1.distance = 5.0;
      
      const track2 = createTrack('Long');
      track2.distance = 15.0;

      await repository.create(track1);
      await repository.create(track2);

      const results = await repository.getByMinDistance(10.0);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(t => t.distance >= 10.0)).toBe(true);
    });
  });

  describe('updatePoints', () => {
    it('should update track points with compression', async () => {
      const track = await repository.create(createTrack('Test'));
      const newPoints = [
        createTrackPoint(51.0, -5.0),
        createTrackPoint(51.1, -5.1),
      ];

      const updated = await repository.updatePoints(track.id!, newPoints);

      expect(updated.points.compressed).toBe(true);
    });
  });

  describe('getStorageSize', () => {
    it('should calculate total storage size', async () => {
      await repository.create(createTrack('Track 1', 100));
      await repository.create(createTrack('Track 2', 100));

      const size = await repository.getStorageSize();

      expect(size).toBeGreaterThan(0);
    });
  });

  describe('getMemoryStats', () => {
    it('should return memory statistics', async () => {
      await repository.create(createTrack('Track 1', 50));
      await repository.create(createTrack('Track 2', 50));

      const stats = await repository.getMemoryStats();

      expect(stats.trackCount).toBeGreaterThanOrEqual(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.averageSize).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeGreaterThan(0);
    });
  });
});
