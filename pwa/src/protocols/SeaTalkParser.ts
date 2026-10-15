import type { SeaTalkMessage, InstrumentData } from '../models';
import { InstrumentDataType } from '../models';

/**
 * SeaTalk (SeaTalk1, Raymarine) parser.
 *
 * Input is one datagram as bytes: command, attribute, data. The low nibble of
 * the attribute byte is the number of data bytes after the first one, so a
 * datagram is 3 + (attribute & 0x0F) bytes long. 16-bit values are LSB first,
 * except the apparent wind angle. Formats follow Thomas Knauf's SeaTalk
 * reference (http://www.thomasknauf.de/seatalk.htm).
 *
 * Latitude and longitude come in separate datagrams (0x50, 0x51), and magnetic
 * variation in its own (0x99), so the parser keeps them between datagrams.
 */
export class SeaTalkParser {
  private static readonly FEET_TO_METERS = 0.3048;

  private latitude: number | null = null;
  private longitude: number | null = null;
  /** Magnetic variation in degrees, east positive, once a 0x99 datagram arrived */
  private variation: number | null = null;

  private readonly handlers: Record<number, (data: Uint8Array) => InstrumentData | null> = {
    0x00: (d) => this.parseDepth(d),
    0x10: (d) => this.parseApparentWindAngle(d),
    0x11: (d) => this.parseApparentWindSpeed(d),
    0x20: (d) => this.parseSpeedThroughWater(d),
    0x23: (d) => this.parseWaterTemperature(d),
    0x27: (d) => this.parsePreciseWaterTemperature(d),
    0x50: (d) => this.parseLatitude(d),
    0x51: (d) => this.parseLongitude(d),
    0x52: (d) => this.parseSpeedOverGround(d),
    0x53: (d) => this.parseCourseOverGround(d),
    0x84: (d) => this.parseAutopilotHeading(d),
    0x89: (d) => this.parseCompassHeading(d),
    0x99: (d) => this.parseVariation(d),
    0x9c: (d) => this.parseCompassHeading(d)
  };

  /** Length in bytes of the datagram that starts with these bytes */
  static datagramLength(data: Uint8Array): number {
    return data.length < 2 ? 0 : 3 + (data[1] & 0x0f);
  }

  parse(data: Uint8Array): SeaTalkMessage | null {
    if (data.length < 3 || data.length < SeaTalkParser.datagramLength(data)) return null;

    const datagram = data.slice(0, SeaTalkParser.datagramLength(data));
    return {
      command: this.getCommandByte(datagram),
      // The whole datagram: attribute byte and data, after the command
      data: datagram.slice(1),
      timestamp: Date.now()
    };
  }

  getCommandByte(data: Uint8Array): number {
    if (data.length < 1) return 0;
    return data[0];
  }

  parseToInstrumentData(message: SeaTalkMessage): InstrumentData | null {
    const handler = this.handlers[message.command];
    if (!handler) return null;
    // Handlers index the full datagram, command byte included
    const datagram = new Uint8Array(message.data.length + 1);
    datagram[0] = message.command;
    datagram.set(message.data, 1);
    return handler(datagram);
  }

  /**
   * Compass heading as used by 0x84, 0x89, 0x9C and 0x53:
   * (U & 0x3) * 90 + (VW & 0x3F) * 2, plus the high bits of U for the odd degrees.
   */
  private static heading(u: number, vw: number, autopilot = false): number {
    const base = (u & 0x3) * 90 + (vw & 0x3f) * 2;
    const high = u & 0xc;
    if (autopilot) return base + (high ? (high === 0xc ? 2 : 1) : 0);
    return base + high / 8;
  }

  private static result(
    type: InstrumentData['type'],
    value: unknown,
    unit: string
  ): InstrumentData {
    return { type, value, unit, timestamp: Date.now(), source: 'seatalk' };
  }

  // 00 02 YZ XX XX: depth below transducer XXXX/10 feet; Z&1 shallow, Z&2 deep alarm
  private parseDepth(d: Uint8Array): InstrumentData | null {
    if (d.length < 5) return null;
    const feet = (d[3] | (d[4] << 8)) / 10;
    return SeaTalkParser.result(
      InstrumentDataType.Depth,
      {
        depth: feet * SeaTalkParser.FEET_TO_METERS,
        shallowAlarm: (d[2] & 0x01) !== 0,
        deepAlarm: (d[2] & 0x02) !== 0
      },
      'm'
    );
  }

  // 10 01 XX YY: apparent wind angle XXYY/2 degrees right of the bow (MSB first)
  private parseApparentWindAngle(d: Uint8Array): InstrumentData | null {
    if (d.length < 4) return null;
    const angle = ((d[2] << 8) | d[3]) / 2;
    return SeaTalkParser.result(InstrumentDataType.Wind, { angle, reference: 'apparent' }, 'deg');
  }

