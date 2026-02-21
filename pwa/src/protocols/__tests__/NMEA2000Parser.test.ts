import { describe, it, expect } from 'vitest';
import { NMEA2000Parser } from '../NMEA2000Parser';
import { InstrumentDataType } from '../../models';

describe('NMEA2000Parser', () => {
  const parser = new NMEA2000Parser();

  describe('message parsing', () => {
    it('should parse basic message structure', () => {
      const data = new Uint8Array([0x08, 0x01, 0x50, 0xff, 0x01, 0x02, 0x03]);
      const message = parser.parse(data);
      
      expect(message).not.toBeNull();
      expect(message?.priority).toBe(2);
      expect(message?.source).toBe(0x50);
      expect(message?.destination).toBe(0xff);
    });

    it('should extract PGN correctly', () => {
      const data = new Uint8Array([0x08, 0x01, 0x50]);
      const pgn = parser.getPGN(data);
      
      expect(pgn).toBe(0x0001);
    });
  });

  describe('heading parsing (PGN 127250)', () => {
    it('should parse heading data', () => {
      // Simulated heading data: 270 degrees
      const data = new Uint8Array([0x08, 0xf2, 0x01, 0x50, 0xff, 0x88, 0x13, 0x00, 0x00]);
      const message = parser.parse(data);
      
      expect(message).not.toBeNull();
      const instrumentData = parser.parseToInstrumentData(message!);
      
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Heading);
    });
  });

  describe('speed parsing (PGN 128259)', () => {
    it('should parse speed data', () => {
      // Simulated speed data
      const data = new Uint8Array([0x08, 0x03, 0x02, 0x50, 0xff, 0x64, 0x00, 0x64, 0x00, 0x64, 0x00]);
      const message = parser.parse(data);
      
      expect(message).not.toBeNull();
      const instrumentData = parser.parseToInstrumentData(message!);
      
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Speed);
      expect(instrumentData?.unit).toBe('m/s');
    });
  });

  describe('depth parsing (PGN 128267)', () => {
    it('should parse depth data', () => {
      // Simulated depth data: 5 meters
      const data = new Uint8Array([0x08, 0x0b, 0x02, 0x50, 0xff, 0xf4, 0x01, 0x00, 0x00, 0x00, 0x00]);
      const message = parser.parse(data);
      
      expect(message).not.toBeNull();
      const instrumentData = parser.parseToInstrumentData(message!);
      
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Depth);
      expect(instrumentData?.unit).toBe('m');
    });
  });

  describe('position parsing (PGN 129025)', () => {
    it('should parse position data', () => {
      // Simulated position data
      const data = new Uint8Array([
        0x08, 0x01, 0xf8, 0x50, 0xff,
        0x00, 0x00, 0x40, 0x42, // latitude (IEEE float)
        0x00, 0x00, 0x20, 0x41  // longitude (IEEE float)
      ]);
      const message = parser.parse(data);
      
      expect(message).not.toBeNull();
      const instrumentData = parser.parseToInstrumentData(message!);
      
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.GPS);
    });
  });

  describe('wind parsing (PGN 130306)', () => {
    it('should parse wind data', () => {
      // Simulated wind data
      const data = new Uint8Array([0x08, 0x02, 0xfd, 0x01, 0x50, 0xff, 0x88, 0x13, 0x64, 0x00, 0x01]);
      const message = parser.parse(data);
      
      expect(message).not.toBeNull();
      const instrumentData = parser.parseToInstrumentData(message!);
      
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Wind);
    });
  });

  describe('edge cases', () => {
    it('should handle empty data', () => {
      const data = new Uint8Array([]);
      const message = parser.parse(data);
      
      expect(message).toBeNull();
    });

    it('should handle insufficient data', () => {
      const data = new Uint8Array([0x08]);
      const message = parser.parse(data);
      
      expect(message).toBeNull();
    });

    it('should handle unsupported PGN', () => {
      const data = new Uint8Array([0x08, 0xff, 0xff, 0x50, 0xff]);
      const message = parser.parse(data);
      
      expect(message).not.toBeNull();
      const instrumentData = parser.parseToInstrumentData(message!);
      
      expect(instrumentData).toBeNull();
    });
  });
});
