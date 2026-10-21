import { describe, it, expect } from 'vitest';
import { trueWind, windSide } from '../wind';

describe('trueWind', () => {
  it('equals the apparent wind when the boat is stopped', () => {
    const tw = trueWind(12, 70, 0, 100);
    expect(tw.speed).toBeCloseTo(12);
    expect(tw.angle).toBeCloseTo(70);
    expect(tw.direction).toBeCloseTo(170);
  });

  it('takes the boat speed off a headwind', () => {
    const tw = trueWind(15, 0, 6, 0);
    expect(tw.speed).toBeCloseTo(9);
    expect(tw.angle).toBeCloseTo(0);
  });

  it('adds the boat speed to a following wind', () => {
    // Running at 6 kn in 10 kn of true wind leaves 4 kn apparent from astern
    const tw = trueWind(4, 180, 6, 90);
    expect(tw.speed).toBeCloseTo(10);
    expect(tw.angle).toBeCloseTo(180);
    expect(tw.direction).toBeCloseTo(270);
  });

  it('moves the true wind aft of the apparent wind when sailing upwind', () => {
    // 14 kn apparent at 46° to starboard, 6 kn boat speed
    const tw = trueWind(14, 46, 6, 341);
    expect(tw.speed).toBeCloseTo(10.73, 1);
    expect(tw.angle).toBeCloseTo(69.7, 0);
    expect(tw.direction).toBeCloseTo(50.7, 0);
  });

  it('mirrors on the port side', () => {
    const tw = trueWind(14, 360 - 46, 6, null);
    expect(tw.angle).toBeCloseTo(360 - 69.7, 0);
    expect(tw.direction).toBeNull();
  });

  it('turns a beam wind into a wind from aft of the beam', () => {
    // 10 kn true from the beam at 5 kn: apparent comes from further forward
    const awa = (Math.atan2(10, 5) * 180) / Math.PI;
    const tw = trueWind(Math.hypot(10, 5), awa, 5, 0);
    expect(tw.speed).toBeCloseTo(10);
    expect(tw.angle).toBeCloseTo(90);
  });
});

describe('windSide', () => {
  it('splits an angle into degrees off the bow and a side', () => {
    expect(windSide(120)).toEqual({ degrees: 120, side: 'Stbd' });
    expect(windSide(300)).toEqual({ degrees: 60, side: 'Port' });
    expect(windSide(180)).toEqual({ degrees: 180, side: 'Stbd' });
    expect(windSide(0)).toEqual({ degrees: 0, side: 'Stbd' });
  });
});
