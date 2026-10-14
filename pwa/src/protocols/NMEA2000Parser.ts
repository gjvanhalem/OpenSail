import type { NMEA2000Message, InstrumentData, Position } from '../models';
import { InstrumentDataType } from '../models';

/**
 * NMEA 2000 parser.
 *
 * Input is a single CAN frame as produced by CAN gateways (e.g. Yacht Devices RAW,
 * SocketCAN candump): a 4-byte big-endian 29-bit CAN identifier followed by up to
 * 8 data bytes. Payload fields are little-endian, as defined by NMEA 2000.
 *
 * Fast-packet (multi-frame) PGNs such as 129029 are decoded only when the caller
 * passes an already reassembled payload.
 */
export class NMEA2000Parser {
  private static readonly CAN_ID_SIZE = 4;
  private static readonly GLOBAL_ADDRESS = 255;
  // PDU format values below 240 are PDU1 (addressed); PS holds the destination
  private static readonly PDU2_THRESHOLD = 240;
  private static readonly RAD_TO_DEG = 180 / Math.PI;

  private static readonly SUPPORTED_PGNS: Record<
    number,
    (data: Uint8Array, timestamp: number) => InstrumentData | null
  > = {
    126992: NMEA2000Parser.parseSystemTime,
    127250: NMEA2000Parser.parseHeading,
    127251: NMEA2000Parser.parseRateOfTurn,
    128259: NMEA2000Parser.parseSpeed,
    128267: NMEA2000Parser.parseDepth,
    129025: NMEA2000Parser.parsePosition,
    129026: NMEA2000Parser.parseCOGSOG,
    129029: NMEA2000Parser.parseGNSSPosition,
    130306: NMEA2000Parser.parseWind,
    130310: NMEA2000Parser.parseWaterTemperature
  };

  parse(message: Uint8Array): NMEA2000Message | null {
    if (message.length < NMEA2000Parser.CAN_ID_SIZE) return null;

    const id = NMEA2000Parser.readCanId(message);
    const priority = (id >>> 26) & 0x07;
    const pduFormat = (id >>> 16) & 0xff;
    const pduSpecific = (id >>> 8) & 0xff;
    const source = id & 0xff;
    const destination =
      pduFormat < NMEA2000Parser.PDU2_THRESHOLD ? pduSpecific : NMEA2000Parser.GLOBAL_ADDRESS;

    return {
      pgn: NMEA2000Parser.pgnFromCanId(id),
      priority,
      source,
      destination,
      data: message.slice(NMEA2000Parser.CAN_ID_SIZE),
      timestamp: Date.now()
    };
  }

  getPGN(message: Uint8Array): number {
    if (message.length < NMEA2000Parser.CAN_ID_SIZE) return 0;
    return NMEA2000Parser.pgnFromCanId(NMEA2000Parser.readCanId(message));
  }

  extractFields(message: NMEA2000Message): Record<string, unknown> {
    const parser = NMEA2000Parser.SUPPORTED_PGNS[message.pgn];
    if (!parser) {
      return { raw: Array.from(message.data).map(b => b.toString(16).padStart(2, '0')).join('') };
    }

    const result = parser(message.data, message.timestamp);
    if (!result) {
      return { raw: Array.from(message.data).map(b => b.toString(16).padStart(2, '0')).join('') };
    }

    return result.value as Record<string, unknown>;
  }

  parseToInstrumentData(message: NMEA2000Message): InstrumentData | null {
    const parser = NMEA2000Parser.SUPPORTED_PGNS[message.pgn];
    if (!parser) {
      return null;
    }
    return parser(message.data, message.timestamp);
  }

  private static readCanId(message: Uint8Array): number {
    return new DataView(message.buffer, message.byteOffset, 4).getUint32(0, false) & 0x1fffffff;
  }

  private static pgnFromCanId(id: number): number {
    const dataPage = (id >>> 24) & 0x03; // EDP + DP
    const pduFormat = (id >>> 16) & 0xff;
    const pduSpecific = pduFormat < NMEA2000Parser.PDU2_THRESHOLD ? 0 : (id >>> 8) & 0xff;
    return (dataPage << 16) | (pduFormat << 8) | pduSpecific;
  }

