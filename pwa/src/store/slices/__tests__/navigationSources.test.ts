import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import navigationReducer, {
  acceptsSource,
  navigationReading,
  reportNavigation,
  INSTRUMENT_STALE_MS,
  type NavigationSourceChoices,
} from '../navigationSlice';
import settingsReducer, { setSettingOptimistic } from '../settingsSlice';
import instrumentsReducer from '../instrumentsSlice';
import { InstrumentDataService } from '@/services/InstrumentDataService';
import { NMEA0183Parser } from '@/protocols/NMEA0183Parser';
import type { SerialConnection } from '@/services/connections';
import type { AppDispatch } from '@/store';
import type { Position } from '@/models';

const pos = (latitude: number, longitude: number): Position => ({
  latitude,
  longitude,
  accuracy: 5,
  timestamp: 0,
});
const auto: NavigationSourceChoices = { position: 'auto', cogSog: 'auto', heading: 'auto' };

describe('acceptsSource', () => {
  it('takes only the chosen source when one is chosen', () => {
    expect(acceptsSource('gps', 'gps', null, 0)).toBe(true);
    expect(acceptsSource('gps', 'instrument', null, 0)).toBe(false);
    expect(acceptsSource('instrument', 'gps', null, 0)).toBe(false);
    expect(acceptsSource('instrument', 'instrument', null, 0)).toBe(true);
  });

  it('auto always takes instruments', () => {
    expect(acceptsSource('auto', 'instrument', 0, 0)).toBe(true);
  });

  it('auto takes GPS only when the instruments are quiet', () => {
    expect(acceptsSource('auto', 'gps', null, 10_000)).toBe(true);
    expect(acceptsSource('auto', 'gps', 9_000, 10_000)).toBe(false);
    expect(acceptsSource('auto', 'gps', 10_000 - INSTRUMENT_STALE_MS - 1, 10_000)).toBe(true);
  });
});

describe('navigationReading reducer', () => {
  const reduce = (
    state: ReturnType<typeof navigationReducer> | undefined,
    payload: Parameters<typeof navigationReading>[0]
  ) => navigationReducer(state, navigationReading(payload));

  it('applies a GPS position and records the source', () => {
    const state = reduce(undefined, {
      source: 'gps',
      reading: { position: pos(52, 4), course: 90, speedOverGround: 5 },
      choices: auto,
      now: 1000,
    });
    expect(state.position).toEqual(pos(52, 4));
    expect(state.course).toBe(90);
    expect(state.speed).toBe(5);
    expect(state.isGPSActive).toBe(true);
    expect(state.sources).toEqual({ position: 'gps', cogSog: 'gps', heading: null });
  });

  it('in auto, instrument values win over GPS while the instruments report', () => {
    let state = reduce(undefined, {
      source: 'instrument',
      reading: { position: pos(52, 4) },
      choices: auto,
      now: 1000,
    });
    state = reduce(state, { source: 'gps', reading: { position: pos(53, 5) }, choices: auto, now: 2000 });
    expect(state.position?.latitude).toBe(52);
    expect(state.sources.position).toBe('instrument');

    // Instruments quiet for longer than the stale time: GPS takes over
    state = reduce(state, {
      source: 'gps',
      reading: { position: pos(53, 5) },
      choices: auto,
      now: 1000 + INSTRUMENT_STALE_MS + 1,
    });
    expect(state.position?.latitude).toBe(53);
    expect(state.sources.position).toBe('gps');
  });

  it('each value has its own source', () => {
    const choices: NavigationSourceChoices = {
      position: 'gps',
      cogSog: 'gps',
      heading: 'instrument',
    };
    let state = reduce(undefined, {
      source: 'instrument',
      reading: { position: pos(52, 4), heading: 45 },
      choices,
      now: 1000,
    });
    expect(state.position).toBeNull();
    expect(state.heading).toBe(45);
    state = reduce(state, { source: 'gps', reading: { position: pos(53, 5) }, choices, now: 1100 });
    expect(state.position?.latitude).toBe(53);
    expect(state.heading).toBe(45);
  });

  it('drops a stale compass heading once GPS is the heading source', () => {
    let state = reduce(undefined, {
      source: 'instrument',
      reading: { heading: 45 },
      choices: auto,
      now: 1000,
    });
    state = reduce(state, { source: 'gps', reading: { position: pos(52, 4) }, choices: auto, now: 2000 });
    expect(state.heading).toBe(45);
    state = reduce(state, {
      source: 'gps',
      reading: { position: pos(52, 4) },
      choices: auto,
      now: 1000 + INSTRUMENT_STALE_MS + 1,
    });
    expect(state.heading).toBeNull();
    expect(state.sources.heading).toBeNull();
  });
});

