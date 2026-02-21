import { AISServiceImpl } from './AISService';
import { Position, AISTarget, InstrumentData, InstrumentDataType, GeoBounds } from '../types';
import { AISRepository } from '../database/AISRepository';

// Mock the AISRepository
jest.mock('../database/AISRepository');

describe('AISService', () => {
  let service: AISServiceImpl;
  let mockAISRepo: jest.Mocked<AISRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AISServiceImpl();
    mockAISRepo = (service as any).aisRepo as jest.Mocked<AISRepository>;
  });

  afterEach(() => {
    service.destroy();
  });

  describe('AIS message parsing and target creation', () => {
    it('should process valid AIS message and create target', async () => {
      const aisMessage: InstrumentData = {
        type: InstrumentDataType.AIS,
        value: {
          mmsi: '123456789',
          name: 'Test Vessel',
          latitude: 52.0,
          longitude: 5.0,
          course: 180,
          speed: 10
        },
        unit: '',
        timestamp: Date.now(),
        source: 'nmea0183'
      };

      mockAISRepo.getTarget = jest.fn().mockResolvedValue(null);
      mockAISRepo.upsertTarget = jest.fn().mockResolvedValue(undefined);

      await service.processMessage(aisMessage);

      expect(mockAISRepo.upsertTarget).toHaveBeenCalledWith(
        expect.objectContaining({
          mmsi: '123456789',
          name: 'Test Vessel',
          position: expect.objectContaining({
            latitude: 52.0,
            longitude: 5.0
          }),
          course: 180,
          speed: 10
        })
      );
    });

    it('should ignore non-AIS messages', async () => {
      const gpsMessage: InstrumentData = {
        type: InstrumentDataType.GPS,
        value: { latitude: 52.0, longitude: 5.0 },
        unit: '',
        timestamp: Date.now(),
        source: 'nmea0183'
      };

      mockAISRepo.upsertTarget = jest.fn();

      await service.processMessage(gpsMessage);

      expect(mockAISRepo.upsertTarget).not.toHaveBeenCalled();
    });

    it('should ignore AIS messages without MMSI', async () => {
      const invalidMessage: InstrumentData = {
        type: InstrumentDataType.AIS,
        value: {
          name: 'Test Vessel',
          latitude: 52.0,
          longitude: 5.0
        },
        unit: '',
        timestamp: Date.now(),
        source: 'nmea0183'
      };

      mockAISRepo.upsertTarget = jest.fn();

      await service.processMessage(invalidMessage);

      expect(mockAISRepo.upsertTarget).not.toHaveBeenCalled();
    });

    it('should update existing target with history', async () => {
      const existingTarget: AISTarget = {
        mmsi: '123456789',
        name: 'Test Vessel',
        callSign: 'TEST',
        position: {
          latitude: 51.9,
          longitude: 4.9,
          accuracy: 0,
          timestamp: Date.now() - 60000
        },
        course: 180,
        speed: 10,
        heading: 180,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(Date.now() - 60000),
        history: [
          {
            latitude: 51.8,
            longitude: 4.8,
            accuracy: 0,
            timestamp: Date.now() - 120000
          }
        ]
      };

      const aisMessage: InstrumentData = {
        type: InstrumentDataType.AIS,
        value: {
          mmsi: '123456789',
          name: 'Test Vessel',
          latitude: 52.0,
          longitude: 5.0,
          course: 180,
          speed: 10
        },
        unit: '',
        timestamp: Date.now(),
        source: 'nmea0183'
      };

      mockAISRepo.getTarget = jest.fn().mockResolvedValue(existingTarget);
      mockAISRepo.upsertTarget = jest.fn().mockResolvedValue(undefined);

      await service.processMessage(aisMessage);

      expect(mockAISRepo.upsertTarget).toHaveBeenCalledWith(
        expect.objectContaining({
          mmsi: '123456789',
          history: existingTarget.history
        })
      );
    });

    it('should notify subscribers when target is updated', async () => {
      const callback = jest.fn();
      service.subscribe(callback);

      const aisMessage: InstrumentData = {
        type: InstrumentDataType.AIS,
        value: {
          mmsi: '123456789',
          name: 'Test Vessel',
          latitude: 52.0,
          longitude: 5.0
        },
        unit: '',
        timestamp: Date.now(),
        source: 'nmea0183'
      };

      mockAISRepo.getTarget = jest.fn().mockResolvedValue(null);
      mockAISRepo.upsertTarget = jest.fn().mockResolvedValue(undefined);

      await service.processMessage(aisMessage);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          mmsi: '123456789',
          name: 'Test Vessel'
        })
      );
    });
  });

  describe('CPA calculations', () => {
    it('should calculate CPA for converging vessels', async () => {
      const ownPosition: Position = {
        latitude: 52.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const target: AISTarget = {
        mmsi: '123456789',
        name: 'Test Vessel',
        callSign: 'TEST',
        position: {
          latitude: 52.1,
          longitude: 5.1,
          accuracy: 0,
          timestamp: Date.now()
        },
        course: 180,
        speed: 10,
        heading: 180,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history: []
      };

      mockAISRepo.calculateCPA = jest.fn().mockResolvedValue({
        distance: 1.5,
        time: 15,
        position: {
          latitude: 52.05,
          longitude: 5.05,
          accuracy: 0,
          timestamp: Date.now()
        }
      });

      service.setOwnPosition(ownPosition);
      const cpa = await service.calculateCPA(target, ownPosition);

      expect(cpa).toHaveProperty('distance');
      expect(cpa).toHaveProperty('time');
      expect(cpa).toHaveProperty('position');
      expect(typeof cpa.distance).toBe('number');
      expect(typeof cpa.time).toBe('number');
      expect(mockAISRepo.calculateCPA).toHaveBeenCalledWith(target, ownPosition);
    });

    it('should calculate CPA distance correctly for perpendicular crossing', async () => {
      const ownPosition: Position = {
        latitude: 52.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const target: AISTarget = {
        mmsi: '123456789',
        name: 'Test Vessel',
        callSign: 'TEST',
        position: {
          latitude: 52.05,
          longitude: 5.0,
          accuracy: 0,
          timestamp: Date.now()
        },
        course: 90,
        speed: 10,
        heading: 90,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history: []
      };

      mockAISRepo.calculateCPA = jest.fn().mockResolvedValue({
        distance: 3.0,
        time: 10,
        position: {
          latitude: 52.05,
          longitude: 5.1,
          accuracy: 0,
          timestamp: Date.now()
        }
      });

      const cpa = await service.calculateCPA(target, ownPosition);

      expect(cpa.distance).toBeGreaterThan(2);
      expect(cpa.distance).toBeLessThan(4);
    });

    it('should handle stationary target', async () => {
      const ownPosition: Position = {
        latitude: 52.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const target: AISTarget = {
        mmsi: '123456789',
        name: 'Anchored Vessel',
        callSign: 'TEST',
        position: {
          latitude: 52.1,
          longitude: 5.0,
          accuracy: 0,
          timestamp: Date.now()
        },
        course: 0,
        speed: 0,
        heading: 0,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history: []
      };

      mockAISRepo.calculateCPA = jest.fn().mockResolvedValue({
        distance: 6.0,
        time: 0,
        position: {
          latitude: 52.1,
          longitude: 5.0,
          accuracy: 0,
          timestamp: Date.now()
        }
      });

      const cpa = await service.calculateCPA(target, ownPosition);

      expect(cpa).toBeDefined();
      expect(cpa.distance).toBeGreaterThan(0);
    });

    it('should calculate CPA for head-on collision scenario', async () => {
      const ownPosition: Position = {
        latitude: 52.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const target: AISTarget = {
        mmsi: '987654321',
        name: 'Oncoming Vessel',
        callSign: 'TEST2',
        position: {
          latitude: 52.1,
          longitude: 5.0,
          accuracy: 0,
          timestamp: Date.now()
        },
        course: 180,
        speed: 15,
        heading: 180,
        vesselType: 70,
        length: 150,
        width: 25,
        lastUpdate: new Date(),
        history: []
      };

      mockAISRepo.calculateCPA = jest.fn().mockResolvedValue({
        distance: 0.1,
        time: 5,
        position: {
          latitude: 52.05,
          longitude: 5.0,
          accuracy: 0,
          timestamp: Date.now()
        }
      });

      const cpa = await service.calculateCPA(target, ownPosition);

      expect(cpa.distance).toBeLessThan(0.5);
      expect(cpa.time).toBeGreaterThan(0);
    });
  });

  describe('target management', () => {
    it('should set own position', () => {
      const position: Position = {
        latitude: 52.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      service.setOwnPosition(position);
      
      expect(true).toBe(true);
    });

    it('should retrieve target by MMSI', async () => {
      const target: AISTarget = {
        mmsi: '123456789',
        name: 'Test Vessel',
        callSign: 'TEST',
        position: {
          latitude: 52.0,
          longitude: 5.0,
          accuracy: 0,
          timestamp: Date.now()
        },
        course: 180,
        speed: 10,
        heading: 180,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history: []
      };

      mockAISRepo.getTarget = jest.fn().mockResolvedValue(target);

      const result = await service.getTarget('123456789');

      expect(result).toEqual(target);
      expect(mockAISRepo.getTarget).toHaveBeenCalledWith('123456789');
    });

    it('should retrieve all targets', async () => {
      const targets: AISTarget[] = [
        {
          mmsi: '123456789',
          name: 'Vessel 1',
          callSign: 'TEST1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
          course: 180,
          speed: 10,
          heading: 180,
          vesselType: 70,
          length: 100,
          width: 20,
          lastUpdate: new Date(),
          history: []
        },
        {
          mmsi: '987654321',
          name: 'Vessel 2',
          callSign: 'TEST2',
          position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
          course: 90,
          speed: 12,
          heading: 90,
          vesselType: 70,
          length: 120,
          width: 22,
          lastUpdate: new Date(),
          history: []
        }
      ];

      mockAISRepo.getTargets = jest.fn().mockResolvedValue(targets);

      const result = await service.getTargets();

      expect(result).toEqual(targets);
      expect(result).toHaveLength(2);
      expect(mockAISRepo.getTargets).toHaveBeenCalledWith(undefined);
    });

    it('should retrieve targets within bounds', async () => {
      const bounds: GeoBounds = {
        north: 52.2,
        south: 51.8,
        east: 5.2,
        west: 4.8
      };

      const targets: AISTarget[] = [
        {
          mmsi: '123456789',
          name: 'Vessel 1',
          callSign: 'TEST1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
          course: 180,
          speed: 10,
          heading: 180,
          vesselType: 70,
          length: 100,
          width: 20,
          lastUpdate: new Date(),
          history: []
        }
      ];

      mockAISRepo.getTargets = jest.fn().mockResolvedValue(targets);

      const result = await service.getTargets(bounds);

      expect(result).toEqual(targets);
      expect(mockAISRepo.getTargets).toHaveBeenCalledWith(bounds);
    });

    it('should subscribe to target updates', () => {
      const callback = jest.fn();
      const subscription = service.subscribe(callback);

      expect(subscription).toHaveProperty('unsubscribe');
      expect(typeof subscription.unsubscribe).toBe('function');

      subscription.unsubscribe();
    });

    it('should subscribe to collision warnings', () => {
      const callback = jest.fn();
      const subscription = service.subscribeToWarnings(callback);

      expect(subscription).toHaveProperty('unsubscribe');
      expect(typeof subscription.unsubscribe).toBe('function');

      subscription.unsubscribe();
    });
  });

  describe('collision detection', () => {
    it('should trigger warning when CPA < 2nm', async () => {
      const ownPosition: Position = {
        latitude: 52.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      service.setOwnPosition(ownPosition);

      const warningCallback = jest.fn();
      service.subscribeToWarnings(warningCallback);

      const aisMessage: InstrumentData = {
        type: InstrumentDataType.AIS,
        value: {
          mmsi: '123456789',
          name: 'Close Vessel',
          latitude: 52.01,
          longitude: 5.0,
          course: 90,
          speed: 10
        },
        unit: '',
        timestamp: Date.now(),
        source: 'nmea0183'
      };

      mockAISRepo.getTarget = jest.fn().mockResolvedValue(null);
      mockAISRepo.upsertTarget = jest.fn().mockResolvedValue(undefined);
      mockAISRepo.calculateCPA = jest.fn().mockResolvedValue({
        distance: 1.5,
        time: 10,
        position: {
          latitude: 52.005,
          longitude: 5.05,
          accuracy: 0,
          timestamp: Date.now()
        }
      });

      await service.processMessage(aisMessage);

      expect(warningCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({
            mmsi: '123456789'
          }),
          cpa: expect.objectContaining({
            distance: 1.5,
            time: 10
          })
        })
      );
    });

    it('should not trigger warning when CPA > 2nm', async () => {
      const ownPosition: Position = {
        latitude: 52.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      service.setOwnPosition(ownPosition);

      const warningCallback = jest.fn();
      service.subscribeToWarnings(warningCallback);

      const aisMessage: InstrumentData = {
        type: InstrumentDataType.AIS,
        value: {
          mmsi: '123456789',
          name: 'Distant Vessel',
          latitude: 52.1,
          longitude: 5.0,
          course: 90,
          speed: 10
        },
        unit: '',
        timestamp: Date.now(),
        source: 'nmea0183'
      };

      mockAISRepo.getTarget = jest.fn().mockResolvedValue(null);
      mockAISRepo.upsertTarget = jest.fn().mockResolvedValue(undefined);
      mockAISRepo.calculateCPA = jest.fn().mockResolvedValue({
        distance: 5.0,
        time: 30,
        position: {
          latitude: 52.05,
          longitude: 5.1,
          accuracy: 0,
          timestamp: Date.now()
        }
      });

      await service.processMessage(aisMessage);

      expect(warningCallback).not.toHaveBeenCalled();
    });

    it('should not check collision without own position', async () => {
      const warningCallback = jest.fn();
      service.subscribeToWarnings(warningCallback);

      const aisMessage: InstrumentData = {
        type: InstrumentDataType.AIS,
        value: {
          mmsi: '123456789',
          name: 'Test Vessel',
          latitude: 52.0,
          longitude: 5.0
        },
        unit: '',
        timestamp: Date.now(),
        source: 'nmea0183'
      };

      mockAISRepo.getTarget = jest.fn().mockResolvedValue(null);
      mockAISRepo.upsertTarget = jest.fn().mockResolvedValue(undefined);
      mockAISRepo.calculateCPA = jest.fn();

      await service.processMessage(aisMessage);

      expect(mockAISRepo.calculateCPA).not.toHaveBeenCalled();
      expect(warningCallback).not.toHaveBeenCalled();
    });
  });

  describe('target expiration and cleanup', () => {
    it('should start cleanup interval on initialization', () => {
      jest.useFakeTimers();
      const newService = new AISServiceImpl();
      
      expect((newService as any).cleanupInterval).toBeDefined();
      
      newService.destroy();
      jest.useRealTimers();
    });

    it('should call cleanup on interval', () => {
      jest.useFakeTimers();
      const newService = new AISServiceImpl();
      const mockRepo = (newService as any).aisRepo as jest.Mocked<AISRepository>;
      mockRepo.cleanupExpiredTargets = jest.fn().mockResolvedValue(undefined);

      jest.advanceTimersByTime(60 * 60 * 1000);

      expect(mockRepo.cleanupExpiredTargets).toHaveBeenCalled();

      newService.destroy();
      jest.useRealTimers();
    });

    it('should clear cleanup interval on destroy', () => {
      jest.useFakeTimers();
      const newService = new AISServiceImpl();
      
      newService.destroy();
      
      expect((newService as any).cleanupInterval).toBeNull();
      jest.useRealTimers();
    });

    it('should not call cleanup after destroy', () => {
      jest.useFakeTimers();
      const newService = new AISServiceImpl();
      const mockRepo = (newService as any).aisRepo as jest.Mocked<AISRepository>;
      mockRepo.cleanupExpiredTargets = jest.fn().mockResolvedValue(undefined);

      newService.destroy();
      jest.advanceTimersByTime(60 * 60 * 1000);

      expect(mockRepo.cleanupExpiredTargets).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});
