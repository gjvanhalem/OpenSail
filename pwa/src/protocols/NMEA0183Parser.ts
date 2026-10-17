import type { NMEA0183Message, Position, InstrumentData } from '../models';
import { InstrumentDataType } from '../models';

export class NMEA0183Parser {
  private static readonly SENTENCE_START = '$';
  // Encapsulated sentences (e.g. AIS !AIVDM) start with '!'
  private static readonly ENCAPSULATED_START = '!';
  // Sentence IDs are a 2-char talker ID (GP, SD, AI, ...) followed by the 3-char type
  private static readonly TALKER_ID_LENGTH = 2;
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
    HDM: NMEA0183Parser.parseHDM,
    HDT: NMEA0183Parser.parseHDT,
    RSA: NMEA0183Parser.parseRSA,
    XDR: NMEA0183Parser.parseXDR,
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

    if (
      !trimmed.startsWith(NMEA0183Parser.SENTENCE_START) &&
      !trimmed.startsWith(NMEA0183Parser.ENCAPSULATED_START)
    ) {
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

    const content = trimmed.substring(1);
    const firstComma = content.indexOf(NMEA0183Parser.FIELD_DELIMITER);
    const sentenceId = firstComma > 0 ? content.substring(0, firstComma) : content;

    return NMEA0183Parser.getSentenceType(sentenceId) in NMEA0183Parser.SUPPORTED_SENTENCES;
  }

  /** Strip the talker ID, e.g. "GPGGA" -> "GGA", "AIVDM" -> "VDM". */
  static getSentenceType(sentenceId: string): string {
    return sentenceId.substring(NMEA0183Parser.TALKER_ID_LENGTH);
  }

  calculateChecksum(sentence: string): string {
    let checksum = 0;
    const data =
      sentence.startsWith(NMEA0183Parser.SENTENCE_START) ||
      sentence.startsWith(NMEA0183Parser.ENCAPSULATED_START)
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
    const parser = NMEA0183Parser.SUPPORTED_SENTENCES[
      NMEA0183Parser.getSentenceType(message.sentenceId)
    ];
    if (!parser) {
      return null;
    }
    return parser(message.fields);
  }

