import { describe, it, expect } from 'vitest';
import { formatCoordinate } from '../formatting';

describe('formatCoordinate', () => {
  it('formats degrees and decimal minutes with the hemisphere', () => {
    expect(formatCoordinate(52.1, true)).toBe("52°06.000' N");
    expect(formatCoordinate(-4.25, false)).toBe("004°15.000' W");
    expect(formatCoordinate(-33.5, true)).toBe("33°30.000' S");
    expect(formatCoordinate(151.2093, false)).toBe("151°12.558' E");
  });

  it('carries minutes that round up to 60 into the degrees', () => {
    expect(formatCoordinate(51.9999999, true)).toBe("52°00.000' N");
  });
});
