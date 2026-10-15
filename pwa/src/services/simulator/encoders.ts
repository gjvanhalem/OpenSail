/**
 * Encode a simulated vessel state as the data real instruments send, so the
 * stub exercises the same parsers as hardware:
 * - NMEA 0183 sentences (as a serial line or a TCP/UDP multiplexer sends them)
 * - NMEA 2000 single CAN frames in candump format ("CANID#data", hex)
 * - SeaTalk datagrams wrapped as $STALK sentences, the way SeaTalk-to-NMEA
 *   gateways forward them
 */
import type { SimulationState } from './VesselSimulation';

const MS_PER_KNOT = 1852 / 3600;
const METERS_TO_FEET = 1 / 0.3048;
const DEG_TO_RAD = Math.PI / 180;

const normalize = (degrees: number) => ((degrees % 360) + 360) % 360;

// ---------------------------------------------------------------- NMEA 0183

/** XOR of the characters between $ and *, as two hex digits */
export function nmeaChecksum(body: string): string {
  let checksum = 0;
  for (let i = 0; i < body.length; i++) checksum ^= body.charCodeAt(i);
  return checksum.toString(16).toUpperCase().padStart(2, '0');
}

export function nmeaSentence(body: string): string {
  return `$${body}*${nmeaChecksum(body)}`;
}

/** ddmm.mmmm,N or dddmm.mmmm,E */
function nmeaCoordinate(value: number, isLatitude: boolean): string {
  const abs = Math.abs(value);
  let degrees = Math.floor(abs);
  let minutes = Number(((abs - degrees) * 60).toFixed(4));
  if (minutes >= 60) {
    degrees += 1;
    minutes -= 60;
  }
  const deg = String(degrees).padStart(isLatitude ? 2 : 3, '0');
  const min = minutes.toFixed(4).padStart(7, '0');
  const hemisphere = isLatitude ? (value < 0 ? 'S' : 'N') : value < 0 ? 'W' : 'E';
  return `${deg}${min},${hemisphere}`;
}

function nmeaTime(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}.00`;
}

function nmeaDate(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCFullYear() % 100)}`;
}

/** Degrees with the E/W letter NMEA uses for variation and deviation */
function eastWest(degrees: number): string {
  return `${Math.abs(degrees).toFixed(1)},${degrees < 0 ? 'W' : 'E'}`;
}

/** One second of NMEA 0183 output: GPS (RMC, GGA, VTG), compass (HDG), log, sounder, wind */
export function encodeNMEA0183(s: SimulationState): string[] {
  const lat = nmeaCoordinate(s.position.latitude, true);
  const lon = nmeaCoordinate(s.position.longitude, false);
  const time = nmeaTime(s.timestamp);
  const magneticHeading = normalize(s.heading - s.variation);
  const sog = s.speedOverGround.toFixed(1);
  const cog = s.course.toFixed(1);

  return [
    nmeaSentence(`GPRMC,${time},A,${lat},${lon},${sog},${cog},${nmeaDate(s.timestamp)},${eastWest(s.variation)},A`),
    nmeaSentence(`GPGGA,${time},${lat},${lon},1,09,0.9,2.0,M,47.0,M,,`),
    nmeaSentence(
      `GPVTG,${cog},T,${normalize(s.course - s.variation).toFixed(1)},M,${sog},N,${(s.speedOverGround * 1.852).toFixed(1)},K,A`
    ),
    nmeaSentence(`HCHDG,${magneticHeading.toFixed(1)},0.0,E,${eastWest(s.variation)}`),
    nmeaSentence(
      `VWVHW,${s.heading.toFixed(1)},T,${magneticHeading.toFixed(1)},M,${s.speedThroughWater.toFixed(1)},N,${(s.speedThroughWater * 1.852).toFixed(1)},K`
    ),
    nmeaSentence(`SDDPT,${s.depth.toFixed(1)},0.0`),
    nmeaSentence(
      `SDDBT,${(s.depth * METERS_TO_FEET).toFixed(1)},f,${s.depth.toFixed(1)},M,${(s.depth / 1.8288).toFixed(1)},F`
    ),
    nmeaSentence(`WIMWV,${s.windAngle.toFixed(1)},R,${s.windSpeed.toFixed(1)},N,A`),
  ];
}

// ---------------------------------------------------------------- NMEA 2000

class Payload {
  private readonly bytes: number[] = [];
  u8(value: number): this {
    this.bytes.push(value & 0xff);
    return this;
  }
  u16(value: number): this {
    const v = Math.round(value);
    return this.u8(v).u8(v >> 8);
  }
  i16(value: number): this {
    return this.u16(Math.round(value) & 0xffff);
  }
  i32(value: number): this {
    const v = Math.round(value) | 0;
    return this.u8(v).u8(v >> 8).u8(v >> 16).u8(v >> 24);
  }
  u32(value: number): this {
    return this.i32(Math.round(value) >>> 0);
  }
  /** Pad to a full 8-byte CAN frame with 0xFF (reserved / not available) */
  frame(): number[] {
    while (this.bytes.length < 8) this.bytes.push(0xff);
    return this.bytes;
  }
}

/** candump format: 29-bit CAN ID and data as hex, e.g. "09F80150#081EAE1CE8B022F9" */
export function n2kFrame(pgn: number, data: number[], priority = 2, source = 0x23): string {
  const id = (((priority & 0x7) << 26) | (pgn << 8) | (source & 0xff)) >>> 0;
  const hex = data.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join('');
  return `${id.toString(16).toUpperCase().padStart(8, '0')}#${hex}`;
}

