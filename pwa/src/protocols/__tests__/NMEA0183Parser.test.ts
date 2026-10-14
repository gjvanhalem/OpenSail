import { describe, it, expect } from 'vitest';
import { NMEA0183Parser } from '../NMEA0183Parser';
import { InstrumentDataType } from '../../models';

describe('NMEA0183Parser', () => {
  const parser = new NMEA0183Parser();

  describe('checksum validation', () => {
    it('should calculate correct checksum', () => {
      const checksum = parser.calculateChecksum('GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,');
      expect(checksum).toBe('47');
    });

    it('should validate sentence with correct checksum', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
      expect(parser.validate(sentence)).toBe(true);
    });

    it('should reject sentence with incorrect checksum', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*48';
      expect(parser.validate(sentence)).toBe(false);
    });
  });

  describe('GGA parsing', () => {
    it('should parse valid GGA sentence', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
      const message = parser.parse(sentence);
      
      expect(message).not.toBeNull();
      expect(message?.sentenceId).toBe('GPGGA');
      
      const data = parser.parseToInstrumentData(message!);
      expect(data).not.toBeNull();
      expect(data?.type).toBe(InstrumentDataType.GPS);
      expect(data?.value).toHaveProperty('latitude');
      expect(data?.value).toHaveProperty('longitude');
    });

    it('should parse latitude correctly', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
      const message = parser.parse(sentence);
      const data = parser.parseToInstrumentData(message!);
      
      expect((data?.value as any).latitude).toBeCloseTo(48.1173, 4);
    });

    it('should parse longitude correctly', () => {
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
      const message = parser.parse(sentence);
      const data = parser.parseToInstrumentData(message!);
      
      expect((data?.value as any).longitude).toBeCloseTo(11.5167, 4);
    });
  });

  describe('RMC parsing', () => {
    it('should parse valid RMC sentence', () => {
      const sentence = '$GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A';
      const message = parser.parse(sentence);
      
      expect(message).not.toBeNull();
      expect(message?.sentenceId).toBe('GPRMC');
      
      const data = parser.parseToInstrumentData(message!);
      expect(data).not.toBeNull();
      expect(data?.type).toBe(InstrumentDataType.GPS);
      expect(data?.value).toHaveProperty('position');
      expect(data?.value).toHaveProperty('speedKnots');
      expect(data?.value).toHaveProperty('course');
    });
  });

  describe('DBT parsing', () => {
    it('should parse depth in meters', () => {
      const sentence = '$SDDBT,10.5,f,3.2,M,1.7,F*35';
      const message = parser.parse(sentence);
      const data = parser.parseToInstrumentData(message!);
      
      expect(data).not.toBeNull();
      expect(data?.type).toBe(InstrumentDataType.Depth);
      expect(data?.value).toBeCloseTo(3.2, 1);
      expect(data?.unit).toBe('m');
    });
  });

  describe('MWV parsing', () => {
    it('should parse wind data', () => {
      const sentence = '$WIMWV,045,R,12.5,N,A*0A';
      const message = parser.parse(sentence);
      const data = parser.parseToInstrumentData(message!);
      
      expect(data).not.toBeNull();
      expect(data?.type).toBe(InstrumentDataType.Wind);
      expect(data?.value).toHaveProperty('angle');
      expect(data?.value).toHaveProperty('speed');
    });
  });

  describe('HDG parsing', () => {
    it('should parse heading data', () => {
      const sentence = '$HCHDG,270.5,2.5,E,1.5,W*53';
      const message = parser.parse(sentence);
      const data = parser.parseToInstrumentData(message!);
      
      expect(data).not.toBeNull();
      expect(data?.type).toBe(InstrumentDataType.Heading);
      expect(data?.value).toHaveProperty('heading');
      expect(data?.unit).toBe('deg');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const message = parser.parse('');
      expect(message).toBeNull();
    });

    it('should handle invalid sentence format', () => {
      const message = parser.parse('INVALID');
      expect(message).toBeNull();
    });

    it('should handle unsupported sentence type', () => {
      const sentence = '$GPXXX,123,456*00';
      const message = parser.parse(sentence);
      expect(message).toBeNull();
    });
  });
});
