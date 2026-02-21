import {
  convertSpeed,
  getSpeedUnit,
  convertDistance,
  getDistanceUnit,
  convertDepth,
  getDepthUnit,
  convertTemperature,
  getTemperatureUnit,
  formatLatitude,
  formatLongitude,
  formatBearing,
  decimalToDegreesMinutes,
  degreesMinutesToDecimal,
} from './unitConversion';

describe('Unit Conversion Utilities', () => {
  describe('Speed Conversion', () => {
    it('should convert knots to km/h', () => {
      expect(convertSpeed(10, 'metric')).toBeCloseTo(18.52, 1);
    });

    it('should convert knots to mph', () => {
      expect(convertSpeed(10, 'imperial')).toBeCloseTo(11.51, 1);
    });

    it('should keep knots for nautical units', () => {
      expect(convertSpeed(10, 'nautical')).toBe(10);
    });

    it('should return correct speed units', () => {
      expect(getSpeedUnit('metric')).toBe('km/h');
      expect(getSpeedUnit('imperial')).toBe('mph');
      expect(getSpeedUnit('nautical')).toBe('kts');
    });
  });

  describe('Distance Conversion', () => {
    it('should convert nautical miles to kilometers', () => {
      expect(convertDistance(10, 'metric')).toBeCloseTo(18.52, 1);
    });

    it('should convert nautical miles to statute miles', () => {
      expect(convertDistance(10, 'imperial')).toBeCloseTo(11.51, 1);
    });

    it('should keep nautical miles for nautical units', () => {
      expect(convertDistance(10, 'nautical')).toBe(10);
    });

    it('should return correct distance units', () => {
      expect(getDistanceUnit('metric')).toBe('km');
      expect(getDistanceUnit('imperial')).toBe('mi');
      expect(getDistanceUnit('nautical')).toBe('nm');
    });
  });

  describe('Depth Conversion', () => {
    it('should keep meters for metric units', () => {
      expect(convertDepth(10, 'metric')).toBe(10);
    });

    it('should convert meters to feet', () => {
      expect(convertDepth(10, 'imperial')).toBeCloseTo(32.81, 1);
    });

    it('should convert meters to fathoms', () => {
      expect(convertDepth(10, 'nautical')).toBeCloseTo(5.47, 1);
    });

    it('should return correct depth units', () => {
      expect(getDepthUnit('metric')).toBe('m');
      expect(getDepthUnit('imperial')).toBe('ft');
      expect(getDepthUnit('nautical')).toBe('fth');
    });

    it('should handle depth with 0.1m precision', () => {
      const depth = 5.3;
      const converted = convertDepth(depth, 'metric');
      expect(converted.toFixed(1)).toBe('5.3');
    });
  });

  describe('Temperature Conversion', () => {
    it('should keep Celsius for metric units', () => {
      expect(convertTemperature(20, 'metric')).toBe(20);
    });

    it('should keep Celsius for nautical units', () => {
      expect(convertTemperature(20, 'nautical')).toBe(20);
    });

    it('should convert Celsius to Fahrenheit', () => {
      expect(convertTemperature(20, 'imperial')).toBeCloseTo(68, 0);
      expect(convertTemperature(0, 'imperial')).toBeCloseTo(32, 0);
      expect(convertTemperature(100, 'imperial')).toBeCloseTo(212, 0);
    });

    it('should return correct temperature units', () => {
      expect(getTemperatureUnit('metric')).toBe('°C');
      expect(getTemperatureUnit('nautical')).toBe('°C');
      expect(getTemperatureUnit('imperial')).toBe('°F');
    });
  });

  describe('Coordinate Formatting', () => {
    it('should format latitude with N/S direction', () => {
      expect(formatLatitude(52.3676)).toBe('52.3676° N');
      expect(formatLatitude(-33.8688)).toBe('33.8688° S');
    });

    it('should format longitude with E/W direction', () => {
      expect(formatLongitude(4.9041)).toBe('4.9041° E');
      expect(formatLongitude(-118.2437)).toBe('118.2437° W');
    });

    it('should format bearing with degree symbol', () => {
      expect(formatBearing(135)).toBe('135°');
      expect(formatBearing(270.5)).toBe('271°');
    });

    it('should handle zero coordinates', () => {
      expect(formatLatitude(0)).toBe('0.0000° N');
      expect(formatLongitude(0)).toBe('0.0000° E');
    });
  });

  describe('Coordinate Conversion', () => {
    it('should convert decimal degrees to degrees and minutes', () => {
      const result = decimalToDegreesMinutes(52.3676);
      expect(result.degrees).toBe(52);
      expect(result.minutes).toBeCloseTo(22.056, 2);
    });

    it('should convert degrees and minutes to decimal', () => {
      const result = degreesMinutesToDecimal(52, 22.056, false);
      expect(result).toBeCloseTo(52.3676, 3);
    });

    it('should handle negative coordinates', () => {
      const result = degreesMinutesToDecimal(33, 52.128, true);
      expect(result).toBeCloseTo(-33.8688, 3);
    });

    it('should handle zero values', () => {
      const result = decimalToDegreesMinutes(0);
      expect(result.degrees).toBe(0);
      expect(result.minutes).toBe(0);
    });
  });

  describe('Precision Requirements', () => {
    it('should maintain 0.1m precision for depth', () => {
      const depth = 5.34;
      const converted = convertDepth(depth, 'metric');
      expect(parseFloat(converted.toFixed(1))).toBe(5.3);
    });

    it('should maintain precision for speed conversions', () => {
      const speed = 12.5;
      const metricSpeed = convertSpeed(speed, 'metric');
      expect(parseFloat(metricSpeed.toFixed(1))).toBeCloseTo(23.2, 1);
    });

    it('should maintain precision for temperature', () => {
      const temp = 20.5;
      const fahrenheit = convertTemperature(temp, 'imperial');
      expect(parseFloat(fahrenheit.toFixed(1))).toBeCloseTo(68.9, 1);
    });
  });
});
