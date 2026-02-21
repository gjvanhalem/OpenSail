import { NMEA0183Parser } from './NMEA0183Parser';
import { InstrumentDataType } from '../types';

describe('NMEA0183Parser', () => {
  let parser: NMEA0183Parser;

  beforeEach(() => {
    parser = new NMEA0183Parser();
  });

  describe('validate', () => {
    it('should validate a correct NMEA sentence with checksum', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
      expect(parser.validate(sentence)).toBe(true);
    });

    it('should reject sentence without $ prefix', () => {
      const sentence = 'GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
      expect(parser.validate(sentence)).toBe(false);
    });

    it('should reject sentence with invalid checksum', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*FF';
      expect(parser.validate(sentence)).toBe(false);
    });

    it('should reject unsupported sentence types', () => {
      const sentence = '$GPXYZ,123519*00';
      expect(parser.validate(sentence)).toBe(false);
    });
  });

  describe('calculateChecksum', () => {
    it('should calculate correct checksum', () => {
      const sentence = 'GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,';
      const checksum = parser.calculateChecksum(sentence);
      expect(checksum).toBe('47');
    });

    it('should handle sentence with $ prefix', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,';
      const checksum = parser.calculateChecksum(sentence);
      expect(checksum).toBe('47');
    });
  });

  describe('parse', () => {
    it('should parse GGA sentence', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
      const result = parser.parse(sentence);

      expect(result).not.toBeNull();
      expect(result?.sentenceId).toBe('GPGGA');
      expect(result?.fields.length).toBeGreaterThan(0);
      expect(result?.checksum).toBe('47');
    });

    it('should parse RMC sentence', () => {
      const sentence = '$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A';
      const result = parser.parse(sentence);

      expect(result).not.toBeNull();
      expect(result?.sentenceId).toBe('GPRMC');
    });

    it('should return null for invalid sentence', () => {
      const sentence = '$GPXYZ,123519*00';
      const result = parser.parse(sentence);
      expect(result).toBeNull();
    });
  });

  describe('parseToInstrumentData', () => {
    it('should parse GGA to GPS data', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
      const message = parser.parse(sentence);
      expect(message).not.toBeNull();

      const data = parser.parseToInstrumentData(message!);
      expect(data).not.toBeNull();
      expect(data?.type).toBe(InstrumentDataType.GPS);
      expect(data?.source).toBe('nmea0183');
    });

    it('should parse DBT to depth data', () => {
      const sentence = '$SDDBT,10.5,f,3.2,M,1.7,F*3A';
      const message = parser.parse(sentence);
      expect(message).not.toBeNull();

      const data = parser.parseToInstrumentData(message!);
      expect(data).not.toBeNull();
      expect(data?.type).toBe(InstrumentDataType.Depth);
      expect(data?.unit).toBe('m');
    });

    it('should parse MWV to wind data', () => {
      const sentence = '$WIMWV,045,R,12.5,N,A*2E';
      const message = parser.parse(sentence);
      expect(message).not.toBeNull();

      const data = parser.parseToInstrumentData(message!);
      expect(data).not.toBeNull();
      expect(data?.type).toBe(InstrumentDataType.Wind);
    });

    it('should parse HDG to heading data', () => {
      const sentence = '$HCHDG,270,0,E,5,W*7C';
      const message = parser.parse(sentence);
      expect(message).not.toBeNull();

      const data = parser.parseToInstrumentData(message!);
      expect(data).not.toBeNull();
      expect(data?.type).toBe(InstrumentDataType.Heading);
    });
  });

  describe('latitude/longitude parsing', () => {
    it('should parse north latitude correctly', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
      const message = parser.parse(sentence);
      const data = parser.parseToInstrumentData(message!);

      expect(data).not.toBeNull();
      const position = (data?.value as any).latitude;
      expect(position).toBeCloseTo(48.1173, 3);
    });

    it('should parse south latitude correctly', () => {
      const sentence = '$GPGGA,123519,4807.038,S,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*5A';
      const message = parser.parse(sentence);
      const data = parser.parseToInstrumentData(message!);

      expect(data).not.toBeNull();
      const position = (data?.value as any).latitude;
      expect(position).toBeCloseTo(-48.1173, 3);
    });

    it('should parse east longitude correctly', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
      const message = parser.parse(sentence);
      const data = parser.parseToInstrumentData(message!);

      expect(data).not.toBeNull();
      const position = (data?.value as any).longitude;
      expect(position).toBeCloseTo(11.5167, 3);
    });

    it('should parse west longitude correctly', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,W,1,08,0.9,545.4,M,46.9,M,,*55';
      const message = parser.parse(sentence);
      const data = parser.parseToInstrumentData(message!);

      expect(data).not.toBeNull();
      const position = (data?.value as any).longitude;
      expect(position).toBeCloseTo(-11.5167, 3);
    });
  });
});
