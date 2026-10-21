import { describe, it, expect } from 'vitest';
import { arcPath, polar, speedAngle, SPEED_GAUGE_RANGES } from '../dial';
import { depthState, depthTrend, recentSamples } from '../depthTrend';

describe('dial geometry', () => {
  it('puts 0° at the top and goes clockwise', () => {
    expect(polar(0, 80)).toEqual([100, 20]);
    expect(polar(90, 80)).toEqual([180, 100]);
    expect(polar(180, 80)).toEqual([100, 180]);
    expect(polar(-90, 80)).toEqual([20, 100]);
  });

  it('uses the large arc only beyond 180°', () => {
    expect(arcPath(-135, 135, 80)).toContain(' 0 1 1 ');
    expect(arcPath(-135, 0, 80)).toContain(' 0 0 1 ');
  });

  it('maps speed onto the 270° dial and clamps it', () => {
    expect(speedAngle(0, 12)).toBe(-135);
    expect(speedAngle(6, 12)).toBe(0);
    expect(speedAngle(12, 12)).toBe(135);
    expect(speedAngle(30, 12)).toBe(135);
    expect(speedAngle(-1, 12)).toBe(-135);
  });

  it('has ranges whose labelled ticks fit the range exactly', () => {
    for (const [max, { major, minor }] of Object.entries(SPEED_GAUGE_RANGES)) {
      expect(Number(max) % major).toBe(0);
      expect(major % minor).toBe(0);
    }
  });
});

describe('depth trend', () => {
  const at = (s: number, depth: number) => ({ t: s * 1000, depth });

  it('needs at least 20 seconds of history', () => {
    expect(depthTrend([])).toBeNull();
    expect(depthTrend([at(0, 10), at(10, 9)])).toBeNull();
  });

  it('reports shoaling in metres per minute', () => {
    const trend = depthTrend([at(0, 10), at(30, 9.5), at(60, 9)]);
    expect(trend?.kind).toBe('shoaling');
    expect(trend?.rate).toBeCloseTo(-1);
  });

  it('calls slow changes steady', () => {
    expect(depthTrend([at(0, 10), at(60, 10.05)])?.kind).toBe('steady');
    expect(depthTrend([at(0, 10), at(60, 11)])?.kind).toBe('deepening');
  });

  it('keeps only the last two minutes', () => {
    const samples = [at(0, 20), at(100, 15), at(200, 10)];
    expect(recentSamples(samples, 200_000)).toEqual([at(100, 15), at(200, 10)]);
  });

  it('colours the depth against the shallow limit', () => {
    expect(depthState(2.5, 3)).toBe('danger');
    expect(depthState(4, 3)).toBe('warning');
    expect(depthState(5, 3)).toBe('normal');
    expect(depthState(1, null)).toBe('normal');
  });
});