/** Minimal stand-in for a SerialConnection: lets the test push raw lines/frames. */
class FakeConnection {
  private callback: ((data: string) => void) | null = null;
  onData(callback: (data: string) => void): void {
    this.callback = callback;
  }
  emit(data: string): void {
    this.callback?.(data);
  }
}

const nmea = new NMEA0183Parser();
const sentence = (body: string) => `$${body}*${nmea.calculateChecksum(body)}`;

/** A candump-style NMEA 2000 frame: 29-bit CAN ID (priority 2, source 0x50) and data */
function n2kFrame(pgn: number, bytes: number[]): string {
  const id = ((2 << 26) | (pgn << 8) | 0x50) >>> 0;
  const hex = (b: number) => b.toString(16).padStart(2, '0');
  return `${id.toString(16).padStart(8, '0')}#${bytes.map(hex).join('')}`;
}

function int32le(value: number): number[] {
  const view = new DataView(new ArrayBuffer(4));
  view.setInt32(0, value, true);
  return [0, 1, 2, 3].map((i) => view.getUint8(i));
}

function uint16le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

describe('InstrumentDataService → navigation', () => {
  function setup(protocol: 'NMEA0183' | 'NMEA2000') {
    const store = configureStore({
      reducer: {
        navigation: navigationReducer,
        settings: settingsReducer,
        instruments: instrumentsReducer,
      },
    });
    const service = new InstrumentDataService(store.dispatch as AppDispatch);
    const connection = new FakeConnection();
    service.wireConnection(connection as unknown as SerialConnection, protocol);
    return {
      store,
      feed: (...lines: string[]) => lines.forEach((l) => connection.emit(l)),
      nav: () => store.getState().navigation,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('NMEA 0183 RMC and HDG set position, COG/SOG and heading', () => {
    const env = setup('NMEA0183');
    env.feed(
      sentence('GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W'),
      sentence('HCHDG,98.3,0.0,E,0.0,E')
    );
    expect(env.nav().position?.latitude).toBeCloseTo(48.1173);
    expect(env.nav().course).toBeCloseTo(84.4);
    expect(env.nav().speed).toBeCloseTo(22.4);
    expect(env.nav().heading).toBeCloseTo(98.3);
    expect(env.nav().sources).toEqual({
      position: 'instrument',
      cogSog: 'instrument',
      heading: 'instrument',
    });
  });

  it('NMEA 2000 PGNs 129025, 129026 and 127250 set position, COG/SOG and heading', () => {
    const env = setup('NMEA2000');
    env.feed(
      n2kFrame(129025, [...int32le(521234567), ...int32le(43456789)]),
      // SID, COG reference true, COG 1.5708 rad, SOG 2.5 m/s
      n2kFrame(129026, [0, 0, ...uint16le(15708), ...uint16le(250), 0xff, 0xff]),
      // SID, heading 0.7854 rad, deviation and variation n/a, reference true
      n2kFrame(127250, [0, ...uint16le(7854), 0xff, 0x7f, 0xff, 0x7f, 0xfc])
    );
    expect(env.nav().position?.latitude).toBeCloseTo(52.1234567, 6);
    expect(env.nav().position?.longitude).toBeCloseTo(4.3456789, 6);
    expect(env.nav().course).toBeCloseTo(90, 1);
    expect(env.nav().speed).toBeCloseTo(2.5 * (3600 / 1852), 2);
    expect(env.nav().heading).toBeCloseTo(45, 1);
  });

  it('GPS is ignored for a value set to instrument, used for one set to GPS', () => {
    const env = setup('NMEA0183');
    env.store.dispatch(setSettingOptimistic({ key: 'positionSource', value: 'gps' }));
    env.store.dispatch(setSettingOptimistic({ key: 'headingSource', value: 'instrument' }));
    env.feed(
      sentence('GPGLL,3723.2475,S,12158.3416,W,161229.487,A,A'),
      sentence('HEHDT,274.1,T')
    );
    expect(env.nav().position).toBeNull();
    expect(env.nav().heading).toBeCloseTo(274.1);

    env.store.dispatch(reportNavigation('gps', { position: pos(52, 4) }));
    expect(env.nav().position?.latitude).toBe(52);
    expect(env.nav().heading).toBeCloseTo(274.1);
  });
});
