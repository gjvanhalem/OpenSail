import { NMEA0183Message, Position, InstrumentData, InstrumentDataType } from '../types';

export class NMEA0183Parser {
  private static readonly SENTENCE_START = '$';
  private static readonly CHECKSUM_DELIMITER = '*';
  private static readonly FIELD_DELIMITER = ',';

  private static readonly SUPPORTED_SENTENCES: Record<
    string,
    (fields: string[]) => InstrumentData | null
  > = {
    GGA: NMEA0183Parser.parseGGA,
    RMC: NMEA0183Parser.parseRMC,
    GLL: NMEA0183Parser.parseGLL,
    VTG: NMEA0183Parser.parseVTG,
    DBT: NMEA0183Parser.parseDBT,
    DPT: NMEA0183Parser.parseDPT,
    MWV: NMEA0183Parser.parseMWV,
    VHW: NMEA0183Parser.parseVHW,
    HDG: NMEA0183Parser.parseHDG,
    VDM: NMEA0183Parser.parseVDM,
    VDO: NMEA0183Parser.parseVDO
  };

  parse(sentence: string): NMEA0183Message | null {
    const trimmed = sentence.trim();

    if (!this.validate(trimmed)) {
      return null;
    }

    const checksumIndex = trimmed.indexOf(NMEA0183Parser.CHECKSUM_DELIMITER);
    const raw = checksumIndex > 0 ? trimmed.substring(0, checksumIndex) : trimmed;
    const checksum = checksumIndex > 0 ? trimmed.substring(checksumIndex + 1) : '';

    const content = raw.substring(1);
    const fields = content.split(NMEA0183Parser.FIELD_DELIMITER);
    const sentenceId = fields[0];

    return {
      sentenceId,
      fields: fields.slice(1),
      checksum,
      raw: trimmed
    };
  }

  validate(sentence: string): boolean {
    const trimmed = sentence.trim();

    if (!trimmed.startsWith(NMEA0183Parser.SENTENCE_START)) {
      return false;
    }

    const checksumIndex = trimmed.indexOf(NMEA0183Parser.CHECKSUM_DELIMITER);

    if (checksumIndex > 0) {
      const data = trimmed.substring(1, checksumIndex);
      const providedChecksum = trimmed.substring(checksumIndex + 1).toUpperCase();
      const calculatedChecksum = this.calculateChecksum(data);

      if (providedChecksum !== calculatedChecksum) {
        return false;
      }
    }

    const content = trimmed.startsWith(NMEA0183Parser.CHECKSUM_DELIMITER)
      ? trimmed.substring(2)
      : trimmed.substring(1);

    const firstComma = content.indexOf(NMEA0183Parser.FIELD_DELIMITER);
    const sentenceId = firstComma > 0 ? content.substring(0, firstComma) : content;

    return sentenceId in NMEA0183Parser.SUPPORTED_SENTENCES;
  }

  calculateChecksum(sentence: string): string {
    let checksum = 0;
    const data = sentence.startsWith(NMEA0183Parser.SENTENCE_START)
      ? sentence.substring(1)
      : sentence;

    const checksumIndex = data.indexOf(NMEA0183Parser.CHECKSUM_DELIMITER);
    const dataToCheck = checksumIndex > 0 ? data.substring(0, checksumIndex) : data;

    for (let i = 0; i < dataToCheck.length; i++) {
      checksum ^= dataToCheck.charCodeAt(i);
    }

    return checksum.toString(16).toUpperCase().padStart(2, '0');
  }

  parseToInstrumentData(message: NMEA0183Message): InstrumentData | null {
    const parser = NMEA0183Parser.SUPPORTED_SENTENCES[message.sentenceId];
    if (!parser) {
      return null;
    }
    return parser(message.fields);
  }

