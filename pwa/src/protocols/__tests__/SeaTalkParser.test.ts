import { describe, it, expect, beforeEach } from 'vitest';
import { SeaTalkParser } from '../SeaTalkParser';
import { InstrumentDataType } from '../../models';

/** Parse one datagram given as hex bytes, e.g. "00 02 00 7B 00" */
function decode(parser: SeaTalkParser, hex: string) {
  const bytes = new Uint8Array(hex.split(' ').map((b) => parseInt(b, 16)));
  const message = parser.parse(bytes);
  return message ? parser.parseToInstrumentData(message) : null;
}

describe('SeaTalkParser', () => {
  let parser: SeaTalkParser;

  beforeEach(() => {
    parser = new SeaTalkParser();
  });

  describe('datagram framing', () => {
    it('takes the length from the attribute byte', () => {
      expect(SeaTalkParser.datagramLength(new Uint8Array([0x00, 0x02]))).toBe(5);
      expect(SeaTalkParser.datagramLength(new Uint8Array([0x84, 0x86]))).toBe(9);
      expect(SeaTalkParser.datagramLength(new Uint8Array([0x53, 0x00]))).toBe(3);
    });

    it('rejects a datagram shorter than its attribute says', () => {
      expect(parser.parse(new Uint8Array([0x00, 0x02, 0x00, 0x7b]))).toBeNull();
      expect(parser.parse(new Uint8Array([0x00]))).toBeNull();
      expect(parser.parse(new Uint8Array([]))).toBeNull();
    });

    it('returns the command and the bytes after it', () => {
      const message = parser.parse(new Uint8Array([0x20, 0x01, 0x41, 0x00]));
      expect(message?.command).toBe(0x20);
      expect(Array.from(message!.data)).toEqual([0x01, 0x41, 0x00]);
    });

    it('extracts the command byte', () => {
      expect(parser.getCommandByte(new Uint8Array([0x84, 0x06]))).toBe(0x84);
      expect(parser.getCommandByte(new Uint8Array([]))).toBe(0);
    });

    it('gives no instrument data for an unsupported command', () => {
      const message = parser.parse(new Uint8Array([0x30, 0x00, 0x0c]));
      expect(message).not.toBeNull();
      expect(parser.parseToInstrumentData(message!)).toBeNull();
    });
  });

  it('00: depth below transducer in tenths of feet, as metres', () => {
    // 0x007B = 123 → 12.3 ft
    const data = decode(parser, '00 02 00 7B 00');
    expect(data?.type).toBe(InstrumentDataType.Depth);
    expect(data?.unit).toBe('m');
    expect((data?.value as { depth: number }).depth).toBeCloseTo(12.3 * 0.3048);
  });

  it('00: reads the shallow and deep alarm flags', () => {
    const value = decode(parser, '00 02 03 10 00')?.value as Record<string, boolean>;
    expect(value.shallowAlarm).toBe(true);
    expect(value.deepAlarm).toBe(true);
  });

  it('10: apparent wind angle in half degrees, most significant byte first', () => {
    // 0x0109 = 265 → 132.5°
    const data = decode(parser, '10 01 01 09');
    expect(data?.type).toBe(InstrumentDataType.Wind);
    expect(data?.value).toEqual({ angle: 132.5, reference: 'apparent' });
  });

  it('11: apparent wind speed in knots, or m/s with the high bit set', () => {
    expect(decode(parser, '11 01 0E 03')).toMatchObject({
      value: { speed: 14.3, reference: 'apparent' },
      unit: 'kn',
    });
    expect(decode(parser, '11 01 87 05')).toMatchObject({ value: { speed: 7.5 }, unit: 'm/s' });
  });

  it('20: speed through water in tenths of knots', () => {
    const data = decode(parser, '20 01 41 00');
    expect(data?.type).toBe(InstrumentDataType.Speed);
    expect(data?.value).toEqual({ speed: 6.5 });
    expect(data?.unit).toBe('kn');
  });

  it('23 and 27: water temperature in °C', () => {
    expect(decode(parser, '23 01 0E 39')?.value).toEqual({ temperature: 14 });
    // (0x0122 - 100) / 10 = 19.0
    expect(decode(parser, '27 01 22 01')?.value).toEqual({ temperature: 19 });
  });

  it('50 + 51: a position once both latitude and longitude arrived', () => {
    // 51° 59.55' N: 0x1743 = 5955
    expect(decode(parser, '50 02 33 43 17')).toBeNull();
    // 4° 4.95' E: 0x01EF = 495 with the east bit
    const data = decode(parser, '51 02 04 EF 81');
    expect(data?.type).toBe(InstrumentDataType.GPS);
    const { position } = data?.value as { position: { latitude: number; longitude: number } };
    expect(position.latitude).toBeCloseTo(51 + 59.55 / 60, 6);
    expect(position.longitude).toBeCloseTo(4 + 4.95 / 60, 6);
  });

  it('50 + 51: south and west are negative', () => {
    decode(parser, '50 02 21 43 97');
    const data = decode(parser, '51 02 46 EF 01');
    const { position } = data?.value as { position: { latitude: number; longitude: number } };
    expect(position.latitude).toBeCloseTo(-(33 + 59.55 / 60), 6);
    expect(position.longitude).toBeCloseTo(-(70 + 4.95 / 60), 6);
  });

  it('52: speed over ground in tenths of knots', () => {
    expect(decode(parser, '52 01 3C 00')?.value).toEqual({ speedKnots: 6 });
  });

  it('89: compass heading, magnetic', () => {
    // U = 0xB: 3 * 90 + 0 * 2 + 8 / 8 = 271
    const data = decode(parser, '89 B2 00 00 20');
    expect(data?.type).toBe(InstrumentDataType.Heading);
    expect(data?.value).toEqual({ heading: 271, deviation: 0, variation: 0 });
  });

  it('9C: compass heading with rudder position', () => {
    // U = 0x1: 90 + 0x16 * 2 = 134
    expect((decode(parser, '9C 11 16 00')?.value as { heading: number }).heading).toBe(134);
  });

  it('84: autopilot compass heading', () => {
    // U = 0x2 with 0x4: 180 + 0x0A * 2 + 1 = 201
    const data = decode(parser, '84 66 0A 00 00 00 00 00 00');
    expect((data?.value as { heading: number }).heading).toBe(201);
  });

  it('99: variation is applied to later headings and COG, west positive on the wire', () => {
    // 0xFD = -3: 3° east
    expect(decode(parser, '99 00 FD')).toBeNull();
    expect(decode(parser, '89 B2 00 00 20')?.value).toEqual({
      heading: 271,
      deviation: 0,
      variation: 3,
    });
    // 53: magnetic COG 271 → 274 true
    expect(decode(parser, '53 B0 00')?.value).toEqual({ course: 274, reference: 'true' });
  });

  it('53: COG stays magnetic while the variation is unknown', () => {
    expect(decode(parser, '53 B0 00')?.value).toEqual({ course: 271, reference: 'magnetic' });
  });
});
