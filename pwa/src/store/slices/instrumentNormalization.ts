import type { InstrumentData } from '@/models';
import { InstrumentDataType } from '@/models';

/**
 * Instrument readings in the units the instruments slice stores:
 * depth in metres, speeds in knots, angles in degrees, temperature in °C.
 * A field is present only when the reading carries that value.
 */
export interface NormalizedInstrumentReading {
  depth?: number;
  waterSpeed?: number;
  windSpeed?: number;
  /** Apparent wind angle relative to the bow, 0-360 clockwise */
  windDirection?: number;
  waterTemperature?: number;
  /** Rudder angle, degrees, starboard positive */
  rudderAngle?: number;
  /** Heel, degrees, starboard down positive */
  heel?: number;
  /** Pitch, degrees, bow up positive */
  pitch?: number;
}

const MS_TO_KNOTS = 3600 / 1852;
const KMH_TO_KNOTS = 1000 / 1852;
const FEET_TO_METERS = 0.3048;
const KELVIN_OFFSET = 273.15;

type Fields = Record<string, unknown>;

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function fields(value: unknown): Fields | null {
  return typeof value === 'object' && value !== null ? (value as Fields) : null;
}

/**
 * Convert a speed to knots. Accepts NMEA 0183 unit letters (N, K, M) as well as
 * unit labels such as "kn", "km/h", "m/s" or combined ones like "deg, m/s".
 * Anything else is taken to be knots.
 */
export function speedToKnots(speed: number, unit: string | undefined): number {
  const u = (unit ?? '').trim();
  if (u === 'M' || u.includes('m/s')) return speed * MS_TO_KNOTS;
  if (u === 'K' || u.includes('km/h') || u.includes('kph')) return speed * KMH_TO_KNOTS;
  return speed;
}

function depthToMeters(depth: number, unit: string): number {
  return unit === 'ft' || unit === 'f' ? depth * FEET_TO_METERS : depth;
}

function temperatureToCelsius(temperature: number, unit: string): number {
  if (unit === 'K') return temperature - KELVIN_OFFSET;
  if (unit === 'F' || unit === '°F') return ((temperature - 32) * 5) / 9;
  return temperature;
}

function isApparentWind(reference: unknown): boolean {
  // No reference (e.g. the stub simulator) is treated as apparent wind
  return reference === undefined || reference === 'R' || reference === 'apparent';
}

/**
 * Map an InstrumentData reading from any source (NMEA 0183, NMEA 2000, SeaTalk,
 * stub simulator) to slice values in consistent units.
 *
 * Shapes handled:
 * - depth: number, or { depth } (NMEA 2000 / SeaTalk, depth already includes offset)
 * - speed: number, { speedKnots } (VHW), { speedWaterReferenced } (PGN 128259),
 *   { speed } (SeaTalk STW). VTG ({ course, speedKnots }) and ground-referenced
 *   speed are speed over ground and do not set waterSpeed.
 * - wind: { speed, direction } (stub), { angle, speed, unit, reference } (MWV),
 *   { angle, speed, reference } (PGN 130306), or angle / speed alone (SeaTalk).
 *   Only apparent wind updates the slice, since the wind gauge shows apparent wind.
 * - temperature: number, or { temperature }, converted from the reading's unit.
 * - rudder: { angle } (RSA); attitude: { heel?, pitch? } (XDR).
 */
export function normalizeInstrumentData(data: InstrumentData): NormalizedInstrumentReading {
  const value = data.value;
  const obj = fields(value);

  switch (data.type) {
    case InstrumentDataType.Depth: {
      const depth = num(value) ?? num(obj?.depth);
      return depth === undefined ? {} : { depth: depthToMeters(depth, data.unit) };
    }

    case InstrumentDataType.Speed: {
      if (num(value) !== undefined) {
        return { waterSpeed: speedToKnots(value as number, data.unit) };
      }
      if (!obj || 'course' in obj) return {};

      const knots = num(obj.speedKnots);
      if (knots !== undefined) return { waterSpeed: knots };

      const waterReferenced = num(obj.speedWaterReferenced);
      if (waterReferenced !== undefined) {
        return { waterSpeed: speedToKnots(waterReferenced, 'm/s') };
      }
      if ('speedGroundReferenced' in obj) return {};

      const speed = num(obj.speed);
      return speed === undefined ? {} : { waterSpeed: speedToKnots(speed, data.unit) };
    }

    case InstrumentDataType.Wind: {
      if (!obj || !isApparentWind(obj.reference)) return {};

      const result: NormalizedInstrumentReading = {};
      const speed = num(obj.speed);
      if (speed !== undefined) {
        // The NMEA 0183 unit letter is more specific than the combined data.unit label
        const unit = typeof obj.unit === 'string' && obj.unit.length === 1 ? obj.unit : data.unit;
        result.windSpeed = speedToKnots(speed, unit);
      }
      const angle = num(obj.direction) ?? num(obj.angle);
      if (angle !== undefined) {
        result.windDirection = ((angle % 360) + 360) % 360;
      }
      return result;
    }

    case InstrumentDataType.Temperature: {
      const temperature = num(value) ?? num(obj?.temperature);
      return temperature === undefined
        ? {}
        : { waterTemperature: temperatureToCelsius(temperature, data.unit) };
    }

    case InstrumentDataType.Rudder: {
      const angle = num(obj?.angle);
      return angle === undefined ? {} : { rudderAngle: angle };
    }

    case InstrumentDataType.Attitude: {
      const result: NormalizedInstrumentReading = {};
      const heel = num(obj?.heel);
      const pitch = num(obj?.pitch);
      if (heel !== undefined) result.heel = heel;
      if (pitch !== undefined) result.pitch = pitch;
      return result;
    }

    default:
      return {};
  }
}
