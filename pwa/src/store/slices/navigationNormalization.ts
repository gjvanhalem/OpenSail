import type { InstrumentData, Position } from '@/models';
import { InstrumentDataType } from '@/models';
import { speedToKnots } from './instrumentNormalization';

/**
 * Navigation values carried by an instrument reading: position, course and
 * speed over ground (knots), and true heading in degrees.
 * A field is present only when the reading carries that value.
 */
export interface NavigationReading {
  position?: Position;
  /** Course over ground, degrees true */
  course?: number;
  /** Speed over ground, knots */
  speedOverGround?: number;
  /** Heading, degrees true */
  heading?: number;
}

type Fields = Record<string, unknown>;

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function fields(value: unknown): Fields | null {
  return typeof value === 'object' && value !== null ? (value as Fields) : null;
}

function normalizeAngle(degrees: number): number {
  // Leave in-range values alone; the modulo arithmetic adds rounding noise
  if (degrees >= 0 && degrees < 360) return degrees;
  return ((degrees % 360) + 360) % 360;
}

function toPosition(obj: Fields | null, timestamp: number): Position | undefined {
  if (!obj) return undefined;
  const latitude = num(obj.latitude);
  const longitude = num(obj.longitude);
  if (latitude === undefined || longitude === undefined) return undefined;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;
  return {
    latitude,
    longitude,
    accuracy: num(obj.accuracy) ?? 0,
    timestamp: num(obj.timestamp) ?? timestamp,
    ...(num(obj.altitude) !== undefined ? { altitude: num(obj.altitude) } : {}),
  };
}

function isMagnetic(reference: unknown): boolean {
  return reference === 'magnetic' || reference === 'M';
}

/**
 * Map an InstrumentData reading from NMEA 0183, NMEA 2000 or SeaTalk to the
 * navigation values it carries.
 *
 * Shapes handled:
 * - gps: a Position (GGA), { latitude, longitude } (GLL),
 *   { position, speedKnots, course, valid } (RMC), { position } (PGN 129025/129029),
 *   { course, speed, reference } in m/s (PGN 129026).
 * - speed: { course, speedKnots } (VTG) is course and speed over ground;
 *   { speedGroundReferenced } (PGN 128259) is speed over ground;
 *   { speedKnots, heading } (VHW) carries a true heading.
 * - heading: { heading, reference: 'true' } (HDT, PGN 127250 true) as is;
 *   a magnetic heading (HDG, SeaTalk, PGN 127250 magnetic) is corrected with
 *   deviation and variation. { rateOfTurn } carries no heading.
 * Magnetic course over ground is ignored, since it can't be made true without
 * a known variation. A magnetic heading without its own variation (HDM, HDG
 * with an empty variation field) uses `magneticVariation` (degrees, east positive).
 */
export function normalizeNavigationData(
  data: InstrumentData,
  magneticVariation = 0
): NavigationReading {
  const obj = fields(data.value);
  if (!obj) return {};

  switch (data.type) {
    case InstrumentDataType.GPS: {
      if (obj.valid === false) return {};
      const result: NavigationReading = {};
      const position = toPosition(fields(obj.position) ?? obj, data.timestamp);
      if (position) result.position = position;

      const course = num(obj.course);
      if (course !== undefined && !isMagnetic(obj.reference)) {
        result.course = normalizeAngle(course);
      }
      const knots = num(obj.speedKnots);
      const speed = num(obj.speed);
      if (knots !== undefined) result.speedOverGround = knots;
      else if (speed !== undefined) result.speedOverGround = speedToKnots(speed, data.unit);
      return result;
    }

    case InstrumentDataType.Speed: {
      const result: NavigationReading = {};
      if ('course' in obj) {
        const course = num(obj.course);
        const knots = num(obj.speedKnots);
        if (course !== undefined) result.course = normalizeAngle(course);
        if (knots !== undefined) result.speedOverGround = knots;
        return result;
      }
      const ground = num(obj.speedGroundReferenced);
      if (ground !== undefined) result.speedOverGround = speedToKnots(ground, 'm/s');
      // VHW: a true heading next to speed through water
      const heading = num(obj.heading);
      if (heading !== undefined) result.heading = normalizeAngle(heading);
      return result;
    }

    case InstrumentDataType.Heading: {
      const heading = num(obj.heading);
      if (heading === undefined) return {};
      if (obj.reference === 'true') return { heading: normalizeAngle(heading) };
      // Magnetic sensor heading: true = magnetic + deviation + variation (east positive)
      const deviation = num(obj.deviation) ?? 0;
      const variation = num(obj.variation) ?? magneticVariation;
      return { heading: normalizeAngle(heading + deviation + variation) };
    }

    default:
      return {};
  }
}

export function hasNavigationValues(reading: NavigationReading): boolean {
  return (
    reading.position !== undefined ||
    reading.course !== undefined ||
    reading.speedOverGround !== undefined ||
    reading.heading !== undefined
  );
}
