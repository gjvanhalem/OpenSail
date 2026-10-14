import { describe, it, expect } from 'vitest';
import { NMEA2000Parser } from '../NMEA2000Parser';
import { InstrumentDataType } from '../../models';

// Frames are a 4-byte big-endian 29-bit CAN identifier followed by the data bytes
const frame = (hex: string) =>
  new Uint8Array(hex.match(/[0-9a-f]{2}/gi)!.map(byte => parseInt(byte, 16)));

describe('NMEA2000Parser', () => {
  const parser = new NMEA2000Parser();

  describe('message parsing', () => {
    it('should parse basic message structure', () => {
      // PGN 59904 (ISO request, PDU1), priority 6, source 0x50, destination 0x23
      const message = parser.parse(frame('18EA2350 00EE00'));

      expect(message).not.toBeNull();
      expect(message?.pgn).toBe(59904);
      expect(message?.priority).toBe(6);
      expect(message?.source).toBe(0x50);
      expect(message?.destination).toBe(0x23);
      expect(Array.from(message!.data)).toEqual([0x00, 0xee, 0x00]);
    });

    it('should extract PGN correctly', () => {
      const pgn = parser.getPGN(frame('09F11250'));

      expect(pgn).toBe(127250);
    });

    it('should use the global address for PDU2 messages', () => {
      const message = parser.parse(frame('09F11250 0014B8FF7FFF7FFC'));

      expect(message?.destination).toBe(255);
      expect(message?.source).toBe(0x50);
      expect(message?.priority).toBe(2);
    });
  });

  describe('heading parsing (PGN 127250)', () => {
    it('should parse heading data', () => {
      // 270 degrees true, deviation and variation not available
      const message = parser.parse(frame('09F11250 0014B8FF7FFF7FFC'));

      expect(message).not.toBeNull();
      const instrumentData = parser.parseToInstrumentData(message!);

      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Heading);
      expect(instrumentData?.unit).toBe('deg');
      const value = instrumentData?.value as Record<string, unknown>;
      expect(value.heading).toBeCloseTo(270, 2);
      expect(value.deviation).toBe(0);
      expect(value.reference).toBe('true');
    });

    it('should return null when heading is not available', () => {
      const message = parser.parse(frame('09F11250 00FFFFFF7FFF7FFC'));

      expect(parser.parseToInstrumentData(message!)).toBeNull();
    });
  });

  describe('speed parsing (PGN 128259)', () => {
    it('should parse speed data', () => {
      // 5.00 m/s through water, ground speed not available
      const message = parser.parse(frame('09F50350 00F401FFFF00FFFF'));

      expect(message).not.toBeNull();
      const instrumentData = parser.parseToInstrumentData(message!);

      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Speed);
      expect(instrumentData?.unit).toBe('m/s');
      const value = instrumentData?.value as Record<string, unknown>;
      expect(value.speedWaterReferenced).toBeCloseTo(5, 2);
      expect(value.speedGroundReferenced).toBeNull();
    });
  });

  describe('depth parsing (PGN 128267)', () => {
    it('should parse depth data', () => {
      // 5 meters below transducer, 0.5 m transducer offset
      const message = parser.parse(frame('09F50B50 00F4010000F401FF'));

      expect(message).not.toBeNull();
      const instrumentData = parser.parseToInstrumentData(message!);

      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Depth);
      expect(instrumentData?.unit).toBe('m');
      const value = instrumentData?.value as Record<string, unknown>;
      expect(value.depth).toBeCloseTo(5.5, 3);
      expect(value.offset).toBeCloseTo(0.5, 3);
      expect(value.range).toBeNull();
    });
  });

  describe('position parsing (PGN 129025)', () => {
    it('should parse position data', () => {
      // 48.1173 N, 11.5167 W
      const message = parser.parse(frame('09F80150 081EAE1CE8B022F9'));

      expect(message).not.toBeNull();
      const instrumentData = parser.parseToInstrumentData(message!);

      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.GPS);
      const { position } = instrumentData?.value as {
        position: { latitude: number; longitude: number };
      };
      expect(position.latitude).toBeCloseTo(48.1173, 6);
      expect(position.longitude).toBeCloseTo(-11.5167, 6);
    });
  });

  describe('wind parsing (PGN 130306)', () => {
    it('should parse wind data', () => {
      // 6.17 m/s apparent wind at 45 degrees
      const message = parser.parse(frame('09FD0250 006902AE1EFAFFFF'));

      expect(message).not.toBeNull();
      const instrumentData = parser.parseToInstrumentData(message!);

      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Wind);
      const value = instrumentData?.value as Record<string, unknown>;
      expect(value.speed).toBeCloseTo(6.17, 2);
      expect(value.angle).toBeCloseTo(45, 2);
      expect(value.reference).toBe('apparent');
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
      const message = parser.parse(frame('09FFFF50'));

      expect(message).not.toBeNull();
      const instrumentData = parser.parseToInstrumentData(message!);

      expect(instrumentData).toBeNull();
    });

    it('should handle truncated payload for a supported PGN', () => {
      const message = parser.parse(frame('09F11250 0014'));

      expect(parser.parseToInstrumentData(message!)).toBeNull();
    });
  });
});
