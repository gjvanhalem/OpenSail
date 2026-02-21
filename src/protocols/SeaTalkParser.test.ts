import { SeaTalkParser } from './SeaTalkParser';
import { InstrumentDataType } from '../types';

describe('SeaTalkParser', () => {
  let parser: SeaTalkParser;

  beforeEach(() => {
    parser = new SeaTalkParser();
  });

  describe('getCommandByte', () => {
    it('should extract command byte from data', () => {
      const data = Buffer.from([0x00, 0x02, 0x60, 0x00]);
      const command = parser.getCommandByte(data);
      expect(command).toBe(0x00);
    });

    it('should return 0 for empty buffer', () => {
      const data = Buffer.from([]);
      const command = parser.getCommandByte(data);
      expect(command).toBe(0);
    });
  });

  describe('parse', () => {
    it('should parse depth command (0x00)', () => {
      // Depth command: 0x00, length, depth data
      const data = Buffer.from([0x00, 0x02, 0x60, 0x00]);
      const result = parser.parse(data);

      expect(result).not.toBeNull();
      expect(result?.command).toBe(0x00);
      expect(result?.interpretation).toHaveProperty('depth');
    });

    it('should parse apparent wind angle command (0x10)', () => {
      // Wind angle command: 0x10, data
      const data = Buffer.from([0x10, 0x01, 0x5A, 0x00]);
      const result = parser.parse(data);

      expect(result).not.toBeNull();
      expect(result?.command).toBe(0x10);
      expect(result?.interpretation).toHaveProperty('windAngle');
    });

    it('should parse apparent wind speed command (0x11)', () => {
      // Wind speed command: 0x11, data
      const data = Buffer.from([0x11, 0x01, 0x32, 0x00]);
      const result = parser.parse(data);

      expect(result).not.toBeNull();
      expect(result?.command).toBe(0x11);
      expect(result?.interpretation).toHaveProperty('windSpeed');
    });

    it('should parse speed through water command (0x20)', () => {
      // Speed command: 0x20, data
      const data = Buffer.from([0x20, 0x01, 0x32, 0x00, 0x00, 0x00]);
      const result = parser.parse(data);

      expect(result).not.toBeNull();
      expect(result?.command).toBe(0x20);
      expect(result?.interpretation).toHaveProperty('speed');
    });

    it('should parse heading command (0x84)', () => {
      // Heading command: 0x84, data
      const data = Buffer.from([0x84, 0x86, 0x26, 0x97, 0x02, 0x00, 0x00, 0x00, 0x00]);
      const result = parser.parse(data);

      expect(result).not.toBeNull();
      expect(result?.command).toBe(0x84);
      expect(result?.interpretation).toHaveProperty('heading');
    });

    it('should return null for buffer too short', () => {
      const data = Buffer.from([0x00]);
      const result = parser.parse(data);
      expect(result).toBeNull();
    });
  });

  describe('parseToInstrumentData', () => {
    it('should parse depth command to depth data', () => {
      const data = Buffer.from([0x00, 0x02, 0x60, 0x00]);
      const message = parser.parse(data);
      expect(message).not.toBeNull();

      const instrumentData = parser.parseToInstrumentData(message!);
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Depth);
      expect(instrumentData?.unit).toBe('m');
      expect(instrumentData?.source).toBe('seatalk');
    });

    it('should parse wind angle to wind data', () => {
      const data = Buffer.from([0x10, 0x01, 0x5A, 0x00]);
      const message = parser.parse(data);
      expect(message).not.toBeNull();

      const instrumentData = parser.parseToInstrumentData(message!);
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Wind);
      expect(instrumentData?.unit).toBe('deg');
      expect(instrumentData?.source).toBe('seatalk');
    });

    it('should parse wind speed to wind data', () => {
      const data = Buffer.from([0x11, 0x01, 0x32, 0x00]);
      const message = parser.parse(data);
      expect(message).not.toBeNull();

      const instrumentData = parser.parseToInstrumentData(message!);
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Wind);
      expect(instrumentData?.source).toBe('seatalk');
    });

    it('should parse speed to speed data', () => {
      const data = Buffer.from([0x20, 0x01, 0x32, 0x00, 0x00, 0x00]);
      const message = parser.parse(data);
      expect(message).not.toBeNull();

      const instrumentData = parser.parseToInstrumentData(message!);
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Speed);
      expect(instrumentData?.unit).toBe('nm');
      expect(instrumentData?.source).toBe('seatalk');
    });

    it('should parse heading to heading data', () => {
      const data = Buffer.from([0x84, 0x86, 0x26, 0x97, 0x02, 0x00, 0x00, 0x00, 0x00]);
      const message = parser.parse(data);
      expect(message).not.toBeNull();

      const instrumentData = parser.parseToInstrumentData(message!);
      expect(instrumentData).not.toBeNull();
      expect(instrumentData?.type).toBe(InstrumentDataType.Heading);
      expect(instrumentData?.unit).toBe('deg');
      expect(instrumentData?.source).toBe('seatalk');
    });

    it('should return null for unsupported command', () => {
      const data = Buffer.from([0xFF, 0x01, 0x00, 0x00]);
      const message = parser.parse(data);
      expect(message).not.toBeNull();

      const instrumentData = parser.parseToInstrumentData(message!);
      expect(instrumentData).toBeNull();
    });
  });

  describe('data interpretation', () => {
    it('should interpret depth values correctly', () => {
      // Test depth of 10 meters
      const data = Buffer.from([0x00, 0x02, 0x60, 0x00]);
      const message = parser.parse(data);

      expect(message?.interpretation).toHaveProperty('depth');
      expect(typeof message?.interpretation.depth).toBe('number');
    });

    it('should interpret wind angle correctly', () => {
      // Test wind angle
      const data = Buffer.from([0x10, 0x01, 0x5A, 0x00]);
      const message = parser.parse(data);

      expect(message?.interpretation).toHaveProperty('windAngle');
      expect(typeof message?.interpretation.windAngle).toBe('number');
    });

    it('should interpret heading correctly', () => {
      const data = Buffer.from([0x84, 0x86, 0x26, 0x97, 0x02, 0x00, 0x00, 0x00, 0x00]);
      const message = parser.parse(data);

      expect(message?.interpretation).toHaveProperty('heading');
      expect(message?.interpretation).toHaveProperty('deviation');
      expect(message?.interpretation).toHaveProperty('variation');
    });
  });
});
