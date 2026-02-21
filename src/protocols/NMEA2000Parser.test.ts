import { NMEA2000Parser } from './NMEA2000Parser';
import { InstrumentDataType } from '../types';

describe('NMEA2000Parser', () => {
  let parser: NMEA2000Parser;

  beforeEach(() => {
    parser = new NMEA2000Parser();
  });

  describe('parse', () => {
    it('should parse a valid NMEA2000 message', () => {
      // Create a simple test message: priority=2, PGN=127250 (Heading), source=1
      const buffer = Buffer.from([0x08, 0xF2, 0x01, 0xFF, 0x00, 0x00, 0x00, 0x00]);
      const result = parser.parse(buffer);

      expect(result).not.toBeNull();
      expect(result?.priority).toBeDefined();
      expect(result?.pgn).toBeDefined();
      expect(result?.source).toBe(1);
      expect(result?.data).toBeInstanceOf(Buffer);
    });

    it('should return null for invalid message (too short)', () => {
      const buffer = Buffer.from([0x08]);
      const result = parser.parse(buffer);
      expect(result).toBeNull();
    });
  });

  describe('getPGN', () => {
    it('should extract PGN from message', () => {
      const buffer = Buffer.from([0x08, 0xF2, 0x01]);
      const pgn = parser.getPGN(buffer);
      expect(pgn).toBeDefined();
      expect(typeof pgn).toBe('number');
    });

    it('should return 0 for invalid message', () => {
      const buffer = Buffer.from([0x08]);
      const pgn = parser.getPGN(buffer);
      expect(pgn).toBe(0);
    });
  });

  describe('parseToInstrumentData', () => {
    it('should parse heading message (PGN 127250)', () => {
      // Create heading message with heading = 270 degrees (0x2710 = 10000 in 0.0001 rad units)
      const data = Buffer.from([0x10, 0x27, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      const message = {
        pgn: 127250,
        priority: 2,
        source: 1,
        destination: 255,
        data,
        timestamp: Date.now()
      };

      const result = parser.parseToInstrumentData(message);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(InstrumentDataType.Heading);
      expect(result?.source).toBe('nmea2000');
    });

    it('should parse speed message (PGN 128259)', () => {
      const data = Buffer.from([0x64, 0x00, 0x64, 0x00, 0x64, 0x00, 0x00, 0x00]);
      const message = {
        pgn: 128259,
        priority: 2,
        source: 1,
        destination: 255,
        data,
        timestamp: Date.now()
      };

      const result = parser.parseToInstrumentData(message);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(InstrumentDataType.Speed);
      expect(result?.unit).toBe('m/s');
    });

    it('should parse depth message (PGN 128267)', () => {
      const data = Buffer.from([0xE8, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      const message = {
        pgn: 128267,
        priority: 2,
        source: 1,
        destination: 255,
        data,
        timestamp: Date.now()
      };

      const result = parser.parseToInstrumentData(message);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(InstrumentDataType.Depth);
      expect(result?.unit).toBe('m');
    });

    it('should parse wind message (PGN 130306)', () => {
      const data = Buffer.from([0x10, 0x27, 0x64, 0x00, 0x01, 0x00, 0x00, 0x00]);
      const message = {
        pgn: 130306,
        priority: 2,
        source: 1,
        destination: 255,
        data,
        timestamp: Date.now()
      };

      const result = parser.parseToInstrumentData(message);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(InstrumentDataType.Wind);
      expect(result?.unit).toBe('deg, m/s');
    });

    it('should parse GPS position message (PGN 129025)', () => {
      // Create position message with lat/lon as IEEE floats
      const data = Buffer.alloc(8);
      // Simplified test - just check it parses
      const message = {
        pgn: 129025,
        priority: 2,
        source: 1,
        destination: 255,
        data,
        timestamp: Date.now()
      };

      const result = parser.parseToInstrumentData(message);
      expect(result).not.toBeNull();
      expect(result?.type).toBe(InstrumentDataType.GPS);
    });

    it('should return null for unsupported PGN', () => {
      const data = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const message = {
        pgn: 999999,
        priority: 2,
        source: 1,
        destination: 255,
        data,
        timestamp: Date.now()
      };

      const result = parser.parseToInstrumentData(message);
      expect(result).toBeNull();
    });
  });

  describe('extractFields', () => {
    it('should extract fields from supported PGN', () => {
      const data = Buffer.from([0x10, 0x27, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      const message = {
        pgn: 127250,
        priority: 2,
        source: 1,
        destination: 255,
        data,
        timestamp: Date.now()
      };

      const fields = parser.extractFields(message);
      expect(fields).toBeDefined();
      expect(typeof fields).toBe('object');
    });

    it('should return raw data for unsupported PGN', () => {
      const data = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const message = {
        pgn: 999999,
        priority: 2,
        source: 1,
        destination: 255,
        data,
        timestamp: Date.now()
      };

      const fields = parser.extractFields(message);
      expect(fields).toHaveProperty('raw');
    });
  });
});
