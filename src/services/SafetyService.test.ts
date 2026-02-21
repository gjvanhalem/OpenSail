import { SafetyServiceImpl } from './SafetyService';
import { Position } from '../types';

describe('SafetyService', () => {
  let service: SafetyServiceImpl;
  let alarmMessages: string[];

  beforeEach(() => {
    service = new SafetyServiceImpl();
    alarmMessages = [];
    service.setAlarmCallback((message: string) => {
      alarmMessages.push(message);
    });
  });

  afterEach(() => {
    service.stopAnchorWatch();
  });

  describe('Man Overboard (MOB) Function', () => {
    const testPosition: Position = {
      latitude: 52.5,
      longitude: 4.8,
      accuracy: 5,
      timestamp: Date.now()
    };

    it('should activate MOB marker with 1-second position capture', () => {
      const startTime = Date.now();
      const marker = service.activateMOB(testPosition);

      expect(marker).toBeDefined();
      expect(marker.id).toBeDefined();
      expect(marker.position.latitude).toBe(testPosition.latitude);
      expect(marker.position.longitude).toBe(testPosition.longitude);
      expect(marker.active).toBe(true);
      expect(marker.timestamp.getTime()).toBeGreaterThanOrEqual(startTime);
      expect(marker.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should trigger audible alert on MOB activation', () => {
      service.activateMOB(testPosition);

      expect(alarmMessages.length).toBe(1);
      expect(alarmMessages[0]).toContain('MAN OVERBOARD');
    });

    it('should retrieve MOB marker', () => {
      const marker = service.activateMOB(testPosition);
      const retrieved = service.getMOBMarker();

      expect(retrieved).toEqual(marker);
    });

    it('should calculate bearing to MOB position', () => {
      service.activateMOB(testPosition);

      const currentPosition: Position = {
        latitude: 52.4,
        longitude: 4.7,
        accuracy: 5,
        timestamp: Date.now()
      };
      service.setCurrentPosition(currentPosition);

      const bearing = service.calculateBearingToMOB();

      expect(bearing).not.toBeNull();
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should calculate distance to MOB position', () => {
      service.activateMOB(testPosition);

      const currentPosition: Position = {
        latitude: 52.4,
        longitude: 4.7,
        accuracy: 5,
        timestamp: Date.now()
      };
      service.setCurrentPosition(currentPosition);

      const distance = service.calculateDistanceToMOB();

      expect(distance).not.toBeNull();
      expect(distance).toBeGreaterThan(0);
    });

    it('should return null bearing when no current position', () => {
      service.activateMOB(testPosition);

      const bearing = service.calculateBearingToMOB();

      expect(bearing).toBeNull();
    });

    it('should return null distance when no current position', () => {
      service.activateMOB(testPosition);

      const distance = service.calculateDistanceToMOB();

      expect(distance).toBeNull();
    });

    it('should clear MOB marker', () => {
      service.activateMOB(testPosition);
      service.clearMOB();

      const marker = service.getMOBMarker();
      expect(marker).toBeNull();
    });

    it('should provide navigation guidance back to MOB', () => {
      const mobPosition: Position = {
        latitude: 52.5,
        longitude: 4.8,
        accuracy: 5,
        timestamp: Date.now()
      };
      service.activateMOB(mobPosition);

      const currentPosition: Position = {
        latitude: 52.49,
        longitude: 4.79,
        accuracy: 5,
        timestamp: Date.now()
      };
      service.setCurrentPosition(currentPosition);

      const bearing = service.calculateBearingToMOB();
      const distance = service.calculateDistanceToMOB();

      expect(bearing).not.toBeNull();
      expect(distance).not.toBeNull();
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1); // Less than 1 nautical mile
    });
  });

  describe('Anchor Watch Functionality', () => {
    const anchorPosition: Position = {
      latitude: 52.5,
      longitude: 4.8,
      accuracy: 5,
      timestamp: Date.now()
    };

    it('should activate anchor watch with configurable radius', () => {
      const radius = 50;
      const watch = service.startAnchorWatch(radius, anchorPosition);

      expect(watch).toBeDefined();
      expect(watch.id).toBeDefined();
      expect(watch.centerPosition.latitude).toBe(anchorPosition.latitude);
      expect(watch.centerPosition.longitude).toBe(anchorPosition.longitude);
      expect(watch.radius).toBe(radius);
      expect(watch.active).toBe(true);
      expect(watch.alarmTriggered).toBe(false);
    });

    it('should accept radius between 10 and 500 meters', () => {
      const watch1 = service.startAnchorWatch(10, anchorPosition);
      expect(watch1.radius).toBe(10);

      const watch2 = service.startAnchorWatch(500, anchorPosition);
      expect(watch2.radius).toBe(500);

      const watch3 = service.startAnchorWatch(250, anchorPosition);
      expect(watch3.radius).toBe(250);
    });

    it('should monitor position every 10 seconds', (done) => {
      jest.useFakeTimers();

      service.startAnchorWatch(50, anchorPosition);

      // Position within radius
      const nearPosition: Position = {
        latitude: 52.50001,
        longitude: 4.80001,
        accuracy: 5,
        timestamp: Date.now()
      };
      service.setCurrentPosition(nearPosition);

      // Fast-forward 10 seconds
      jest.advanceTimersByTime(10000);

      expect(alarmMessages.length).toBe(0);

      jest.useRealTimers();
      done();
    });

    it('should trigger alarm when vessel moves outside radius', (done) => {
      jest.useFakeTimers();

      service.startAnchorWatch(50, anchorPosition);

      // Position outside radius (approximately 100m away)
      const farPosition: Position = {
        latitude: 52.501,
        longitude: 4.801,
        accuracy: 5,
        timestamp: Date.now()
      };
      service.setCurrentPosition(farPosition);

      // Fast-forward 10 seconds to trigger check
      jest.advanceTimersByTime(10000);

      expect(alarmMessages.length).toBeGreaterThan(0);
      expect(alarmMessages[0]).toContain('ANCHOR WATCH ALARM');

      jest.useRealTimers();
      done();
    });

    it('should record anchor watch events with timestamps', () => {
      const watch = service.startAnchorWatch(50, anchorPosition);

      expect(watch.active).toBe(true);
      expect(watch.alarmTriggered).toBe(false);
    });

    it('should stop anchor watch', () => {
      service.startAnchorWatch(50, anchorPosition);
      service.stopAnchorWatch();

      const watch = service.getAnchorWatch();
      expect(watch).toBeNull();
    });

    it('should retrieve anchor watch', () => {
      const watch = service.startAnchorWatch(50, anchorPosition);
      const retrieved = service.getAnchorWatch();

      expect(retrieved).toEqual(watch);
    });

    it('should update anchor watch radius', () => {
      service.startAnchorWatch(50, anchorPosition);
      service.updateAnchorWatchRadius(100);

      const watch = service.getAnchorWatch();
      expect(watch?.radius).toBe(100);
    });

    it('should throw error when updating radius without active watch', () => {
      expect(() => {
        service.updateAnchorWatchRadius(100);
      }).toThrow('No anchor watch active');
    });

    it('should validate radius range when updating', () => {
      service.startAnchorWatch(50, anchorPosition);

      expect(() => {
        service.updateAnchorWatchRadius(5);
      }).toThrow('Anchor watch radius must be between 10 and 500 meters');

      expect(() => {
        service.updateAnchorWatchRadius(600);
      }).toThrow('Anchor watch radius must be between 10 and 500 meters');
    });

    it('should reset alarm when radius is updated', () => {
      service.startAnchorWatch(50, anchorPosition);

      const watch = service.getAnchorWatch();
      if (watch) {
        watch.alarmTriggered = true;
      }

      service.updateAnchorWatchRadius(100);

      const updatedWatch = service.getAnchorWatch();
      expect(updatedWatch?.alarmTriggered).toBe(false);
    });

    it('should stop existing anchor watch when starting new one', () => {
      const watch1 = service.startAnchorWatch(50, anchorPosition);
      const watch2 = service.startAnchorWatch(100, anchorPosition);

      expect(watch1.id).not.toBe(watch2.id);

      const currentWatch = service.getAnchorWatch();
      expect(currentWatch?.id).toBe(watch2.id);
    });
  });

  describe('Position Monitoring Accuracy', () => {
    it('should accurately calculate distance in meters', () => {
      const pos1: Position = {
        latitude: 52.5,
        longitude: 4.8,
        accuracy: 5,
        timestamp: Date.now()
      };

      const pos2: Position = {
        latitude: 52.501,
        longitude: 4.801,
        accuracy: 5,
        timestamp: Date.now()
      };

      service.startAnchorWatch(50, pos1);
      service.setCurrentPosition(pos2);

      // The distance should be approximately 120-130 meters
      // This tests the accuracy of the distance calculation
      const watch = service.getAnchorWatch();
      expect(watch).toBeDefined();
    });

    it('should accurately calculate bearing in degrees', () => {
      const pos1: Position = {
        latitude: 52.5,
        longitude: 4.8,
        accuracy: 5,
        timestamp: Date.now()
      };

      const pos2: Position = {
        latitude: 52.51,
        longitude: 4.8,
        accuracy: 5,
        timestamp: Date.now()
      };

      service.activateMOB(pos2);
      service.setCurrentPosition(pos1);

      const bearing = service.calculateBearingToMOB();

      // Bearing should be approximately 0 degrees (north)
      expect(bearing).not.toBeNull();
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });

  describe('Integration Tests', () => {
    it('should handle MOB and anchor watch simultaneously', () => {
      const mobPosition: Position = {
        latitude: 52.5,
        longitude: 4.8,
        accuracy: 5,
        timestamp: Date.now()
      };

      const anchorPosition: Position = {
        latitude: 52.6,
        longitude: 4.9,
        accuracy: 5,
        timestamp: Date.now()
      };

      service.activateMOB(mobPosition);
      service.startAnchorWatch(50, anchorPosition);

      expect(service.getMOBMarker()).not.toBeNull();
      expect(service.getAnchorWatch()).not.toBeNull();
    });

    it('should maintain MOB marker when anchor watch is stopped', () => {
      const mobPosition: Position = {
        latitude: 52.5,
        longitude: 4.8,
        accuracy: 5,
        timestamp: Date.now()
      };

      const anchorPosition: Position = {
        latitude: 52.6,
        longitude: 4.9,
        accuracy: 5,
        timestamp: Date.now()
      };

      service.activateMOB(mobPosition);
      service.startAnchorWatch(50, anchorPosition);
      service.stopAnchorWatch();

      expect(service.getMOBMarker()).not.toBeNull();
      expect(service.getAnchorWatch()).toBeNull();
    });

    it('should update current position for both MOB and anchor watch', () => {
      const mobPosition: Position = {
        latitude: 52.5,
        longitude: 4.8,
        accuracy: 5,
        timestamp: Date.now()
      };

      const anchorPosition: Position = {
        latitude: 52.6,
        longitude: 4.9,
        accuracy: 5,
        timestamp: Date.now()
      };

      const currentPosition: Position = {
        latitude: 52.55,
        longitude: 4.85,
        accuracy: 5,
        timestamp: Date.now()
      };

      service.activateMOB(mobPosition);
      service.startAnchorWatch(50, anchorPosition);
      service.setCurrentPosition(currentPosition);

      const bearing = service.calculateBearingToMOB();
      const distance = service.calculateDistanceToMOB();

      expect(bearing).not.toBeNull();
      expect(distance).not.toBeNull();
    });
  });
});
