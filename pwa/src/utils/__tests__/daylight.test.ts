import { describe, it, expect } from 'vitest';
import { isNight, sunElevation } from '../daylight';

const ROTTERDAM = { latitude: 51.92, longitude: 4.48 };

describe('sunElevation', () => {
  it('is high at noon in summer and low at noon in winter', () => {
    // Local solar noon in Rotterdam is about 11:42 UTC
    const summer = sunElevation(new Date('2026-06-21T11:42:00Z'), ROTTERDAM.latitude, ROTTERDAM.longitude);
    const winter = sunElevation(new Date('2026-12-21T11:42:00Z'), ROTTERDAM.latitude, ROTTERDAM.longitude);
    // 90 - 51.92 ± 23.44
    expect(summer).toBeCloseTo(61.5, 0);
    expect(winter).toBeCloseTo(14.6, 0);
  });

  it('is below the horizon at midnight', () => {
    expect(sunElevation(new Date('2026-10-21T23:00:00Z'), ROTTERDAM.latitude, ROTTERDAM.longitude)).toBeLessThan(-30);
  });
});

describe('isNight', () => {
  it('follows the sun at the position', () => {
    // 21 October in Rotterdam: sunset about 16:30 UTC, civil dusk about 17:05 UTC
    expect(isNight(new Date('2026-10-21T12:00:00Z'), ROTTERDAM)).toBe(false);
    expect(isNight(new Date('2026-10-21T16:30:00Z'), ROTTERDAM)).toBe(false);
    expect(isNight(new Date('2026-10-21T18:00:00Z'), ROTTERDAM)).toBe(true);
    expect(isNight(new Date('2026-10-22T04:00:00Z'), ROTTERDAM)).toBe(true);
  });

  it('knows the midnight sun', () => {
    // Tromsø at midnight in June: the sun never sets
    expect(isNight(new Date('2026-06-21T22:00:00Z'), { latitude: 69.65, longitude: 18.96 })).toBe(false);
  });

  it('uses the clock without a position', () => {
    expect(isNight(new Date(2026, 9, 21, 22, 0), null)).toBe(true);
    expect(isNight(new Date(2026, 9, 21, 12, 0), null)).toBe(false);
  });
});
