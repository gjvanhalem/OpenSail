import { describe, it, expect } from 'vitest';
import { formatQuantity, formatValue, fromDisplay, toDisplay, unitLabel } from '../units';

describe('units', () => {
  it('shows speed in knots, km/h or mph', () => {
    expect(formatQuantity('speed', 10, 'nautical')).toBe('10.0 kn');
    expect(formatQuantity('speed', 10, 'metric')).toBe('18.5 km/h');
    expect(formatQuantity('speed', 10, 'imperial')).toBe('11.5 mph');
  });

  it('shows distance in nautical miles, km or statute miles', () => {
    expect(formatQuantity('distance', 1, 'nautical')).toBe('1.00 nm');
    expect(formatQuantity('distance', 1, 'metric')).toBe('1.85 km');
    expect(formatQuantity('distance', 1, 'imperial')).toBe('1.15 mi');
  });

  it('shows depth in metres, or feet in imperial', () => {
    expect(formatQuantity('depth', 3.5, 'nautical')).toBe('3.5 m');
    expect(formatQuantity('depth', 3.5, 'metric')).toBe('3.5 m');
    expect(formatQuantity('depth', 3.5, 'imperial')).toBe('11.5 ft');
  });

  it('converts typed values back to stored units', () => {
    for (const system of ['nautical', 'metric', 'imperial'] as const) {
      for (const quantity of ['speed', 'windSpeed', 'distance', 'depth', 'length'] as const) {
        expect(fromDisplay(quantity, toDisplay(quantity, 7.3, system), system)).toBeCloseTo(7.3, 10);
      }
    }
  });

  it('takes the number of decimals when given', () => {
    expect(formatValue('speed', 10, 'metric', 0)).toBe('19');
    expect(unitLabel('windSpeed', 'imperial')).toBe('mph');
  });
});
