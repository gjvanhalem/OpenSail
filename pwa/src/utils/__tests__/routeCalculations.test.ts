import { describe, it, expect } from 'vitest';
import {
  calculateRouteInfo,
  calculateTotalDistance,
  calculateRouteBearings,
  estimateRouteTime,
  findClosestWaypoint,
  calculateRemainingDistance,
  validateRoute,
  formatDistance,
  formatDuration,
  formatBearing,
} from '../routeCalculations';
import type { Waypoint, Position } from '../../models';

describe('routeCalculations', () => {
  const createWaypoint = (lat: number, lon: number, name: string): Waypoint => ({
    id: `wp-${name}`,
    name,
    position: { latitude: lat, longitude: lon, accuracy: 0, timestamp: Date.now() },
    arrivalRadius: 0.1,
  });

  describe('calculateRouteInfo', () => {
    it('should calculate complete route information', () => {
      const waypoints = [
        createWaypoint(50.0, -5.0, 'Start'),
        createWaypoint(51.0, -5.0, 'Mid'),
        createWaypoint(52.0, -5.0, 'End'),
      ];

      const result = calculateRouteInfo(waypoints, 5);

      expect(result.legs).toHaveLength(2);
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.waypoints).toEqual(waypoints);
    });

    it('should return empty result for single waypoint', () => {
      const waypoints = [createWaypoint(50.0, -5.0, 'Single')];

      const result = calculateRouteInfo(waypoints);

      expect(result.legs).toHaveLength(0);
      expect(result.totalDistance).toBe(0);
      expect(result.totalTime).toBe(0);
    });
  });

  describe('calculateTotalDistance', () => {
    it('should calculate total distance for route', () => {
      const waypoints = [
        createWaypoint(50.0, -5.0, 'A'),
        createWaypoint(51.0, -5.0, 'B'),
        createWaypoint(52.0, -5.0, 'C'),
      ];

      const distance = calculateTotalDistance(waypoints);

      expect(distance).toBeGreaterThan(0);
      // Approximately 120 nm (2 degrees latitude)
      expect(distance).toBeGreaterThan(110);
      expect(distance).toBeLessThan(130);
    });

    it('should return 0 for less than 2 waypoints', () => {
      expect(calculateTotalDistance([])).toBe(0);
      expect(calculateTotalDistance([createWaypoint(50.0, -5.0, 'A')])).toBe(0);
    });
  });

  describe('calculateRouteBearings', () => {
    it('should calculate bearings between waypoints', () => {
      const waypoints = [
        createWaypoint(50.0, -5.0, 'A'),
        createWaypoint(51.0, -5.0, 'B'),
        createWaypoint(51.0, -4.0, 'C'),
      ];

      const bearings = calculateRouteBearings(waypoints);

      expect(bearings).toHaveLength(2);
      expect(bearings[0]).toBeCloseTo(0, 0); // North
      expect(bearings[1]).toBeCloseTo(90, 0); // East
    });

    it('should return empty array for less than 2 waypoints', () => {
      expect(calculateRouteBearings([])).toEqual([]);
      expect(calculateRouteBearings([createWaypoint(50.0, -5.0, 'A')])).toEqual([]);
    });
  });

  describe('estimateRouteTime', () => {
    it('should estimate travel time', () => {
      const waypoints = [
        createWaypoint(50.0, -5.0, 'A'),
        createWaypoint(51.0, -5.0, 'B'),
      ];

      const time = estimateRouteTime(waypoints, 5);

      // Approximately 60 nm at 5 knots = 12 hours
      expect(time).toBeGreaterThan(10);
      expect(time).toBeLessThan(14);
    });
  });

  describe('findClosestWaypoint', () => {
    it('should find closest waypoint to position', () => {
      // 50.5 would be equidistant from A and B; 50.6 is unambiguously closer to B
      const position: Position = { latitude: 50.6, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      const waypoints = [
        createWaypoint(50.0, -5.0, 'A'),
        createWaypoint(51.0, -5.0, 'B'),
        createWaypoint(52.0, -5.0, 'C'),
      ];

      const result = findClosestWaypoint(position, waypoints);

      expect(result).not.toBeNull();
      expect(result?.index).toBe(1); // Closest to 'B'
    });

    it('should return null for empty waypoints', () => {
      const position: Position = { latitude: 50.0, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      
      const result = findClosestWaypoint(position, []);

      expect(result).toBeNull();
    });
  });

  describe('calculateRemainingDistance', () => {
    it('should calculate remaining distance from current position', () => {
      const position: Position = { latitude: 50.5, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      const waypoints = [
        createWaypoint(50.0, -5.0, 'A'),
        createWaypoint(51.0, -5.0, 'B'),
        createWaypoint(52.0, -5.0, 'C'),
      ];

      const remaining = calculateRemainingDistance(position, waypoints, 1);

      // Should be distance to B plus B to C
      expect(remaining).toBeGreaterThan(60);
      expect(remaining).toBeLessThan(100);
    });

    it('should return 0 if past last waypoint', () => {
      const position: Position = { latitude: 50.0, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      const waypoints = [createWaypoint(50.0, -5.0, 'A')];

      const remaining = calculateRemainingDistance(position, waypoints, 1);

      expect(remaining).toBe(0);
    });
  });

  describe('validateRoute', () => {
    it('should validate a good route', () => {
      const waypoints = [
        createWaypoint(50.0, -5.0, 'A'),
        createWaypoint(51.0, -5.0, 'B'),
      ];

      const result = validateRoute(waypoints);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject route with less than 2 waypoints', () => {
      const waypoints = [createWaypoint(50.0, -5.0, 'A')];

      const result = validateRoute(waypoints);

      expect(result.isValid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn about very long legs', () => {
      const waypoints = [
        createWaypoint(50.0, -5.0, 'A'),
        createWaypoint(60.0, -5.0, 'B'), // ~600 nm
      ];

      const result = validateRoute(waypoints);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('very long'))).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      const waypoints = [
        createWaypoint(50.0, -5.0, 'A'),
        createWaypoint(100.0, -5.0, 'B'), // Invalid latitude
      ];

      const result = validateRoute(waypoints);

      expect(result.isValid).toBe(false);
      expect(result.warnings.some(w => w.includes('invalid coordinates'))).toBe(true);
    });
  });

  describe('formatting functions', () => {
    it('should format distance correctly', () => {
      expect(formatDistance(0.5)).toContain('m');
      expect(formatDistance(10.5)).toContain('nm');
      expect(formatDistance(100)).toContain('nm');
    });

    it('should format duration correctly', () => {
      expect(formatDuration(0.5)).toBe('30m');
      expect(formatDuration(1.5)).toBe('1h 30m');
      expect(formatDuration(12)).toBe('12h 0m');
    });

    it('should format bearing correctly', () => {
      const bearing = formatBearing(0);
      expect(bearing).toContain('0°');
      expect(bearing).toContain('N');

      const bearing90 = formatBearing(90);
      expect(bearing90).toContain('90°');
      expect(bearing90).toContain('E');
    });
  });
});