  private static parseGGA(fields: string[]): InstrumentData | null {
    if (fields.length < 9) return null;

    const latitude = NMEA0183Parser.parseLatitude(fields[1], fields[2]);
    const longitude = NMEA0183Parser.parseLongitude(fields[3], fields[4]);

    if (latitude === null || longitude === null) return null;

    const position: Position = {
      latitude,
      longitude,
      accuracy: parseFloat(fields[8]) || 0,
      timestamp: Date.now()
    };

    return {
      type: InstrumentDataType.GPS,
      value: position,
      unit: '',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  private static parseRMC(fields: string[]): InstrumentData | null {
    if (fields.length < 10) return null;

    const latitude = NMEA0183Parser.parseLatitude(fields[2], fields[3]);
    const longitude = NMEA0183Parser.parseLongitude(fields[4], fields[5]);

    if (latitude === null || longitude === null) return null;

    const position: Position = {
      latitude,
      longitude,
      accuracy: 0,
      timestamp: Date.now()
    };

    const speedKnots = parseFloat(fields[6]) || 0;
    const course = parseFloat(fields[7]) || 0;

    return {
      type: InstrumentDataType.GPS,
      value: { position, speedKnots, course, valid: fields[1] === 'A' },
      unit: '',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  private static parseGLL(fields: string[]): InstrumentData | null {
    if (fields.length < 5) return null;

    const latitude = NMEA0183Parser.parseLatitude(fields[0], fields[1]);
    const longitude = NMEA0183Parser.parseLongitude(fields[2], fields[3]);

    if (latitude === null || longitude === null) return null;

    return {
      type: InstrumentDataType.GPS,
      value: { latitude, longitude },
      unit: '',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  private static parseVTG(fields: string[]): InstrumentData | null {
    if (fields.length < 8) return null;

    const course = parseFloat(fields[0]);
    const speedKnots = parseFloat(fields[4]);

    return {
      type: InstrumentDataType.Speed,
      value: { course, speedKnots },
      unit: 'kn',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  private static parseDBT(fields: string[]): InstrumentData | null {
    if (fields.length < 3) return null;

    const depthFeet = parseFloat(fields[0]);
    const depthMeters = parseFloat(fields[3]);

    return {
      type: InstrumentDataType.Depth,
      value: depthMeters !== undefined && !isNaN(depthMeters) ? depthMeters : depthFeet * 0.3048,
      unit: 'm',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  private static parseDPT(fields: string[]): InstrumentData | null {
    if (fields.length < 2) return null;

    const depthMeters = parseFloat(fields[0]);
    const offset = parseFloat(fields[1]) || 0;

    return {
      type: InstrumentDataType.Depth,
      value: depthMeters + offset,
      unit: 'm',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  private static parseMWV(fields: string[]): InstrumentData | null {
    if (fields.length < 4) return null;

    const angle = parseFloat(fields[0]);
    const speed = parseFloat(fields[2]);
    const unit = fields[3];

    if (fields[1] === 'R') {
      return {
        type: InstrumentDataType.Wind,
        value: { angle, speed, unit },
        unit: unit === 'K' ? 'km/h' : unit === 'M' ? 'm/s' : 'kn',
        timestamp: Date.now(),
        source: 'nmea0183'
      };
    }

    return null;
  }

  private static parseVHW(fields: string[]): InstrumentData | null {
    if (fields.length < 6) return null;

    const speedKnots = parseFloat(fields[3]);
    const heading = parseFloat(fields[0]);

    return {
      type: InstrumentDataType.Speed,
      value: { speedKnots, heading },
      unit: 'kn',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  private static parseHDG(fields: string[]): InstrumentData | null {
    if (fields.length < 3) return null;

    const heading = parseFloat(fields[0]);
    const deviation = parseFloat(fields[1]) || 0;
    const variation = parseFloat(fields[2]) || 0;

    return {
      type: InstrumentDataType.Heading,
      value: { heading, deviation, variation },
      unit: 'deg',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  private static parseVDM(fields: string[]): InstrumentData | null {
    if (fields.length < 5) return null;

    const totalFragments = parseInt(fields[0], 10);
    const fragmentNumber = parseInt(fields[1], 10);
    const sequenceId = fields[2];
    const channel = fields[3];
    const payload = fields[4];

    return {
      type: InstrumentDataType.AIS,
      value: {
        totalFragments,
        fragmentNumber,
        sequenceId,
        channel,
        payload,
        raw: fields.slice(5).join(',')
      },
      unit: '',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  private static parseVDO(fields: string[]): InstrumentData | null {
    return NMEA0183Parser.parseVDM(fields);
  }

  private static parseLatitude(lat: string, dir: string): number | null {
    if (!lat || !dir) return null;

    const degrees = parseInt(lat.substring(0, 2), 10);
    const minutes = parseFloat(lat.substring(2));

    if (isNaN(degrees) || isNaN(minutes)) return null;

    let decimal = degrees + minutes / 60;
    if (dir === 'S') decimal = -decimal;

    return decimal;
  }

  private static parseLongitude(lon: string, dir: string): number | null {
    if (!lon || !dir) return null;

    const degrees = parseInt(lon.substring(0, 3), 10);
    const minutes = parseFloat(lon.substring(3));

    if (isNaN(degrees) || isNaN(minutes)) return null;

    let decimal = degrees + minutes / 60;
    if (dir === 'W') decimal = -decimal;

    return decimal;
  }
}
