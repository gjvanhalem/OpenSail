import { describe, it, expect } from 'vitest';
import { NMEA0183Parser } from '@/protocols/NMEA0183Parser';
import { InstrumentDataType, type InstrumentData } from '@/models';
import { normalizeNavigationData, hasNavigationValues } from '../navigationNormalization';

const MS_TO_KNOTS = 3600 / 1852;
const nmea = new NMEA0183Parser();

function fromSentence(body: string) {
  const sentence = `$${body}*${nmea.calculateChecksum(body)}`;
  const message = nmea.parse(sentence);
  if (!message) throw new Error(`could not parse ${sentence}`);
  const data = nmea.parseToInstrumentData(message);
  if (!data) throw new Error(`no instrument data for ${sentence}`);
  return normalizeNavigationData(data);
}

function reading(type: InstrumentData['type'], value: unknown, unit = ''): InstrumentData {
  return { type, value, unit, timestamp: 1000, source: 'test' };
}

describe('normalizeNavigationData: NMEA 0183', () => {
  it('GGA gives a position', () => {
    const nav = fromSentence('GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,');
    expect(nav.position?.latitude).toBeCloseTo(48.1173);
    expect(nav.position?.longitude).toBeCloseTo(11.5167);
    expect(nav.position?.altitude).toBeCloseTo(545.4);
  });

  it('GGA without a fix gives nothing', () => {
    const message = nmea.parse(
      `$GPGGA,123519,4807.038,N,01131.000,E,0,00,,,M,,M,,*${nmea.calculateChecksum('GPGGA,123519,4807.038,N,01131.000,E,0,00,,,M,,M,,')}`
    );
    expect(nmea.parseToInstrumentData(message!)).toBeNull();
  });

  it('RMC gives position, course and speed over ground', () => {
    const nav = fromSentence('GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W');
    expect(nav.position?.latitude).toBeCloseTo(48.1173);
    expect(nav.course).toBeCloseTo(84.4);
    expect(nav.speedOverGround).toBeCloseTo(22.4);
  });

  it('RMC with an empty course (not moving) gives no course', () => {
    const nav = fromSentence('GPRMC,123519,A,4807.038,N,01131.000,E,0.0,,230394,,');
    expect(nav.course).toBeUndefined();
    expect(nav.speedOverGround).toBe(0);
  });

  it('RMC with status V (void) gives nothing', () => {
    const nav = fromSentence('GPRMC,123519,V,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W');
    expect(hasNavigationValues(nav)).toBe(false);
  });

  it('GLL gives a position, south and west negative', () => {
    const nav = fromSentence('GPGLL,3723.2475,S,12158.3416,W,161229.487,A,A');
    expect(nav.position?.latitude).toBeCloseTo(-37.3875);
    expect(nav.position?.longitude).toBeCloseTo(-121.9724);
  });

  it('VTG gives course and speed over ground', () => {
    const nav = fromSentence('GPVTG,054.7,T,034.4,M,005.5,N,010.2,K');
    expect(nav).toEqual({ course: 54.7, speedOverGround: 5.5 });
  });

  it('HDG corrects the magnetic heading with deviation and variation', () => {
    // 98.3 magnetic, 2.0 E deviation, 3.5 W variation: 96.8 true
    const nav = fromSentence('HCHDG,98.3,2.0,E,3.5,W');
    expect(nav.heading).toBeCloseTo(96.8);
  });

  it('HDT gives a true heading', () => {
    expect(fromSentence('HEHDT,274.1,T').heading).toBeCloseTo(274.1);
  });

  it('VHW gives the true heading when present', () => {
    expect(fromSentence('VWVHW,045.0,T,043.0,M,6.5,N,12.0,K').heading).toBeCloseTo(45);
    expect(fromSentence('VWVHW,,T,,M,6.5,N,12.0,K').heading).toBeUndefined();
  });

  it('depth and wind carry no navigation values', () => {
    expect(hasNavigationValues(fromSentence('SDDBT,40.0,f,12.2,M,6.6,F'))).toBe(false);
  });
});

describe('normalizeNavigationData: NMEA 2000 and SeaTalk shapes', () => {
  it('PGN 129025 position', () => {
    const nav = normalizeNavigationData(
      reading(InstrumentDataType.GPS, {
        position: { latitude: 52.1, longitude: 4.3, accuracy: 0, timestamp: 5 },
      })
    );
    expect(nav.position).toEqual({ latitude: 52.1, longitude: 4.3, accuracy: 0, timestamp: 5 });
  });

  it('PGN 129026 COG/SOG converts m/s to knots', () => {
    const nav = normalizeNavigationData(
      reading(InstrumentDataType.GPS, { course: 180, speed: 3, reference: 'true' }, 'deg, m/s')
    );
    expect(nav.course).toBe(180);
    expect(nav.speedOverGround).toBeCloseTo(3 * MS_TO_KNOTS);
  });

  it('ignores magnetic COG', () => {
    const nav = normalizeNavigationData(
      reading(InstrumentDataType.GPS, { course: 180, speed: 3, reference: 'magnetic' }, 'deg, m/s')
    );
    expect(nav.course).toBeUndefined();
    expect(nav.speedOverGround).toBeCloseTo(3 * MS_TO_KNOTS);
  });

  it('PGN 127250 true heading is used as is', () => {
    const nav = normalizeNavigationData(
      reading(InstrumentDataType.Heading, {
        heading: 10,
        deviation: 5,
        variation: 5,
        reference: 'true',
      })
    );
    expect(nav.heading).toBe(10);
  });

  it('a magnetic heading wraps around 360', () => {
    const nav = normalizeNavigationData(
      reading(InstrumentDataType.Heading, { heading: 358, deviation: 1, variation: 3 })
    );
    expect(nav.heading).toBeCloseTo(2);
  });

  it('rate of turn carries no heading', () => {
    expect(
      normalizeNavigationData(reading(InstrumentDataType.Heading, { rateOfTurn: 3 }))
    ).toEqual({});
  });

  it('rejects out-of-range positions', () => {
    const nav = normalizeNavigationData(
      reading(InstrumentDataType.GPS, { position: { latitude: 214, longitude: 0 } })
    );
    expect(nav.position).toBeUndefined();
  });
});
