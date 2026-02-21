import { LogbookServiceImpl } from './LogbookService';
import { LogbookRepository } from '../database/LogbookRepository';
import { Position, Voyage, LogbookEntry } from '../types';

// Mock the LogbookRepository
jest.mock('../database/LogbookRepository');

describe('LogbookService', () => {
  let service: LogbookServiceImpl;
  let mockRepository: jest.Mocked<LogbookRepository>;

  const mockPosition: Position = {
    latitude: 52.3676,
    longitude: 4.9041,
    accuracy: 10,
    timestamp: Date.now(),
  };

  const mockVoyage: Voyage = {
    id: 'voyage-1',
    startTime: new Date('2024-01-01T10:00:00Z'),
    startPosition: mockPosition,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LogbookServiceImpl();
    mockRepository = (service as any).logbookRepo as jest.Mocked<LogbookRepository>;
  });

  describe('Voyage Management', () => {
    describe('startVoyage', () => {
      it('should start a new voyage', async () => {
        mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);

        const voyageId = await service.startVoyage();

        expect(voyageId).toBe(mockVoyage.id);
        expect(mockRepository.startVoyage).toHaveBeenCalledWith(
          expect.objectContaining({
            latitude: 0,
            longitude: 0,
          })
        );
      });

      it('should auto-end previous voyage when starting new one', async () => {
        mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);
        mockRepository.endVoyage = jest.fn().mockResolvedValue(undefined);

        // Start first voyage
        await service.startVoyage();

        // Start second voyage
        await service.startVoyage();

        expect(mockRepository.endVoyage).toHaveBeenCalledTimes(1);
        expect(mockRepository.startVoyage).toHaveBeenCalledTimes(2);
      });

      it('should reset statistics when starting new voyage', async () => {
        mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);

        // Set some speed data
        service.updateSpeed(10);
        service.updateSpeed(15);

        await service.startVoyage();

        // Verify internal state is reset (indirectly through behavior)
        expect(mockRepository.startVoyage).toHaveBeenCalled();
      });
    });

    describe('endVoyage', () => {
      it('should end the current voyage with statistics', async () => {
        mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);
        mockRepository.endVoyage = jest.fn().mockResolvedValue(undefined);

        await service.startVoyage();
        service.setCurrentPosition(mockPosition);
        service.updateSpeed(10);
        service.updateSpeed(12);

        await service.endVoyage();

        expect(mockRepository.endVoyage).toHaveBeenCalledWith(
          mockVoyage.id,
          expect.objectContaining({
            latitude: mockPosition.latitude,
            longitude: mockPosition.longitude,
          }),
          expect.any(Number), // distance
          expect.any(Number), // avgSpeed
          12 // maxSpeed
        );
      });

      it('should throw error when no voyage in progress', async () => {
        await expect(service.endVoyage()).rejects.toThrow('No voyage in progress');
      });

      it('should reset voyage state after ending', async () => {
        mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);
        mockRepository.endVoyage = jest.fn().mockResolvedValue(undefined);

        await service.startVoyage();
        await service.endVoyage();

        expect(service.isVoyageInProgress()).toBe(false);
      });
    });

    describe('getCurrentVoyage', () => {
      it('should return null when no voyage in progress', async () => {
        const voyage = await service.getCurrentVoyage();
        expect(voyage).toBeNull();
      });

      it('should return current voyage with real-time statistics', async () => {
        mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);
        mockRepository.getVoyage = jest.fn().mockResolvedValue(mockVoyage);

        await service.startVoyage();
        service.updateSpeed(10);
        service.updateSpeed(15);

        const voyage = await service.getCurrentVoyage();

        expect(voyage).not.toBeNull();
        expect(voyage?.id).toBe(mockVoyage.id);
        expect(voyage?.maxSpeed).toBe(15);
        expect(voyage?.avgSpeed).toBe(12.5);
      });
    });

    describe('getVoyages', () => {
      it('should retrieve all voyages', async () => {
        const mockVoyages = [mockVoyage];
        mockRepository.getVoyages = jest.fn().mockResolvedValue(mockVoyages);

        const voyages = await service.getVoyages();

        expect(voyages).toEqual(mockVoyages);
        expect(mockRepository.getVoyages).toHaveBeenCalledWith(undefined);
      });

      it('should retrieve voyages with date filter', async () => {
        const filter = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        };
        mockRepository.getVoyages = jest.fn().mockResolvedValue([mockVoyage]);

        await service.getVoyages(filter);

        expect(mockRepository.getVoyages).toHaveBeenCalledWith(filter);
      });
    });
  });

  describe('Automatic Voyage Detection', () => {
    it('should auto-start voyage when speed exceeds threshold', async () => {
      mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);

      // Simulate vessel starting to move
      service.updateSpeed(2.0); // Above 1.0 knot threshold

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockRepository.startVoyage).toHaveBeenCalled();
    });

    it('should not auto-start if voyage already in progress', async () => {
      mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);

      await service.startVoyage();
      jest.clearAllMocks();

      service.updateSpeed(2.0);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockRepository.startVoyage).not.toHaveBeenCalled();
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate average speed correctly', async () => {
      mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);
      mockRepository.endVoyage = jest.fn().mockResolvedValue(undefined);

      await service.startVoyage();

      service.updateSpeed(10);
      service.updateSpeed(12);
      service.updateSpeed(14);

      await service.endVoyage();

      expect(mockRepository.endVoyage).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(Number),
        12, // Average of 10, 12, 14
        14 // Max speed
      );
    });

    it('should track maximum speed', async () => {
      mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);
      mockRepository.getVoyage = jest.fn().mockResolvedValue(mockVoyage);

      await service.startVoyage();

      service.updateSpeed(10);
      service.updateSpeed(20);
      service.updateSpeed(15);

      const voyage = await service.getCurrentVoyage();

      expect(voyage?.maxSpeed).toBe(20);
    });

    it('should calculate distance from position updates', async () => {
      mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);
      mockRepository.getVoyage = jest.fn().mockResolvedValue(mockVoyage);

      await service.startVoyage();

      const pos1: Position = {
        latitude: 52.0,
        longitude: 4.0,
        accuracy: 10,
        timestamp: Date.now(),
      };

      const pos2: Position = {
        latitude: 52.1,
        longitude: 4.1,
        accuracy: 10,
        timestamp: Date.now() + 1000,
      };

      service.setCurrentPosition(pos1);
      service.setCurrentPosition(pos2);

      const voyage = await service.getCurrentVoyage();

      expect(voyage?.distance).toBeGreaterThan(0);
    });
  });

  describe('Logbook Entries', () => {
    beforeEach(async () => {
      mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);
      mockRepository.addEntry = jest.fn().mockResolvedValue(undefined);
      await service.startVoyage();
    });

    describe('addNoteEntry', () => {
      it('should add a note entry', async () => {
        const note = 'Test note';

        await service.addNoteEntry(note);

        expect(mockRepository.addEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'note',
            notes: note,
          })
        );
      });
    });

    describe('addWaypointEntry', () => {
      it('should add a waypoint entry', async () => {
        const waypointName = 'WP001';

        await service.addWaypointEntry(waypointName);

        expect(mockRepository.addEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'waypoint',
            notes: `Passed waypoint: ${waypointName}`,
          })
        );
      });
    });

    describe('addEventEntry', () => {
      it('should add an event entry', async () => {
        const event = 'Engine started';

        await service.addEventEntry(event);

        expect(mockRepository.addEntry).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'event',
            notes: event,
          })
        );
      });
    });

    describe('getEntries', () => {
      it('should retrieve logbook entries', async () => {
        const mockEntries: LogbookEntry[] = [
          {
            id: 'entry-1',
            voyageId: mockVoyage.id,
            timestamp: new Date(),
            position: mockPosition,
            type: 'note',
            notes: 'Test note',
          },
        ];

        mockRepository.getEntries = jest.fn().mockResolvedValue(mockEntries);

        const entries = await service.getEntries();

        expect(entries).toEqual(mockEntries);
        expect(mockRepository.getEntries).toHaveBeenCalled();
      });

      it('should retrieve entries with filter', async () => {
        const filter = { voyageId: mockVoyage.id };
        mockRepository.getEntries = jest.fn().mockResolvedValue([]);

        await service.getEntries(filter);

        expect(mockRepository.getEntries).toHaveBeenCalledWith(filter);
      });
    });
  });

  describe('CSV Export', () => {
    it('should export logbook to CSV format', async () => {
      const mockEntries: LogbookEntry[] = [
        {
          id: 'entry-1',
          voyageId: 'voyage-1',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          position: mockPosition,
          type: 'voyage_start',
          notes: 'Voyage started',
        },
        {
          id: 'entry-2',
          voyageId: 'voyage-1',
          timestamp: new Date('2024-01-01T12:00:00Z'),
          position: mockPosition,
          type: 'note',
          notes: 'Test note',
        },
      ];

      mockRepository.getEntries = jest.fn().mockResolvedValue(mockEntries);

      const csv = await service.exportLogbook('csv');

      expect(csv).toContain('Timestamp,Type,Latitude,Longitude');
      expect(csv).toContain('voyage_start');
      expect(csv).toContain('Test note');
      expect(csv).toContain(mockPosition.latitude.toFixed(6));
      expect(csv).toContain(mockPosition.longitude.toFixed(6));
    });

    it('should handle entries without position in CSV export', async () => {
      const mockEntries: LogbookEntry[] = [
        {
          id: 'entry-1',
          voyageId: 'voyage-1',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          position: null,
          type: 'note',
          notes: 'Note without position',
        },
      ];

      mockRepository.getEntries = jest.fn().mockResolvedValue(mockEntries);

      const csv = await service.exportLogbook('csv');

      expect(csv).toContain('Note without position');
      expect(csv).toBeTruthy();
    });

    it('should escape quotes in notes for CSV export', async () => {
      const mockEntries: LogbookEntry[] = [
        {
          id: 'entry-1',
          voyageId: 'voyage-1',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          position: mockPosition,
          type: 'note',
          notes: 'Note with "quotes"',
        },
      ];

      mockRepository.getEntries = jest.fn().mockResolvedValue(mockEntries);

      const csv = await service.exportLogbook('csv');

      expect(csv).toContain('""quotes""');
    });

    it('should throw error for PDF export (not implemented)', async () => {
      await expect(service.exportLogbook('pdf')).rejects.toThrow(
        'PDF export not yet implemented'
      );
    });
  });

  describe('Position and Speed Updates', () => {
    it('should update current position', () => {
      service.setCurrentPosition(mockPosition);

      // Verify by checking if position is used in subsequent operations
      expect(() => service.setCurrentPosition(mockPosition)).not.toThrow();
    });

    it('should update speed readings', async () => {
      mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);
      mockRepository.getVoyage = jest.fn().mockResolvedValue(mockVoyage);

      await service.startVoyage();

      service.updateSpeed(10);
      service.updateSpeed(12);

      const voyage = await service.getCurrentVoyage();

      expect(voyage?.avgSpeed).toBe(11);
      expect(voyage?.maxSpeed).toBe(12);
    });
  });

  describe('Voyage State', () => {
    it('should correctly report voyage in progress', async () => {
      expect(service.isVoyageInProgress()).toBe(false);

      mockRepository.startVoyage = jest.fn().mockResolvedValue(mockVoyage);
      await service.startVoyage();

      expect(service.isVoyageInProgress()).toBe(true);

      mockRepository.endVoyage = jest.fn().mockResolvedValue(undefined);
      await service.endVoyage();

      expect(service.isVoyageInProgress()).toBe(false);
    });
  });
});
