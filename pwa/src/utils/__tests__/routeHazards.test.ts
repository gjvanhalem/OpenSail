import { describe, it, expect } from 'vitest';
import { checkLeg, depthAreaMinimum, pointInGeometry, sampleLeg, type ChartFeature } from '../routeHazards';

// A leg due east at 52.9° N, about 1.35 km long
const from: [number, number] = [5.3, 52.9];
const to: [number, number] = [5.32, 52.9];

const square = (west: number, south: number, east: number, north: number) => ({
  type: 'Polygon' as const,
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});

const feature = (layer: string, geometry: ChartFeature['geometry'], properties = {}, official = true): ChartFeature => ({
  layer,
  geometry,
  properties,
  region: 'test',
  official,
});

const coverage = feature('m_covr', square(5.2, 52.8, 5.4, 53.0));
const options = { safetyDepth: 3 };

describe('route hazard geometry', () => {
  it('samples a leg at the requested spacing', () => {
    const samples = sampleLeg(from, to, 25);
    expect(samples[0]).toEqual(from);
    expect(samples[samples.length - 1]).toEqual(to);
    expect(samples.length).toBeGreaterThan(50);
  });

  it('finds points in polygons, minding holes', () => {
    const withHole = {
      type: 'Polygon' as const,
      coordinates: [square(0, 0, 10, 10).coordinates[0], square(4, 4, 6, 6).coordinates[0]],
    };
    expect(pointInGeometry([1, 1], withHole)).toBe(true);
    expect(pointInGeometry([5, 5], withHole)).toBe(false);
  });

  it('treats an inland depth area without a surveyed depth as unknown', () => {
    expect(depthAreaMinimum({ DRVAL1: 0 })).toBeNull();
    expect(depthAreaMinimum({ DRVAL1: 0, DRVAL2: 2 })).toBe(0);
    expect(depthAreaMinimum({ DRVAL1: -1.2, DRVAL2: 0 })).toBe(-1.2);
  });
});

describe('checkLeg', () => {
  it('has nothing to say about a leg through deep water', () => {
    const deep = feature('depare', square(5.2, 52.8, 5.4, 53.0), { DRVAL1: 5, DRVAL2: 10 });
    expect(checkLeg(from, to, 0, [coverage, deep], options)).toEqual([]);
  });

  it('reports one warning per shallow stretch, with the least depth', () => {
    const deep = feature('depare', square(5.2, 52.8, 5.4, 53.0), { DRVAL1: 5, DRVAL2: 10 });
    const shoal = feature('depare', square(5.305, 52.89, 5.31, 52.91), { DRVAL1: 1.2, DRVAL2: 2 });
    const warnings = checkLeg(from, to, 1, [coverage, deep, shoal], options);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ type: 'shallow_water', severity: 'high', legIndex: 1, source: 'test' });
    expect(warnings[0].message).toMatch(/^Leg 2 crosses water shallower than 3 m \(least depth 1\.2 m\) for 0\.\d\d nm$/);
    expect(warnings[0].advisory).toBeUndefined();
  });

  it('reports drying areas', () => {
    const flat = feature('depare', square(5.305, 52.89, 5.31, 52.91), { DRVAL1: -0.8, DRVAL2: 0 });
    expect(checkLeg(from, to, 0, [coverage, flat], options)[0].message).toMatch(/least depth drying 0\.8 m/);
  });

  it('ignores depth areas without a surveyed depth', () => {
    const unknown = feature('depare', square(5.2, 52.8, 5.4, 53.0), { DRVAL1: 0 });
    expect(checkLeg(from, to, 0, [coverage, unknown], options)).toEqual([]);
  });

  it('reports hazards within the corridor, unless there is enough water over them', () => {
    const nearWreck = feature('wrecks', { type: 'Point', coordinates: [5.31, 52.9003] }, { OBJNAM: 'Wreck A' });
    const farRock = feature('uwtroc', { type: 'Point', coordinates: [5.31, 52.91] });
    const deepObstruction = feature('obstrn', { type: 'Point', coordinates: [5.315, 52.9] }, { VALSOU: 8 });
    const warnings = checkLeg(from, to, 0, [coverage, nearWreck, farRock, deepObstruction], options);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ type: 'hazard', severity: 'high' });
    expect(warnings[0].message).toMatch(/^Leg 1 passes 3\d m from Wreck A$/);
  });

  it('reports restricted areas the track enters', () => {
    const area = feature('resare', square(5.31, 52.89, 5.33, 52.91), { OBJNAM: 'Natura 2000' });
    expect(checkLeg(from, to, 0, [coverage, area], options)).toEqual([
      expect.objectContaining({ type: 'restricted_area', message: 'Leg 1 enters Natura 2000', severity: 'medium' }),
    ]);
  });

  it('reports a stretch without chart data', () => {
    const partial = feature('m_covr', square(5.2, 52.8, 5.31, 53.0));
    const warnings = checkLeg(from, to, 0, [partial], options);
    expect(warnings).toEqual([expect.objectContaining({ type: 'no_depth_data', severity: 'low' })]);
    expect(warnings[0].message).toMatch(/has no chart depth data for 0\.\d\d nm/);
  });

  it('marks warnings from survey data as advisory and less severe (coastal depths)', () => {
    const coastal = feature('depare', square(5.305, 52.89, 5.31, 52.91), { DRVAL1: 1, DRVAL2: 2 }, false);
    const [warning] = checkLeg(from, to, 0, [coverage, coastal], options);
    expect(warning).toMatchObject({ advisory: true, severity: 'medium' });
    expect(warning.message).toMatch(/^Advisory \(not an official chart\): /);
  });
});