/** Radians at 1e-4 resolution, 0-2π */
const angle = (degrees: number) => normalize(degrees) * DEG_TO_RAD * 10000;

/**
 * NMEA 2000 single-frame PGNs: 129025 position, 129026 COG/SOG, 127250 heading,
 * 128259 speed, 128267 depth, 130306 apparent wind, 130310 water temperature.
 * 129029 (GNSS position) is a fast packet and isn't sent, since the parser has
 * no fast-packet reassembly yet.
 */
export function encodeNMEA2000(s: SimulationState, sid = 0): string[] {
  return [
    n2kFrame(
      129025,
      new Payload().i32(s.position.latitude * 1e7).i32(s.position.longitude * 1e7).frame()
    ),
    n2kFrame(
      129026,
      // SID, COG reference true (0) in the low 2 bits, COG, SOG
      new Payload().u8(sid).u8(0xfc).u16(angle(s.course)).u16(s.speedOverGround * MS_PER_KNOT * 100).frame()
    ),
    n2kFrame(
      127250,
      // SID, heading, deviation, variation, reference true (0)
      new Payload().u8(sid).u16(angle(s.heading)).i16(0).i16(s.variation * DEG_TO_RAD * 10000).u8(0xfc).frame()
    ),
    n2kFrame(
      128259,
      // SID, speed water referenced, speed ground referenced not sent
      new Payload().u8(sid).u16(s.speedThroughWater * MS_PER_KNOT * 100).u16(0xffff).frame()
    ),
    n2kFrame(128267, new Payload().u8(sid).u32(s.depth * 100).i16(0).frame()),
    n2kFrame(
      130306,
      // SID, wind speed, wind angle, reference apparent (2)
      new Payload().u8(sid).u16(s.windSpeed * MS_PER_KNOT * 100).u16(angle(s.windAngle)).u8(0xfa).frame()
    ),
    n2kFrame(130310, new Payload().u8(sid).u16((s.waterTemperature + 273.15) * 100).frame()),
  ];
}

// ---------------------------------------------------------------- SeaTalk

/** A datagram as a $STALK sentence: $STALK,84,86,26,...*hh */
export function stalkSentence(datagram: number[]): string {
  const hex = datagram.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(',');
  return nmeaSentence(`STALK,${hex}`);
}

/**
 * Compass heading bytes U (high nibble of the attribute) and VW:
 * heading = (U & 3) * 90 + (VW & 0x3F) * 2 + (U & 0xC) / 8
 */
function seaTalkHeading(degrees: number): { u: number; vw: number } {
  // Half-degree resolution
  const halfDegrees = Math.round(normalize(degrees) * 2) % 720;
  const quadrant = Math.floor(halfDegrees / 180);
  const rest = halfDegrees - quadrant * 180;
  const twoDegreeSteps = Math.floor(rest / 4);
  const remainder = rest - twoDegreeSteps * 4; // half degrees, 0-3
  return { u: quadrant | (remainder << 2), vw: twoDegreeSteps };
}

/** Degrees and minutes*100 with the hemisphere flag in bit 15 */
function seaTalkCoordinate(value: number, flag: boolean): number[] {
  const abs = Math.abs(value);
  let degrees = Math.floor(abs);
  let hundredthMinutes = Math.round((abs - degrees) * 60 * 100);
  if (hundredthMinutes >= 6000) {
    degrees += 1;
    hundredthMinutes -= 6000;
  }
  const yyyy = hundredthMinutes | (flag ? 0x8000 : 0);
  return [degrees, yyyy & 0xff, yyyy >> 8];
}

/**
 * SeaTalk datagrams: depth (00), apparent wind angle (10) and speed (11),
 * speed through water (20), water temperature (23), latitude (50),
 * longitude (51), SOG (52), magnetic COG (53), compass heading (89) and
 * variation (99).
 */
export function encodeSeaTalk(s: SimulationState): string[] {
  const depthTenthsFeet = Math.round(s.depth * METERS_TO_FEET * 10);
  const awa = Math.round(s.windAngle * 2);
  const awsTenths = Math.round(Math.min(127.9, s.windSpeed) * 10);
  const stw = Math.round(s.speedThroughWater * 10);
  const sog = Math.round(s.speedOverGround * 10);
  const temperature = Math.round(s.waterTemperature);
  // SeaTalk sends whole-degree variation; convert with that same value so the
  // true heading survives the round trip
  const variationDegrees = Math.round(s.variation);
  const heading = seaTalkHeading(s.heading - variationDegrees);
  const cog = seaTalkHeading(s.course - variationDegrees);
  const variation = -variationDegrees & 0xff; // positive is west

  return [
    [0x00, 0x02, 0x00, depthTenthsFeet & 0xff, depthTenthsFeet >> 8],
    [0x10, 0x01, (awa >> 8) & 0xff, awa & 0xff],
    [0x11, 0x01, Math.floor(awsTenths / 10) & 0x7f, awsTenths % 10],
    [0x20, 0x01, stw & 0xff, stw >> 8],
    [0x23, 0x01, temperature & 0xff, Math.round(temperature * 1.8 + 32) & 0xff],
    [0x99, 0x00, variation],
    [0x50, 0x02, ...seaTalkCoordinate(s.position.latitude, s.position.latitude < 0)],
    [0x51, 0x02, ...seaTalkCoordinate(s.position.longitude, s.position.longitude >= 0)],
    [0x52, 0x01, sog & 0xff, sog >> 8],
    [0x53, (cog.u << 4) | 0x00, cog.vw],
    [0x89, (heading.u << 4) | 0x02, heading.vw, 0x00, 0x20],
  ].map(stalkSentence);
}
