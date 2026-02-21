import { NMEA2000Message, InstrumentData, InstrumentDataType, Position } from '../types';

export class NMEA2000Parser {
  private static readonly PGN_SIZE = 8;
  private static readonly PRIORITY_MASK = 0x1c0;
  private static readonly PGN_MASK = 0x3ff;

  private static readonly SUPPORTED_PGNS: Record<
    number,
    (data: Buffer, timestamp: number) => InstrumentData | null
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

  parse(message: Buffer): NMEA2000Message | null {
    if (message.length < 3) return null;

    const priority = (message[0] >> 2) & 0x07;
    const pgn = ((message[0] & 0x03) << 8) | message[1];
    const source = message[2];
    const destination = message.length > 3 ? message[3] : 255;
    const data = message.length > 4 ? message.slice(4) : Buffer.alloc(0);

    return {
      pgn,
      priority,
      source,
      destination,
      data,
      timestamp: Date.now()
    };
  }

  getPGN(message: Buffer): number {
    if (message.length < 2) return 0;
    return ((message[0] & 0x03) << 8) | message[1];
  }

  extractFields(message: NMEA2000Message): Record<string, unknown> {
    const parser = NMEA2000Parser.SUPPORTED_PGNS[message.pgn];
    if (!parser) {
      return { raw: message.data.toString('hex') };
    }

    const result = parser(message.data, message.timestamp);
    if (!result) {
      return { raw: message.data.toString('hex') };
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

  private static parseSystemTime(data: Buffer, timestamp: number): InstrumentData | null {
    if (data.length < 8) return null;

    const date = ((data[0] & 0xff) << 8) | (data[1] & 0xff);
    const time =
      (((data[2] & 0xff) << 24) >>> 0) |
      (((data[3] & 0xff) << 16) >>> 0) |
      (((data[4] & 0xff) << 8) >>> 0) |
      (data[5] & 0xff);

    const year = ((date >> 9) & 0x7f) + 2000;
    const month = ((date >> 5) & 0x0f) - 1;
    const day = date & 0x1f;
    const hours = (time >> 22) & 0x1f;
    const minutes = (time >> 16) & 0x3f;
    const seconds = (time >> 8) & 0x3f;
    const ms = ((time & 0xff) * 1000) / 256;

    const systemTime = new Date(year, month, day, hours, minutes, seconds, ms);

    return {
      type: InstrumentDataType.GPS,
      value: { systemTime },
      unit: '',
      timestamp,
      source: 'nmea2000'
    };
  }

  private static parseHeading(data: Buffer, timestamp: number): InstrumentData | null {
    if (data.length < 4) return null;

    const heading = (((data[0] & 0xff) << 8) | (data[1] & 0xff)) / 10000;
    const deviation = (((data[2] & 0xff) << 8) | (data[3] & 0xff)) / 10000;
    const variation = (((data[4] & 0xff) << 8) | (data[5] & 0xff)) / 10000;
    const ref = data[6] & 0x0f;

    return {
      type: InstrumentDataType.Heading,
      value: {
        heading,
        deviation,
        variation,
        reference: ref === 1 ? 'magnetic' : 'true'
      },
      unit: 'deg',
      timestamp,
      source: 'nmea2000'
    };
  }

  private static parseRateOfTurn(data: Buffer, timestamp: number): InstrumentData | null {
    if (data.length < 4) return null;

    const rateOfTurn =
      ((((data[0] & 0xff) << 24) >>> 0) |
        (((data[1] & 0xff) << 16) >>> 0) |
        (((data[2] & 0xff) << 8) >>> 0) |
        (data[3] & 0xff)) /
      1000000;

    return {
      type: InstrumentDataType.Heading,
      value: { rateOfTurn },
      unit: 'deg/s',
      timestamp,
      source: 'nmea2000'
    };
  }

  private static parseSpeed(data: Buffer, timestamp: number): InstrumentData | null {
    if (data.length < 6) return null;

    const speedWaterReferenced = (((data[0] & 0xff) << 8) | (data[1] & 0xff)) / 100;
    const speedGroundReferenced = (((data[2] & 0xff) << 8) | (data[3] & 0xff)) / 100;
    const speedWater = (((data[4] & 0xff) << 8) | (data[5] & 0xff)) / 100;

    return {
      type: InstrumentDataType.Speed,
      value: { speedWaterReferenced, speedGroundReferenced, speedWater },
      unit: 'm/s',
      timestamp,
      source: 'nmea2000'
    };
  }

  private static parseDepth(data: Buffer, timestamp: number): InstrumentData | null {
    if (data.length < 6) return null;

    const depth =
      ((((data[0] & 0xff) << 24) >>> 0) |
        (((data[1] & 0xff) << 16) >>> 0) |
        (((data[2] & 0xff) << 8) >>> 0) |
        (data[3] & 0xff)) /
      100;
    const offset = (((data[4] & 0xff) << 8) | (data[5] & 0xff)) / 100;
    const range = data[6] & 0x0f;

    return {
      type: InstrumentDataType.Depth,
      value: { depth: depth + offset, offset, range },
      unit: 'm',
      timestamp,
      source: 'nmea2000'
    };
  }

  private static parsePosition(data: Buffer, timestamp: number): InstrumentData | null {
    if (data.length < 8) return null;

    const latitude = NMEA2000Parser.parseIEEEFloat(data.slice(0, 4));
    const longitude = NMEA2000Parser.parseIEEEFloat(data.slice(4, 8));

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

  private static parseCOGSOG(data: Buffer, timestamp: number): InstrumentData | null {
    if (data.length < 8) return null;

    const cog = (((data[0] & 0xff) << 8) | (data[1] & 0xff)) / 10000;
    const cogRef = data[2] & 0x0f;
    const sog = (((data[3] & 0xff) << 8) | (data[4] & 0xff)) / 100;

    return {
      type: InstrumentDataType.GPS,
      value: {
        course: cog,
        speed: sog,
        reference: cogRef === 1 ? 'magnetic' : 'true'
      },
      unit: 'deg, m/s',
      timestamp,
      source: 'nmea2000'
    };
  }

  private static parseGNSSPosition(data: Buffer, timestamp: number): InstrumentData | null {
    if (data.length < 18) return null;

    const latitude = NMEA2000Parser.parseIEEEFloat(data.slice(0, 4));
    const longitude = NMEA2000Parser.parseIEEEFloat(data.slice(4, 8));
    const altitude = NMEA2000Parser.parseIEEEFloat(data.slice(8, 12));
    const type = data[17] & 0x0f;

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

  private static parseWind(data: Buffer, timestamp: number): InstrumentData | null {
    if (data.length < 6) return null;

    const windAngle = (((data[0] & 0xff) << 8) | (data[1] & 0xff)) / 10000;
    const windSpeed = (((data[2] & 0xff) << 8) | (data[3] & 0xff)) / 100;
    const windRef = data[4] & 0x0f;

    return {
      type: InstrumentDataType.Wind,
      value: {
        angle: windAngle * (180 / Math.PI),
        speed: windSpeed,
        reference: windRef === 1 ? 'apparent' : windRef === 2 ? 'true' : 'ground'
      },
      unit: 'deg, m/s',
      timestamp,
      source: 'nmea2000'
    };
  }

  private static parseWaterTemperature(data: Buffer, timestamp: number): InstrumentData | null {
    if (data.length < 4) return null;

    const temp = (((data[0] & 0xff) << 8) | (data[1] & 0xff)) / 100;
    const tempSource = data[3] & 0x0f;

    return {
      type: InstrumentDataType.Temperature,
      value: { temperature: temp, source: tempSource },
      unit: 'K',
      timestamp,
      source: 'nmea2000'
    };
  }

  private static parseIEEEFloat(buffer: Buffer): number | null {
    if (buffer.length < 4) return null;

    const bytes = buffer.slice(0, 4);
    const sign = (bytes[3] >> 7) & 1;
    const exponent = ((bytes[3] & 0x7f) << 1) | ((bytes[2] >> 7) & 1);
    const mantissa = ((bytes[2] & 0x7f) << 16) | (bytes[1] << 8) | bytes[0];

    if (exponent === 0 && mantissa === 0) return 0;
    if (exponent === 255) return NaN;

    const value = (1 + mantissa / 8388608) * Math.pow(2, exponent - 127);
    return sign ? -value : value;
  }
}
