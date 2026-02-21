import { describe, it, expect } from 'vitest';
import { SeaTalkParser } from '../SeaTalkParser';
import { InstrumentDataType } from '../../models';

describe('SeaTalkParser', () => {
  const parser = new SeaTalkParser();

  describe('depth parsing (0x00)', () => {
    it('should parse depth data', () => {
      // Depth: 5.2m, offset: 0m
      const data = new Uint8Array([0x00, 0x02, 0x34, 0x0a]);
      const message = parser.parse(data);
      
      expect(message).not.toBeNull();
      expect(message?.command).toBe(0x00);
      
      const instrumentData = parser.parseToInstrumentData(message!);
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Depth);
      expect(instrumentData?.unit).toBe('m');
    });
  });

  describe('wind angle parsing (0x10)', () => {
    it('should parse apparent wind angle', () => {
      // Wind angle: 45 degrees
      const data = new Uint8Array([0x10, 0x2d, 0x00]);
      const message = parser.parse(data);
      
      expect(message).not.toBeNull();
      expect(message?.command).toBe(0x10);
      
      const instrumentData = parser.parseToInstrumentData(message!);
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Wind);
      expect(instrumentData?.unit).toBe('deg');
    });
  });

  describe('wind speed parsing (0x11)', () => {
    it('should parse apparent wind speed', () => {
      // Wind speed: 12 knots
      const data = new Uint8Array([0x11, 0x0f, 0x00]);
      const message = parser.parse(data);
      
      expect(message).not.toBeNull();
      expect(message?.command).toBe(0x11);
      
      const instrumentData = parser.parseToInstrumentData(message!);
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Wind);
    });
  });

  describe('speed through water parsing (0x20)', () => {
    it('should parse speed and trip data', () => {
      // Speed: 5.5 knots, trip: 10.5 nm
      const data = new Uint8Array([0x20, 0x23, 0x50, 0x00, 0x69]);
      const message = parser.parse(data);
      
      expect(message).not.toBeNull();
      expect(message?.command).toBe(0x20);
      
      const instrumentData = parser.parseToInstrumentData(message!);
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Speed);
      expect(instrumentData?.unit).toBe('nm');
    });
  });

  describe('heading parsing (0x84)', () => {
    it('should parse heading with deviation and variation', () => {
      // Heading: 270 degrees
      const data = new Uint8Array([0x84, 0x06, 0x1c, 0xb4, 0xb4]);
      const message = parser.parse(data);
      
      expect(message).not.toBeNull();
      expect(message?.command).toBe(0x84);
      
      const instrumentData = parser.parseToInstrumentData(message!);
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Heading);
      expect(instrumentData?.unit).toBe('deg');
    });
  });

  describe('command byte extraction', () => {
    it('should extract command byte correctly', () => {
      const data = new Uint8Array([0x84, 0x06, 0x1c]);
      const command = parser.getCommandByte(data);
      
      expect(command).toBe(0x84);
    });

    it('should return 0 for empty data', () => {
      const data = new Uint8Array([]);
      const command = parser.getCommandByte(data);
      
      expect(command).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty data', () => {
      const data = new Uint8Array([]);
      const message = parser.parse(data);
      
      expect(message).toBeNull();
    });

    it('should handle insufficient data', () => {
      const data = new Uint8Array([0x00]);
      const message = parser.parse(data);
      
      expect(message).toBeNull();
    });

    it('should handle unsupported command', () => {
      const data = new Uint8Array([0xff, 0x01, 0x02]);
      const message = parser.parse(data);
      
      expect(message).not.toBeNull();
      const instrumentData = parser.parseToInstrumentData(message!);
      
      expect(instrumentData).toBeNull();
    });
  });
});
