import { describe, it, expect, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import navigationReducer from '@/store/slices/navigationSlice';
import settingsReducer from '@/store/slices/settingsSlice';
import instrumentsReducer, { type ProtocolType } from '@/store/slices/instrumentsSlice';
import { InstrumentDataService } from '@/services/InstrumentDataService';
import { StubConnection } from '@/services/connections';
import { VesselSimulation } from '@/services/simulator/VesselSimulation';
import { encodeNMEA0183, encodeSeaTalk, nmeaChecksum } from '@/services/simulator/encoders';
import { NMEA0183Parser } from '@/protocols/NMEA0183Parser';
import { calculateDistance } from '@/utils/calculations';
import type { AppDispatch } from '@/store';

const steady = {
  start: { latitude: 51.9925, longitude: 4.0825 },
  heading: 295,
  speed: 6,
  depth: 12.4,
  windSpeed: 14.2,
  windAngle: 40,
  waterTemperature: 14,
  variation: 1.5,
  variability: false,
};

function setup(protocol: ProtocolType) {
  const store = configureStore({
    reducer: {
      navigation: navigationReducer,
      settings: settingsReducer,
      instruments: instrumentsReducer,
    },
  });
  const connection = new StubConnection({
    id: 'stub-1',
    protocol,
    intervalMs: 100,
    simulation: steady,
  });
  new InstrumentDataService(store.dispatch as AppDispatch).wireConnection(connection, protocol);
  return { store, connection };
}

describe('StubConnection → InstrumentDataService → store', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Each protocol rounds differently on the wire: SeaTalk has 0.5° headings,
  // 0.1 ft depth and whole °C; NMEA 0183 one decimal
  const cases: [ProtocolType, number][] = [
    ['NMEA0183', 0.1],
    ['NMEA2000', 0.05],
    ['SeaTalk', 0.5],
  ];

  it.each(cases)('%s: position, heading, COG/SOG, depth, wind and STW match the simulation', async (protocol, tolerance) => {
    const { store, connection } = setup(protocol);
    await connection.connect();
    await connection.disconnect();

    const nav = store.getState().navigation;
    const instruments = store.getState().instruments;
    const state = connection.state;

    // Within 5 m (calculateDistance is in nautical miles)
    expect(calculateDistance(nav.position!, state.position)).toBeLessThan(5 / 1852);
    expect(Math.abs(nav.heading! - state.heading)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(nav.speed! - state.speedOverGround)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(instruments.depth! - state.depth)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(instruments.windSpeed! - state.windSpeed)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(instruments.windDirection! - state.windAngle)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(instruments.waterSpeed! - state.speedThroughWater)).toBeLessThanOrEqual(tolerance);
    expect(nav.sources).toEqual({ position: 'instrument', cogSog: 'instrument', heading: 'instrument' });
  });

  it.each(['NMEA0183', 'NMEA2000', 'SeaTalk'] as ProtocolType[])(
    '%s: course over ground arrives true',
    async (protocol) => {
      const { store, connection } = setup(protocol);
      await connection.connect();
      expect(Math.abs(store.getState().navigation.course! - 295)).toBeLessThanOrEqual(0.5);
      await connection.disconnect();
    }
  );

  it('sends a set of data every interval while connected, and none after disconnect', async () => {
    vi.useFakeTimers();
    const { connection } = setup('NMEA0183');
    const lines: string[] = [];
    connection.onData((line) => lines.push(line));
    await connection.connect();
    const perSet = lines.length;
    expect(perSet).toBeGreaterThan(0);

    vi.advanceTimersByTime(300);
    expect(lines.length).toBe(perSet * 4);

    await connection.disconnect();
    vi.advanceTimersByTime(300);
    expect(lines.length).toBe(perSet * 4);
  });

  it('moves the vessel and follows changed settings', async () => {
    vi.useFakeTimers();
    const { store, connection } = setup('NMEA2000');
    await connection.connect();
    const start = store.getState().navigation.position!;

    connection.updateSimulation({ depth: 3.2, heading: 90 });
    vi.advanceTimersByTime(1000);

    const nav = store.getState().navigation;
    expect(store.getState().instruments.depth).toBeCloseTo(3.2, 1);
    expect(nav.heading).toBeCloseTo(90, 1);
    // One second at 6 knots is about 3 m
    expect(calculateDistance(start, nav.position!) * 1852).toBeGreaterThan(2);
    await connection.disconnect();
  });

  it('reports its status through onStatusChange', async () => {
    const { connection } = setup('SeaTalk');
    const statuses: string[] = [];
    connection.onStatusChange((status) => statuses.push(status));
    await connection.connect();
    await connection.disconnect();
    expect(statuses).toEqual(['connecting', 'connected', 'disconnected']);
  });
});

describe('encoders', () => {
  const state = new VesselSimulation(steady).state;

  it('NMEA 0183 sentences carry valid checksums', () => {
    const parser = new NMEA0183Parser();
    for (const sentence of encodeNMEA0183(state)) {
      expect(parser.validate(sentence), sentence).toBe(true);
    }
  });

  it('SeaTalk datagrams are wrapped as $STALK with a checksum', () => {
    for (const sentence of encodeSeaTalk(state)) {
      const [, body, checksum] = /^\$(STALK,[0-9A-F,]+)\*([0-9A-F]{2})$/.exec(sentence)!;
      expect(nmeaChecksum(body)).toBe(checksum);
    }
  });
});

describe('VesselSimulation', () => {
  it('dead-reckons along its heading at its speed', () => {
    const sim = new VesselSimulation({ ...steady, heading: 0, speed: 6 }, 1, 0);
    const start = sim.state.position;
    // One minute at 6 knots: 0.1 NM = 185.2 m north
    for (let t = 1; t <= 60; t++) sim.step(1000, t * 1000);
    expect(calculateDistance(start, sim.state.position) * 1852).toBeCloseTo(185.2, 0);
    expect(sim.state.position.latitude).toBeGreaterThan(start.latitude);
    expect(sim.state.position.longitude).toBeCloseTo(start.longitude, 6);
  });

  it('replays the same wander for the same seed', () => {
    const run = (seed: number) => {
      const sim = new VesselSimulation({ ...steady, variability: true }, seed, 0);
      return [1, 2, 3].map((t) => sim.step(500, t * 500).heading);
    };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
  });

  it('keeps wander small around the configured values', () => {
    const sim = new VesselSimulation({ ...steady, variability: true }, 3, 0);
    for (let t = 1; t <= 120; t++) {
      const s = sim.step(500, t * 500);
      expect(Math.abs(s.heading - 295)).toBeLessThan(5);
      expect(Math.abs(s.speedOverGround - 6)).toBeLessThan(0.5);
      expect(Math.abs(s.windAngle - 40)).toBeLessThan(8);
    }
  });
});
