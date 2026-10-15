import type * as GeoJSON from 'geojson';
import type { Position, RouteWarning } from '@/models';

/**
 * Route hazard checks (R2.5) against chart features: depth areas shallower than
 * the safety depth, hazards near the track, restricted areas, and parts of the
 * route without chart data. Pure geometry on GeoJSON features in lon/lat, so it
 * can be tested without tiles; routeHazardService.ts loads the features.
 */

/** A chart feature with the S-57 object class (tile layer) it came from */
export interface ChartFeature {
  layer: string;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
  /** Chart region (catalog id) the feature belongs to */
  region: string;
  /** False for survey or model data: warnings from it are advisory */
  official: boolean;
}

export interface HazardCheckOptions {
  /** Least depth the vessel needs, in metres */
  safetyDepth: number;
  /** Hazards closer than this to the track are reported, in metres */
  corridorMeters?: number;
  /** Distance between sample points along a leg, in metres */
  sampleSpacingMeters?: number;
}

const DEPTH_LAYERS = ['depare', 'drgare'];
const POINT_HAZARD_LAYERS = ['obstrn', 'wrecks', 'uwtroc', 'hulkes', 'pilpnt'];
const RESTRICTED_LAYERS = ['resare', 'ctnare'];
const COVERAGE_LAYER = 'm_covr';
const MAX_SAMPLES_PER_LEG = 4000;
const EARTH_RADIUS_M = 6371008.8;
const METERS_PER_NM = 1852;

type Lonlat = [number, number];

/** Metres east and north of `origin`; accurate enough over a few kilometres */
function toLocal([lon, lat]: Lonlat, origin: Lonlat): [number, number] {
  const rad = Math.PI / 180;
  return [
    (lon - origin[0]) * rad * EARTH_RADIUS_M * Math.cos(origin[1] * rad),
    (lat - origin[1]) * rad * EARTH_RADIUS_M,
  ];
}

function distanceMeters(a: Lonlat, b: Lonlat): number {
  const [x, y] = toLocal(b, a);
  return Math.hypot(x, y);
}

/** Distance from point p to segment a–b, in metres */
function distanceToSegmentMeters(p: Lonlat, a: Lonlat, b: Lonlat): number {
  const [bx, by] = toLocal(b, a);
  const [px, py] = toLocal(p, a);
  const lengthSq = bx * bx + by * by;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / lengthSq));
  return Math.hypot(px - t * bx, py - t * by);
}

function pointInRing([x, y]: Lonlat, ring: GeoJSON.Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Point in polygon, holes included (even-odd over every ring) */
function pointInPolygonRings(point: Lonlat, rings: GeoJSON.Position[][]): boolean {
  let inside = false;
  for (const ring of rings) if (pointInRing(point, ring)) inside = !inside;
  return inside;
}

export function pointInGeometry(point: Lonlat, geometry: GeoJSON.Geometry): boolean {
  switch (geometry.type) {
    case 'Polygon':
      return pointInPolygonRings(point, geometry.coordinates);
    case 'MultiPolygon':
      return geometry.coordinates.some((polygon) => pointInPolygonRings(point, polygon));
    default:
      return false;
  }
}

/** Points of a geometry, for hazards drawn as points (or small lines and areas) */
function geometryPoints(geometry: GeoJSON.Geometry): Lonlat[] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates as Lonlat];
    case 'MultiPoint':
    case 'LineString':
      return geometry.coordinates as Lonlat[];
    case 'MultiLineString':
    case 'Polygon':
      return geometry.coordinates.flat() as Lonlat[];
    case 'MultiPolygon':
      return geometry.coordinates.flat(2) as Lonlat[];
    default:
      return [];
  }
}

/** Points every `spacing` metres from a to b, both ends included */
export function sampleLeg(a: Lonlat, b: Lonlat, spacing: number): Lonlat[] {
  const length = distanceMeters(a, b);
  const steps = Math.min(MAX_SAMPLES_PER_LEG, Math.max(1, Math.ceil(length / spacing)));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as Lonlat;
  });
}

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Least depth of a depth area, or null when it has no surveyed depth */
export function depthAreaMinimum(properties: Record<string, unknown>): number | null {
  const drval1 = num(properties.DRVAL1);
  const drval2 = num(properties.DRVAL2);
  // Inland ENCs mark areas without a surveyed depth as DRVAL1 0 with no DRVAL2
  if (drval1 === null || (drval1 === 0 && drval2 === null)) return null;
  return drval1;
}

const position = ([lon, lat]: Lonlat): Position => ({ latitude: lat, longitude: lon, accuracy: 0, timestamp: 0 });
const formatDepth = (metres: number) => (metres < 0 ? `drying ${(-metres).toFixed(1)} m` : `${metres.toFixed(1)} m`);
const nm = (metres: number) => (metres / METERS_PER_NM).toFixed(2);

function finish(warning: RouteWarning, official: boolean): RouteWarning {
  if (official) return warning;
  // Survey data is advisory: one step less severe, and labelled
  const severity = warning.severity === 'high' ? 'medium' : 'low';
  return { ...warning, severity, advisory: true, message: `Advisory (not an official chart): ${warning.message}` };
}