  // 11 01 XX 0Y: apparent wind speed (XX & 0x7F) + Y/10 knots, m/s when XX & 0x80
  private parseApparentWindSpeed(d: Uint8Array): InstrumentData | null {
    if (d.length < 4) return null;
    const speed = (d[2] & 0x7f) + (d[3] & 0x0f) / 10;
    const unit = d[2] & 0x80 ? 'm/s' : 'kn';
    return SeaTalkParser.result(InstrumentDataType.Wind, { speed, reference: 'apparent' }, unit);
  }

  // 20 01 XX XX: speed through water XXXX/10 knots
  private parseSpeedThroughWater(d: Uint8Array): InstrumentData | null {
    if (d.length < 4) return null;
    const speed = (d[2] | (d[3] << 8)) / 10;
    return SeaTalkParser.result(InstrumentDataType.Speed, { speed }, 'kn');
  }

  // 23 Z1 XX YY: water temperature XX °C, YY °F; Z&4 sensor defective
  private parseWaterTemperature(d: Uint8Array): InstrumentData | null {
    if (d.length < 4 || (d[1] & 0x40) !== 0) return null;
    const temperature = d[2] << 24 >> 24; // signed byte
    return SeaTalkParser.result(InstrumentDataType.Temperature, { temperature }, 'C');
  }

  // 27 01 XX XX: water temperature (XXXX - 100) / 10 °C
  private parsePreciseWaterTemperature(d: Uint8Array): InstrumentData | null {
    if (d.length < 4) return null;
    const temperature = ((d[2] | (d[3] << 8)) - 100) / 10;
    return SeaTalkParser.result(InstrumentDataType.Temperature, { temperature }, 'C');
  }

  /** Degrees XX and minutes (YYYY & 0x7FFF)/100; bit 15 of YYYY is the hemisphere */
  private static coordinate(d: Uint8Array): { degrees: number; flag: boolean } {
    const yyyy = d[3] | (d[4] << 8);
    return { degrees: d[2] + (yyyy & 0x7fff) / 100 / 60, flag: (yyyy & 0x8000) !== 0 };
  }

  // 50 Z2 XX YY YY: latitude, south when the flag is set
  private parseLatitude(d: Uint8Array): InstrumentData | null {
    if (d.length < 5) return null;
    const { degrees, flag } = SeaTalkParser.coordinate(d);
    this.latitude = flag ? -degrees : degrees;
    return this.positionResult();
  }

  // 51 Z2 XX YY YY: longitude, east when the flag is set
  private parseLongitude(d: Uint8Array): InstrumentData | null {
    if (d.length < 5) return null;
    const { degrees, flag } = SeaTalkParser.coordinate(d);
    this.longitude = flag ? degrees : -degrees;
    return this.positionResult();
  }

  private positionResult(): InstrumentData | null {
    if (this.latitude === null || this.longitude === null) return null;
    return SeaTalkParser.result(
      InstrumentDataType.GPS,
      {
        position: {
          latitude: this.latitude,
          longitude: this.longitude,
          accuracy: 0,
          timestamp: Date.now()
        }
      },
      ''
    );
  }

  // 52 01 XX XX: speed over ground XXXX/10 knots
  private parseSpeedOverGround(d: Uint8Array): InstrumentData | null {
    if (d.length < 4) return null;
    const speedKnots = (d[2] | (d[3] << 8)) / 10;
    return SeaTalkParser.result(InstrumentDataType.GPS, { speedKnots }, 'kn');
  }

  // 53 U0 VW: magnetic course over ground; made true once the variation is known
  private parseCourseOverGround(d: Uint8Array): InstrumentData | null {
    if (d.length < 3) return null;
    const magnetic = SeaTalkParser.heading(d[1] >> 4, d[2]);
    const course =
      this.variation === null ? magnetic : (magnetic + this.variation + 360) % 360;
    return SeaTalkParser.result(
      InstrumentDataType.GPS,
      { course, reference: this.variation === null ? 'magnetic' : 'true' },
      'deg'
    );
  }

  private headingResult(heading: number): InstrumentData {
    return SeaTalkParser.result(
      InstrumentDataType.Heading,
      { heading, deviation: 0, variation: this.variation ?? 0 },
      'deg'
    );
  }

  // 89 U2 VW XY 2Z (ST40 compass) and 9C U1 VW RR (compass and rudder): magnetic heading
  private parseCompassHeading(d: Uint8Array): InstrumentData | null {
    if (d.length < 3) return null;
    return this.headingResult(SeaTalkParser.heading(d[1] >> 4, d[2]));
  }

  // 84 U6 VW XY 0Z 0M RR SS TT: autopilot compass heading
  private parseAutopilotHeading(d: Uint8Array): InstrumentData | null {
    if (d.length < 3) return null;
    return this.headingResult(SeaTalkParser.heading(d[1] >> 4, d[2], true));
  }

  // 99 00 XX: magnetic variation, signed, positive is west
  private parseVariation(d: Uint8Array): InstrumentData | null {
    if (d.length < 3) return null;
    this.variation = -((d[2] << 24) >> 24);
    return null;
  }
}