  private static view(data: Uint8Array): DataView {
    return new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  // NMEA 2000 marks missing values with the all-ones (unsigned) or max positive (signed) value
  private static uint16(view: DataView, offset: number, resolution: number): number | null {
    const raw = view.getUint16(offset, true);
    return raw >= 0xfffd ? null : raw * resolution;
  }

  private static int16(view: DataView, offset: number, resolution: number): number | null {
    const raw = view.getInt16(offset, true);
    return raw >= 0x7ffd ? null : raw * resolution;
  }

  private static uint32(view: DataView, offset: number, resolution: number): number | null {
    const raw = view.getUint32(offset, true);
    return raw >= 0xfffffffd ? null : raw * resolution;
  }

  private static int32(view: DataView, offset: number, resolution: number): number | null {
    const raw = view.getInt32(offset, true);
    return raw >= 0x7ffffffd ? null : raw * resolution;
  }

  private static int64(view: DataView, offset: number, resolution: number): number | null {
    const raw = view.getBigInt64(offset, true);
    return raw >= 0x7ffffffffffffffdn ? null : Number(raw) * resolution;
  }

  private static toDegrees(radians: number | null): number | null {
    return radians === null ? null : radians * NMEA2000Parser.RAD_TO_DEG;
  }

  // PGN 126992: SID, source, date (days since 1970), time (0.0001 s since midnight)
  private static parseSystemTime(data: Uint8Array, timestamp: number): InstrumentData | null {
    if (data.length < 8) return null;

    const view = NMEA2000Parser.view(data);
    const days = view.getUint16(2, true);
    const time = view.getUint32(4, true);
    if (days >= 0xfffd || time >= 0xfffffffd) return null;

    const systemTime = new Date(days * 86400000 + time / 10);

    return {
      type: InstrumentDataType.GPS,
      value: { systemTime },
      unit: '',
      timestamp,
      source: 'nmea2000'
    };
  }

  // PGN 127250: SID, heading (u16 1e-4 rad), deviation (i16), variation (i16), reference
  private static parseHeading(data: Uint8Array, timestamp: number): InstrumentData | null {
    if (data.length < 8) return null;

    const view = NMEA2000Parser.view(data);
    const heading = NMEA2000Parser.toDegrees(NMEA2000Parser.uint16(view, 1, 0.0001));
    if (heading === null) return null;

    const deviation = NMEA2000Parser.toDegrees(NMEA2000Parser.int16(view, 3, 0.0001));
    const variation = NMEA2000Parser.toDegrees(NMEA2000Parser.int16(view, 5, 0.0001));
    const ref = data[7] & 0x03;

    return {
      type: InstrumentDataType.Heading,
      value: {
        heading,
        deviation: deviation ?? 0,
        variation: variation ?? 0,
        reference: ref === 1 ? 'magnetic' : 'true'
      },
      unit: 'deg',
      timestamp,
      source: 'nmea2000'
    };
  }

  // PGN 127251: SID, rate of turn (i32 3.125e-8 rad/s)
  private static parseRateOfTurn(data: Uint8Array, timestamp: number): InstrumentData | null {
    if (data.length < 5) return null;

    const view = NMEA2000Parser.view(data);
    const rateOfTurn = NMEA2000Parser.toDegrees(NMEA2000Parser.int32(view, 1, 3.125e-8));
    if (rateOfTurn === null) return null;

    return {
      type: InstrumentDataType.Heading,
      value: { rateOfTurn },
      unit: 'deg/s',
      timestamp,
      source: 'nmea2000'
    };
  }

  // PGN 128259: SID, speed water referenced (u16 0.01 m/s), speed ground referenced, type
  private static parseSpeed(data: Uint8Array, timestamp: number): InstrumentData | null {
    if (data.length < 6) return null;

    const view = NMEA2000Parser.view(data);
    const speedWaterReferenced = NMEA2000Parser.uint16(view, 1, 0.01);
    const speedGroundReferenced = NMEA2000Parser.uint16(view, 3, 0.01);
    if (speedWaterReferenced === null && speedGroundReferenced === null) return null;

    return {
      type: InstrumentDataType.Speed,
      value: { speedWaterReferenced, speedGroundReferenced },
      unit: 'm/s',
      timestamp,
      source: 'nmea2000'
    };
  }

  // PGN 128267: SID, depth below transducer (u32 0.01 m), offset (i16 0.001 m), range (u8 10 m)
  private static parseDepth(data: Uint8Array, timestamp: number): InstrumentData | null {
    if (data.length < 7) return null;

    const view = NMEA2000Parser.view(data);
    const depth = NMEA2000Parser.uint32(view, 1, 0.01);
    if (depth === null) return null;

    const offset = NMEA2000Parser.int16(view, 5, 0.001) ?? 0;
    const range = data.length > 7 && data[7] < 0xfd ? data[7] * 10 : null;

    return {
      type: InstrumentDataType.Depth,
      value: { depth: depth + offset, offset, range },
      unit: 'm',
      timestamp,
      source: 'nmea2000'
    };
  }

  // PGN 129025: latitude (i32 1e-7 deg), longitude (i32 1e-7 deg)
  private static parsePosition(data: Uint8Array, timestamp: number): InstrumentData | null {
    if (data.length < 8) return null;

    const view = NMEA2000Parser.view(data);
    const latitude = NMEA2000Parser.int32(view, 0, 1e-7);
    const longitude = NMEA2000Parser.int32(view, 4, 1e-7);

    if (latitude === null || longitude === null) return null;

    const position: Position = {
      latitude,
      longitude,
      accuracy: 0,
      timestamp
    };

    return {
      type: InstrumentDataType.GPS,
      value: { position },
      unit: '',
      timestamp,
      source: 'nmea2000'
    };
  }

  // PGN 129026: SID, COG reference, COG (u16 1e-4 rad), SOG (u16 0.01 m/s)
  private static parseCOGSOG(data: Uint8Array, timestamp: number): InstrumentData | null {
    if (data.length < 6) return null;

    const view = NMEA2000Parser.view(data);
    const cogRef = data[1] & 0x03;
    const course = NMEA2000Parser.toDegrees(NMEA2000Parser.uint16(view, 2, 0.0001));
    const speed = NMEA2000Parser.uint16(view, 4, 0.01);
    if (course === null && speed === null) return null;

    return {
      type: InstrumentDataType.GPS,
      value: {
        course,
        speed,
        reference: cogRef === 1 ? 'magnetic' : 'true'
      },
      unit: 'deg, m/s',
      timestamp,
      source: 'nmea2000'
    };
  }

  // PGN 129029 (fast-packet): SID, date, time, lat/lon (i64 1e-16 deg), altitude (i64 1e-6 m),
  // GNSS type/method
  private static parseGNSSPosition(data: Uint8Array, timestamp: number): InstrumentData | null {
    if (data.length < 32) return null;

    const view = NMEA2000Parser.view(data);
    const latitude = NMEA2000Parser.int64(view, 7, 1e-16);
    const longitude = NMEA2000Parser.int64(view, 15, 1e-16);
    const altitude = NMEA2000Parser.int64(view, 23, 1e-6);
    const type = data[31] & 0x0f;

    if (latitude === null || longitude === null) return null;

    const position: Position = {
      latitude,
      longitude,
      altitude: altitude ?? 0,
      accuracy: 0,
      timestamp
    };

    return {
      type: InstrumentDataType.GPS,
      value: { position, gnssType: type },
      unit: '',
      timestamp,
      source: 'nmea2000'
    };
  }

  // PGN 130306: SID, wind speed (u16 0.01 m/s), wind angle (u16 1e-4 rad), reference
  private static parseWind(data: Uint8Array, timestamp: number): InstrumentData | null {
    if (data.length < 6) return null;

    const view = NMEA2000Parser.view(data);
    const speed = NMEA2000Parser.uint16(view, 1, 0.01);
    const angle = NMEA2000Parser.toDegrees(NMEA2000Parser.uint16(view, 3, 0.0001));
    if (speed === null || angle === null) return null;

    const windRef = data[5] & 0x07;

    return {
      type: InstrumentDataType.Wind,
      value: {
        angle,
        speed,
        reference:
          windRef === 2 ? 'apparent' : windRef === 3 || windRef === 4 ? 'true' : 'ground'
      },
      unit: 'deg, m/s',
      timestamp,
      source: 'nmea2000'
    };
  }

  // PGN 130310: SID, water temperature (u16 0.01 K), outside temperature, pressure
  private static parseWaterTemperature(data: Uint8Array, timestamp: number): InstrumentData | null {
    if (data.length < 3) return null;

    const view = NMEA2000Parser.view(data);
    const temperature = NMEA2000Parser.uint16(view, 1, 0.01);
    if (temperature === null) return null;

    return {
      type: InstrumentDataType.Temperature,
      value: { temperature },
      unit: 'K',
      timestamp,
      source: 'nmea2000'
    };
  }
}
