import { describe, expect, it } from 'vitest';
import { NMEA0183Parser } from '../NMEA0183Parser';
import { InstrumentDataType } from '@/models';
import { normalizeNavigationData } from '@/store/slices/navigationNormalization';
import { normalizeInstrumentData } from '@/store/slices/instrumentNormalization';

const parser = new NMEA0183Parser();

/** A sentence with a correct checksum */
function sentence(body: string): string {
  return `$${body}*${parser.calculateChecksum(body)}`;
}

function parse(body: string) {
  const message = parser.parse(sentence(body));
  return message ? parser.parseToInstrumentData(message) : null;
}

// What a Pcnautic / pypilot autopilot sends on TCP port 20220
describe('autopilot sentences (pypilot)', () => {
  it('HDM: a magnetic heading, made true with the variation setting', () => {
    const data = parse('APHDM,123.4,M');
    expect(data?.type).toBe(InstrumentDataType.Heading);
    expect(data?.value).toEqual({ heading: 123.4, reference: 'magnetic' });
    expect(normalizeNavigationData(data!, 2.5).heading).toBeCloseTo(125.9);
    expect(normalizeNavigationData(data!, -3).heading).toBeCloseTo(120.4);
    expect(normalizeNavigationData(data!).heading).toBeCloseTo(123.4);
  });

  it('HDM: wraps through north', () => {
    const data = parse('APHDM,359.0,M');
    expect(normalizeNavigationData(data!, 2).heading).toBeCloseTo(1);
  });

  it('RSA: rudder angle, negative to port; an invalid rudder is ignored', () => {
    const data = parse('APRSA,-5.2,A,,V');
    expect(data?.type).toBe(InstrumentDataType.Rudder);
    expect(normalizeInstrumentData(data!)).toEqual({ rudderAngle: -5.2 });
    expect(parse('APRSA,3.0,V,,V')).toBeNull();
    // Only a port rudder sensor
    expect(normalizeInstrumentData(parse('APRSA,,V,7.5,A')!)).toEqual({ rudderAngle: 7.5 });
  });

  it('XDR: heel and pitch from pypilot', () => {
    const data = parse('APXDR,A,-1.5,D,PTCH,A,12.3,D,ROLL');
    expect(data?.type).toBe(InstrumentDataType.Attitude);
    expect(normalizeInstrumentData(data!)).toEqual({ heel: 12.3, pitch: -1.5 });
  });

  it('XDR: other transducers are ignored', () => {
    expect(parse('IIXDR,C,19.5,C,AIRTEMP,P,1.013,B,BARO')).toBeNull();
    expect(normalizeInstrumentData(parse('IIXDR,C,19.5,C,AIRTEMP,A,4.0,D,HEEL')!)).toEqual({ heel: 4 });
  });
});

describe('magnetic variation from instruments', () => {
  it('RMC carries its variation, west negative', () => {
    const data = parse('GPRMC,120000,A,5253.10,N,00521.30,E,5.0,270.0,171026,2.4,W,A');
    expect((data?.value as { variation?: number }).variation).toBeCloseTo(-2.4);
  });

  it('RMC without variation leaves it out', () => {
    const data = parse('GPRMC,120000,A,5253.10,N,00521.30,E,5.0,270.0,171026,,,A');
    expect(data?.value).not.toHaveProperty('variation');
  });

  it('HDG with an empty variation uses the setting; a given variation wins', () => {
    const empty = parse('HCHDG,100.0,,,,');
    expect(empty?.value).not.toHaveProperty('variation');
    expect(normalizeNavigationData(empty!, 2).heading).toBeCloseTo(102);
    const given = parse('HCHDG,100.0,,,1.0,W');
    expect(normalizeNavigationData(given!, 2).heading).toBeCloseTo(99);
  });
});
