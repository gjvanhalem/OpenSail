import { TrackServiceImpl } from './TrackService';
import { TrackRepository } from '../database/TrackRepository';
import { Position, Track, TrackPoint } from '../types';

// Mock the TrackRepository
jest.mock('../database/TrackRepository');

describe('TrackService', () => {
  let trackService: TrackServiceImpl;
  let mockTrackRepo: jest.Mocked<TrackRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    trackService = new TrackServiceImpl();
    mockTrackRepo = (trackService as any).trackRepo as jest.Mocked<TrackRepository>;
  });

  describe('Track Recording', () => {
    it('should start recording a new track', async () => {
      const trackName = 'Test Track';
      const mockTrackId = 'track-123';

      mockTrackRepo.startRecording = jest.fn().mockResolvedValue({
        id: mockTrackId,
        name: trackName,
        points: [],
        startTime: new Date(),
        endTime: new Date(),
        distance: 0,
        maxSpeed: 0,
        avgSpeed: 0
      });

      const trackId = await trackService.startRecording(trackName);

      expect(trackId).toBeDefined();
      expect(mockTrackRepo.startRecording).toHaveBeenCalledWith(
        trackName,
        expect.any(Object)
      );
    });

    it('should throw error if recording already in progress', async () => {
      mockTrackRepo.startRecording = jest.fn().mockResolvedValue({
        id: 'track-123',
        name: 'Track 1',
        points: [],
        startTime: new Date(),
        endTime: new Date(),
        distance: 0,
        maxSpeed: 0,
        avgSpeed: 0
      });

      await trackService.startRecording('Track 1');

      await expect(trackService.startRecording('Track 2')).rejects.toThrow(
        'Track recording already in progress'
      );
    });

    it('should stop recording and save track', async () => {
      mockTrackRepo.startRecording = jest.fn().mockResolvedValue({
        id: 'track-123',
        name: 'Test Track',
        points: [],
        startTime: new Date(),
        endTime: new Date(),
        distance: 0,
        maxSpeed: 0,
        avgSpeed: 0
      });
      mockTrackRepo.stopRecording = jest.fn().mockResolvedValue(undefined);

      await trackService.startRecording('Test Track');
      await trackService.stopRecording();

      expect(mockTrackRepo.stopRecording).toHaveBeenCalled();
    });

    it('should throw error when stopping without active recording', async () => {
      await expect(trackService.stopRecording()).rejects.toThrow(
        'No track recording in progress'
      );
    });

    it('should record track points at intervals', async () => {
      jest.useFakeTimers();

      mockTrackRepo.startRecording = jest.fn().mockResolvedValue({
        id: 'track-123',
        name: 'Test Track',
        points: [],
        startTime: new Date(),
        endTime: new Date(),
        distance: 0,
        maxSpeed: 0,
        avgSpeed: 0
      });
      mockTrackRepo.addTrackPoint = jest.fn().mockResolvedValue(undefined);

      await trackService.startRecording('Test Track');

      const position: Position = {
        latitude: 52.0,
        longitude: 4.0,
        accuracy: 10,
        timestamp: Date.now()
      };

      trackService.setCurrentPosition(position);

      // Advance time by 10 seconds
      jest.advanceTimersByTime(10000);

      // Wait for async operations
      await Promise.resolve();

      expect(mockTrackRepo.addTrackPoint).toHaveBeenCalled();

      // Clean up
      await trackService.stopRecording();
      jest.useRealTimers();
    });
  });

  describe('Track Statistics', () => {
    it('should calculate track statistics correctly', async () => {
      const mockTrack: Track = {
        id: 'track-123',
        name: 'Test Track',
        points: [
          {
            position: { latitude: 52.0, longitude: 4.0, accuracy: 10, timestamp: Date.now() },
            speed: 5.0,
            heading: 90,
            timestamp: new Date('2024-01-01T10:00:00Z')
          },
          {
            position: { latitude: 52.01, longitude: 4.01, accuracy: 10, timestamp: Date.now() },
            speed: 6.0,
            heading: 90,
            timestamp: new Date('2024-01-01T10:10:00Z')
          },
          {
            position: { latitude: 52.02, longitude: 4.02, accuracy: 10, timestamp: Date.now() },
            speed: 7.0,
            heading: 90,
            timestamp: new Date('2024-01-01T10:20:00Z')
          }
        ],
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:20:00Z'),
        distance: 1.5,
        maxSpeed: 7.0,
        avgSpeed: 6.0
      };

      mockTrackRepo.getTrack = jest.fn().mockResolvedValue(mockTrack);

      const track = await trackService.getTrack('track-123');

      expect(track).toBeDefined();
      expect(track?.distance).toBe(1.5);
      expect(track?.maxSpeed).toBe(7.0);
      expect(track?.avgSpeed).toBe(6.0);
    });
  });

  describe('Track Export', () => {
    const mockTrack: Track = {
      id: 'track-123',
      name: 'Test Track',
      points: [
        {
          position: { latitude: 52.0, longitude: 4.0, accuracy: 10, timestamp: Date.now() },
          speed: 5.0,
          heading: 90,
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          position: { latitude: 52.01, longitude: 4.01, accuracy: 10, timestamp: Date.now() },
          speed: 6.0,
          heading: 95,
          timestamp: new Date('2024-01-01T10:10:00Z')
        }
      ],
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T10:10:00Z'),
      distance: 0.8,
      maxSpeed: 6.0,
      avgSpeed: 5.5
    };

    beforeEach(() => {
      mockTrackRepo.getTrack = jest.fn().mockResolvedValue(mockTrack);
    });

    it('should export track to GPX format', async () => {
      const gpx = await trackService.exportTrack('track-123', 'gpx');

      expect(gpx).toContain('<?xml version="1.0"');
      expect(gpx).toContain('<gpx');
      expect(gpx).toContain('<trk>');
      expect(gpx).toContain('<name>Test Track</name>');
      expect(gpx).toContain('lat="52"');
      expect(gpx).toContain('lon="4"');
      expect(gpx).toContain('<speed>5</speed>');
      expect(gpx).toContain('<course>90</course>');
    });

    it('should export track to KML format', async () => {
      const kml = await trackService.exportTrack('track-123', 'kml');

      expect(kml).toContain('<?xml version="1.0"');
      expect(kml).toContain('<kml');
      expect(kml).toContain('<Document>');
      expect(kml).toContain('<name>Test Track</name>');
      expect(kml).toContain('<LineString>');
      expect(kml).toContain('<coordinates>');
      expect(kml).toContain('4,52,0');
    });

    it('should throw error when exporting non-existent track', async () => {
      mockTrackRepo.getTrack = jest.fn().mockResolvedValue(null);

      await expect(trackService.exportTrack('invalid-id', 'gpx')).rejects.toThrow(
        'Track not found'
      );
    });

    it('should escape XML special characters in track name', async () => {
      const trackWithSpecialChars: Track = {
        ...mockTrack,
        name: 'Track <with> "special" & \'chars\''
      };

      mockTrackRepo.getTrack = jest.fn().mockResolvedValue(trackWithSpecialChars);

      const gpx = await trackService.exportTrack('track-123', 'gpx');

      expect(gpx).toContain('&lt;with&gt;');
      expect(gpx).toContain('&quot;special&quot;');
      expect(gpx).toContain('&amp;');
      expect(gpx).toContain('&apos;chars&apos;');
    });
  });

  describe('Track to Route Conversion', () => {
    it('should convert track to route with sampled waypoints', async () => {
      const points: TrackPoint[] = [];
      for (let i = 0; i < 100; i++) {
        points.push({
          position: {
            latitude: 52.0 + i * 0.001,
            longitude: 4.0 + i * 0.001,
            accuracy: 10,
            timestamp: Date.now()
          },
          speed: 5.0,
          heading: 90,
          timestamp: new Date(Date.now() + i * 10000)
        });
      }

      const mockTrack: Track = {
        id: 'track-123',
        name: 'Long Track',
        points,
        startTime: new Date(),
        endTime: new Date(),
        distance: 10.0,
        maxSpeed: 7.0,
        avgSpeed: 5.5
      };

      mockTrackRepo.getTrack = jest.fn().mockResolvedValue(mockTrack);

      const route = await trackService.convertToRoute('track-123');

      expect(route).toBeDefined();
      expect(route.name).toBe('Route from Long Track');
      expect(route.waypoints.length).toBeGreaterThan(0);
      expect(route.waypoints.length).toBeLessThanOrEqual(21); // Max 20 + last point
      expect(route.totalDistance).toBeGreaterThan(0);
    });

    it('should include first and last points in route', async () => {
      const mockTrack: Track = {
        id: 'track-123',
        name: 'Test Track',
        points: [
          {
            position: { latitude: 52.0, longitude: 4.0, accuracy: 10, timestamp: Date.now() },
            speed: 5.0,
            heading: 90,
            timestamp: new Date()
          },
          {
            position: { latitude: 52.05, longitude: 4.05, accuracy: 10, timestamp: Date.now() },
            speed: 5.0,
            heading: 90,
            timestamp: new Date()
          }
        ],
        startTime: new Date(),
        endTime: new Date(),
        distance: 5.0,
        maxSpeed: 5.0,
        avgSpeed: 5.0
      };

      mockTrackRepo.getTrack = jest.fn().mockResolvedValue(mockTrack);

      const route = await trackService.convertToRoute('track-123');

      expect(route.waypoints[0].position.latitude).toBe(52.0);
      expect(route.waypoints[route.waypoints.length - 1].position.latitude).toBe(52.05);
    });

    it('should throw error when converting non-existent track', async () => {
      mockTrackRepo.getTrack = jest.fn().mockResolvedValue(null);

      await expect(trackService.convertToRoute('invalid-id')).rejects.toThrow(
        'Track not found'
      );
    });
  });

  describe('Track Management', () => {
    it('should retrieve track by ID', async () => {
      const mockTrack: Track = {
        id: 'track-123',
        name: 'Test Track',
        points: [],
        startTime: new Date(),
        endTime: new Date(),
        distance: 0,
        maxSpeed: 0,
        avgSpeed: 0
      };

      mockTrackRepo.getTrack = jest.fn().mockResolvedValue(mockTrack);

      const track = await trackService.getTrack('track-123');

      expect(track).toEqual(mockTrack);
      expect(mockTrackRepo.getTrack).toHaveBeenCalledWith('track-123');
    });

    it('should retrieve tracks with filter', async () => {
      const mockTracks: Track[] = [
        {
          id: 'track-1',
          name: 'Track 1',
          points: [],
          startTime: new Date('2024-01-01'),
          endTime: new Date('2024-01-01'),
          distance: 5.0,
          maxSpeed: 6.0,
          avgSpeed: 5.0
        },
        {
          id: 'track-2',
          name: 'Track 2',
          points: [],
          startTime: new Date('2024-01-02'),
          endTime: new Date('2024-01-02'),
          distance: 10.0,
          maxSpeed: 7.0,
          avgSpeed: 6.0
        }
      ];

      mockTrackRepo.getTracks = jest.fn().mockResolvedValue(mockTracks);

      const filter = { minDistance: 5.0 };
      const tracks = await trackService.getTracks(filter);

      expect(tracks).toEqual(mockTracks);
      expect(mockTrackRepo.getTracks).toHaveBeenCalledWith(filter);
    });

    it('should delete track', async () => {
      mockTrackRepo.deleteTrack = jest.fn().mockResolvedValue(undefined);

      await trackService.deleteTrack('track-123');

      expect(mockTrackRepo.deleteTrack).toHaveBeenCalledWith('track-123');
    });
  });

  describe('Track Compression', () => {
    it('should compress old tracks', async () => {
      mockTrackRepo.compressOldTracks = jest.fn().mockResolvedValue(5);

      const compressedCount = await trackService.compressOldTracks();

      expect(compressedCount).toBe(5);
      expect(mockTrackRepo.compressOldTracks).toHaveBeenCalled();
    });
  });
});