/**
 * Warnings for one leg from `from` to `to` (lon/lat), given the chart features
 * around it. Shallow stretches are reported once per stretch.
 */
export function checkLeg(
  from: Lonlat,
  to: Lonlat,
  legIndex: number,
  features: ChartFeature[],
  { safetyDepth, corridorMeters = 50, sampleSpacingMeters = 25 }: HazardCheckOptions
): RouteWarning[] {
  const warnings: RouteWarning[] = [];
  const samples = sampleLeg(from, to, sampleSpacingMeters);
  const legLabel = `Leg ${legIndex + 1}`;

  const depthAreas = features.filter((f) => DEPTH_LAYERS.includes(f.layer));
  const coverage = features.filter((f) => f.layer === COVERAGE_LAYER);
  const restricted = features.filter((f) => RESTRICTED_LAYERS.includes(f.layer));

  // Shallow water and coverage, walking along the leg
  let shallow: { start: number; end: number; least: number; feature: ChartFeature } | null = null;
  let uncovered: { start: number; end: number } | null = null;
  const flushShallow = () => {
    if (!shallow) return;
    const { start, end, least, feature } = shallow;
    const length = distanceMeters(samples[start], samples[end]);
    warnings.push(
      finish(
        {
          type: 'shallow_water',
          position: position(samples[start]),
          message:
            `${legLabel} crosses water shallower than ${safetyDepth} m (least depth ${formatDepth(least)})` +
            (length > 0 ? ` for ${nm(length)} nm` : ''),
          severity: least < 0 || least < safetyDepth - 1 ? 'high' : 'medium',
          legIndex,
          source: feature.region,
        },
        feature.official
      )
    );
    shallow = null;
  };
  const flushUncovered = () => {
    if (!uncovered) return;
    const length = distanceMeters(samples[uncovered.start], samples[uncovered.end]);
    warnings.push({
      type: 'no_depth_data',
      position: position(samples[uncovered.start]),
      message: `${legLabel} has no chart depth data for ${nm(length)} nm: check an official chart`,
      severity: 'low',
      legIndex,
    });
    uncovered = null;
  };

  samples.forEach((sample, i) => {
    const covered = coverage.some((f) => pointInGeometry(sample, f.geometry));
    if (!covered) {
      uncovered = uncovered ? { ...uncovered, end: i } : { start: i, end: i };
    } else flushUncovered();

    // The shallowest depth area under this point
    let least: { depth: number; feature: ChartFeature } | null = null;
    for (const feature of depthAreas) {
      const depth = depthAreaMinimum(feature.properties);
      if (depth === null || depth >= safetyDepth) continue;
      if (!pointInGeometry(sample, feature.geometry)) continue;
      if (!least || depth < least.depth) least = { depth, feature };
    }
    if (least) {
      shallow = shallow
        ? { ...shallow, end: i, least: Math.min(shallow.least, least.depth) }
        : { start: i, end: i, least: least.depth, feature: least.feature };
    } else flushShallow();
  });
  flushShallow();
  flushUncovered();

  // Hazards near the track
  const seen = new Set<string>();
  for (const feature of features) {
    if (!POINT_HAZARD_LAYERS.includes(feature.layer)) continue;
    const valsou = num(feature.properties.VALSOU);
    // Enough water over it (charted depth at least the safety depth)
    if (valsou !== null && valsou >= safetyDepth) continue;
    const nearest = geometryPoints(feature.geometry)
      .map((point) => ({ point, distance: distanceToSegmentMeters(point, from, to) }))
      .sort((a, b) => a.distance - b.distance)[0];
    const inside = feature.geometry.type.endsWith('Polygon') && samples.some((s) => pointInGeometry(s, feature.geometry));
    if (!nearest || (!inside && nearest.distance > corridorMeters)) continue;
    const key = `${feature.layer}:${nearest.point[0].toFixed(6)},${nearest.point[1].toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const name = (feature.properties.OBJNAM as string | undefined) ?? HAZARD_NAMES[feature.layer];
    const over = valsou !== null ? ` (${formatDepth(valsou)} over it)` : '';
    warnings.push(
      finish(
        {
          type: 'hazard',
          position: position(nearest.point),
          message: `${legLabel} passes ${inside ? 'over' : `${Math.round(nearest.distance)} m from`} ${name}${over}`,
          severity: 'high',
          legIndex,
          source: feature.region,
        },
        feature.official
      )
    );
  }

  // Restricted areas the track enters
  for (const feature of restricted) {
    const entry = samples.find((s) => pointInGeometry(s, feature.geometry));
    if (!entry) continue;
    const name = (feature.properties.OBJNAM as string | undefined) ?? 'a restricted area';
    const key = `${feature.layer}:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    warnings.push(
      finish(
        {
          type: 'restricted_area',
          position: position(entry),
          message: `${legLabel} enters ${name}`,
          severity: 'medium',
          legIndex,
          source: feature.region,
        },
        feature.official
      )
    );
  }

  return warnings;
}

const HAZARD_NAMES: Record<string, string> = {
  obstrn: 'an obstruction',
  wrecks: 'a wreck',
  uwtroc: 'a rock',
  hulkes: 'a hulk',
  pilpnt: 'a pile',
};