  private static parseGGA(fields: string[]): InstrumentData | null {
    if (fields.length < 9) return null;
    // Fix quality 0: no fix, the position fields are stale or empty
    if (fields[5] === '0') return null;

    const latitude = NMEA0183Parser.parseLatitude(fields[1], fields[2]);
    const longitude = NMEA0183Parser.parseLongitude(fields[3], fields[4]);

    if (latitude === null || longitude === null) return null;

    const position: Position = {
      latitude,
      longitude,
      accuracy: parseFloat(fields[7]) || 0, // HDOP
      timestamp: Date.now(),
      ...(Number.isFinite(parseFloat(fields[8])) ? { altitude: parseFloat(fields[8]) } : {})
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

    // Course is empty when the vessel is not moving
    const speedKnots = NMEA0183Parser.optionalNumber(fields[6]);
    const course = NMEA0183Parser.optionalNumber(fields[7]);
    // Magnetic variation, east positive, when the receiver sends it
    const variationValue = NMEA0183Parser.optionalNumber(fields[9]);
    const variation =
      variationValue === undefined ? undefined : variationValue * (fields[10]?.startsWith('W') ? -1 : 1);

    return {
      type: InstrumentDataType.GPS,
      value: {
        position,
        speedKnots,
        course,
        valid: fields[1] === 'A',
        ...(variation !== undefined && { variation }),
      },
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

    // $--DBT,feet,f,meters,M,fathoms,F
    const depthFeet = parseFloat(fields[0]);
    const depthMeters = parseFloat(fields[2]);

    return {
      type: InstrumentDataType.Depth,
      value: !isNaN(depthMeters) ? depthMeters : depthFeet * 0.3048,
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

    // $--MWV,angle,R|T,speed,unit,status
    const angle = parseFloat(fields[0]);
    const reference = fields[1];
    const speed = parseFloat(fields[2]);
    const unit = fields[3];

    if (fields[4] === 'V') return null;

    if (reference === 'R' || reference === 'T') {
      return {
        type: InstrumentDataType.Wind,
        value: { angle, speed, unit, reference },
        unit: unit === 'K' ? 'km/h' : unit === 'M' ? 'm/s' : 'kn',
        timestamp: Date.now(),
        source: 'nmea0183'
      };
    }

    return null;
  }

  private static parseVHW(fields: string[]): InstrumentData | null {
    if (fields.length < 6) return null;

    // $--VHW,headingTrue,T,headingMag,M,knots,N,kmh,K
    const speedKnots = parseFloat(fields[4]);
    const heading = parseFloat(fields[0]);

    return {
      type: InstrumentDataType.Speed,
      value: { speedKnots, heading },
      unit: 'kn',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  private static parseHDT(fields: string[]): InstrumentData | null {
    if (fields.length < 1) return null;

    // $--HDT,heading,T
    const heading = parseFloat(fields[0]);
    if (!Number.isFinite(heading)) return null;

    return {
      type: InstrumentDataType.Heading,
      value: { heading, reference: 'true' },
      unit: 'deg',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  /** A numeric field, or undefined when it is empty */
  private static optionalNumber(field: string | undefined): number | undefined {
    const value = parseFloat(field ?? '');
    return Number.isFinite(value) ? value : undefined;
  }

  private static parseHDG(fields: string[]): InstrumentData | null {
    if (fields.length < 3) return null;

    // $--HDG,heading,deviation,E|W,variation,E|W (west is negative)
    const heading = parseFloat(fields[0]);
    const deviation = (parseFloat(fields[1]) || 0) * (fields[2] === 'W' ? -1 : 1);
    // An empty variation is unknown, not zero: the magnetic variation setting fills it in
    const variationValue = NMEA0183Parser.optionalNumber(fields[3]);
    const variation =
      variationValue === undefined ? undefined : variationValue * (fields[4] === 'W' ? -1 : 1);

    return {
      type: InstrumentDataType.Heading,
      value: { heading, deviation, ...(variation !== undefined && { variation }) },
      unit: 'deg',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  // $--HDM,heading,M: magnetic heading without deviation or variation (pypilot sends $APHDM)
  private static parseHDM(fields: string[]): InstrumentData | null {
    const heading = NMEA0183Parser.optionalNumber(fields[0]);
    if (heading === undefined) return null;
    return {
      type: InstrumentDataType.Heading,
      value: { heading, reference: 'magnetic' },
      unit: 'deg',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  // $--RSA,starboard,A|V,port,A|V: rudder angle, starboard (or single) rudder first;
  // negative is to port
  private static parseRSA(fields: string[]): InstrumentData | null {
    const starboard = NMEA0183Parser.optionalNumber(fields[0]);
    const port = NMEA0183Parser.optionalNumber(fields[2]);
    const angle =
      starboard !== undefined && fields[1] === 'A'
        ? starboard
        : port !== undefined && fields[3] === 'A'
          ? port
          : undefined;
    if (angle === undefined) return null;
    return {
      type: InstrumentDataType.Rudder,
      value: { angle },
      unit: 'deg',
      timestamp: Date.now(),
      source: 'nmea0183'
    };
  }

  // $--XDR,type,value,unit,name,... in groups of four. Only the angular
  // measurements for heel (ROLL/HEEL) and pitch (PTCH/PITCH) are used, as
  // pypilot sends them: $APXDR,A,1.2,D,PTCH,A,-3.4,D,ROLL
  private static parseXDR(fields: string[]): InstrumentData | null {
    let heel: number | undefined;
    let pitch: number | undefined;
    for (let i = 0; i < fields.length; i += 4) {
      const [type, rawValue, unit, name = ''] = fields.slice(i, i + 4);
      const value = NMEA0183Parser.optionalNumber(rawValue);
      if (type !== 'A' || unit !== 'D' || value === undefined) continue;
      const transducer = name.toUpperCase();
      if (transducer === 'ROLL' || transducer === 'HEEL') heel = value;
      else if (transducer === 'PTCH' || transducer === 'PITCH') pitch = value;
    }
    if (heel === undefined && pitch === undefined) return null;
    return {
      type: InstrumentDataType.Attitude,
      value: { ...(heel !== undefined && { heel }), ...(pitch !== undefined && { pitch }) },
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
