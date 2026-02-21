import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateBearing,
  toRadians,
  toDegrees,
  interpolatePosition,
  calculateDestination,
  normalizeAngle,
  angleDifference,
  isWithinRadius,
  calculateSpeed,
} from '../calculations';
import type { Position } from '../../models';

describe('calculations', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two positions', () => {
      const pos1: Position = { latitude: 50.0, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      const pos2: Position = { latitude: 58.0, longitude: -3.0, accuracy: 0, timestamp: Date.now() };
      
      const distance = calculateDistance(pos1, pos2);
      
      // Approximate distance should be around 486 nm
      expect(distance).toBeGreaterThan(480);
      expect(distance).toBeLessThan(490);
    });

    it('should return 0 for same position', () => {
      const pos: Position = { latitude: 50.0, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      
      const distance = calculateDistance(pos, pos);
      
      expect(distance).toBeCloseTo(0, 5);
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing from one position to another', () => {
      const start: Position = { latitude: 50.0, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      const end: Position = { latitude: 58.0, longitude: -3.0, accuracy: 0, timestamp: Date.now() };
      
      const bearing = calculateBearing(start, end);
      
      // Bearing should be roughly north-northeast
      expect(bearing).toBeGreaterThan(0);
      expect(bearing).toBeLessThan(90);
    });

    it('should return bearing in 0-360 range', () => {
      const start: Position = { latitude: 50.0, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      const end: Position = { latitude: 48.0, longitude: -7.0, accuracy: 0, timestamp: Date.now() };
      
      const bearing = calculateBearing(start, end);
      
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });

  describe('angle conversions', () => {
    it('should convert degrees to radians', () => {
      expect(toRadians(0)).toBe(0);
      expect(toRadians(180)).toBeCloseTo(Math.PI, 10);
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 10);
    });

    it('should convert radians to degrees', () => {
      expect(toDegrees(0)).toBe(0);
      expect(toDegrees(Math.PI)).toBeCloseTo(180, 10);
      expect(toDegrees(Math.PI / 2)).toBeCloseTo(90, 10);
    });
  });

  describe('interpolatePosition', () => {
    it('should interpolate position at midpoint', () => {
      const start: Position = { latitude: 50.0, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      const end: Position = { latitude: 52.0, longitude: -3.0, accuracy: 0, timestamp: Date.now() };
      
      const mid = interpolatePosition(start, end, 0.5);
      
      expect(mid.latitude).toBeCloseTo(51.0, 5);
      expect(mid.longitude).toBeCloseTo(-4.0, 5);
    });

    it('should return start position at fraction 0', () => {
      const start: Position = { latitude: 50.0, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      const end: Position = { latitude: 52.0, longitude: -3.0, accuracy: 0, timestamp: Date.now() };
      
      const result = interpolatePosition(start, end, 0);
      
      expect(result.latitude).toBe(start.latitude);
      expect(result.longitude).toBe(start.longitude);
    });
  });

  describe('calculateDestination', () => {
    it('should calculate destination from start, bearing, and distance', () => {
      const start: Position = { latitude: 50.0, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      const bearing = 0; // Due north
      const distance = 60; // 60 nm
      
      const dest = calculateDestination(start, bearing, distance);
      
      // Should be approximately 1 degree north
      expect(dest.latitude).toBeGreaterThan(50.9);
      expect(dest.latitude).toBeLessThan(51.1);
      expect(dest.longitude).toBeCloseTo(-5.0, 1);
    });
  });

  describe('normalizeAngle', () => {
    it('should normalize angles to 0-360 range', () => {
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(360)).toBe(0);
      expect(normalizeAngle(370)).toBe(10);
      expect(normalizeAngle(-10)).toBe(350);
      expect(normalizeAngle(720)).toBe(0);
    });
  });

  describe('angleDifference', () => {
    it('should calculate shortest angle difference', () => {
      expect(angleDifference(10, 20)).toBe(10);
      expect(angleDifference(350, 10)).toBe(20);
      expect(angleDifference(10, 350)).toBe(-20);
      expect(angleDifference(180, 0)).toBe(-180);
    });
  });

  describe('isWithinRadius', () => {
    it('should return true if position is within radius', () => {
      const center: Position = { latitude: 50.0, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      const position: Position = { latitude: 50.1, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      
      const result = isWithinRadius(position, center, 10);
      
      expect(result).toBe(true);
    });

    it('should return false if position is outside radius', () => {
      const center: Position = { latitude: 50.0, longitude: -5.0, accuracy: 0, timestamp: Date.now() };
      const position: Position = { latitude: 52.0, longitude: -3.0, accuracy: 0, timestamp: Date.now() };
      
      const result = isWithinRadius(position, center, 10);
      
      expect(result).toBe(false);
    });
  });

  describe('calculateSpeed', () => {
    it('should calculate speed from two positions', () => {
      const now = Date.now();
      const pos1: Position = { latitude: 50.0, longitude: -5.0, accuracy: 0, timestamp: now };
      const pos2: Position = { latitude: 50.1, longitude: -5.0, accuracy: 0, timestamp: now + 3600000 }; // 1 hour later
      
      const speed = calculateSpeed(pos1, pos2);
      
      // Should be approximately 6 knots (6 nm in 1 hour)
      expect(speed).toBeGreaterThan(5);
      expect(speed).toBeLessThan(7);
    });

    it('should return 0 for same timestamp', () => {
      const now = Date.now();
      const pos1: Position = { latitude: 50.0, longitude: -5.0, accuracy: 0, timestamp: now };
      const pos2: Position = { latitude: 50.1, longitude: -5.0, accuracy: 0, timestamp: now };
      
      const speed = calculateSpeed(pos1, pos2);
      
      expect(speed).toBe(0);
    });
  });
});
