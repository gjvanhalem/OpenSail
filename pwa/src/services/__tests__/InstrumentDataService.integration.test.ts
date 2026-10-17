import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import instrumentsReducer, { addInstrumentData } from '@/store/slices/instrumentsSlice';
import { InstrumentDataService } from '@/services/InstrumentDataService';
import type { SerialConnection } from '@/services/connections';
import type { ProtocolType } from '@/store/slices/instrumentsSlice';
import type { AppDispatch } from '@/store';
import { InstrumentDataType } from '@/models';
import navigationReducer from '@/store/slices/navigationSlice';
import settingsReducer, { setSettingOptimistic } from '@/store/slices/settingsSlice';
import { NMEA0183Parser } from '@/protocols';

const MS_TO_KNOTS = 3600 / 1852;

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

function setup(protocol: ProtocolType) {
  const store = configureStore({ reducer: { instruments: instrumentsReducer } });
  const service = new InstrumentDataService(store.dispatch as AppDispatch);
  const connection = new FakeConnection();
  service.wireConnection(connection as unknown as SerialConnection, protocol);
  return {
    store,
    feed: (...data: string[]) => data.forEach((d) => connection.emit(d)),
    state: () => store.getState().instruments,
  };
}

describe('InstrumentDataService → instruments slice', () => {
  describe('NMEA 0183 sentences', () => {
    let env: ReturnType<typeof setup>;
    beforeEach(() => {
      env = setup('NMEA0183');
    });

    it('stores DBT depth in metres', () => {
      env.feed('$SDDBT,40.0,f,12.2,M,6.6,F*03');
      expect(env.state().depth).toBeCloseTo(12.2);
    });

    it('stores DPT depth including the transducer offset', () => {
      env.feed('$SDDPT,12.2,0.5*63');
      expect(env.state().depth).toBeCloseTo(12.7);
    });

    it('stores apparent MWV wind as knots and degrees', () => {
      env.feed('$WIMWV,045.0,R,10.0,N,A*13');
      expect(env.state().windSpeed).toBeCloseTo(10);
      expect(env.state().windDirection).toBeCloseTo(45);
    });

    it('converts MWV wind speed given in m/s and km/h to knots', () => {
      env.feed('$WIMWV,315.0,R,5.0,M,A*22');
      expect(env.state().windSpeed).toBeCloseTo(5 * MS_TO_KNOTS);
      expect(env.state().windDirection).toBeCloseTo(315);

      env.feed('$WIMWV,010.0,R,36.0,K,A*12');
      expect(env.state().windSpeed).toBeCloseTo(36000 / 1852);
      expect(env.state().windDirection).toBeCloseTo(10);
    });

    it('keeps the apparent wind when true wind (MWV,T) arrives', () => {
      env.feed('$WIMWV,045.0,R,10.0,N,A*13', '$WIMWV,090.0,T,12.0,N,A*1F');
      expect(env.state().windSpeed).toBeCloseTo(10);
      expect(env.state().windDirection).toBeCloseTo(45);
      expect(env.state().dataStreams.wind).toHaveLength(2);
    });

    it('ignores MWV sentences flagged invalid', () => {
      env.feed('$WIMWV,045.0,R,10.0,N,V*04');
      expect(env.state().windSpeed).toBeNull();
    });

    it('stores VHW speed through water in knots', () => {
      env.feed('$VWVHW,,T,,M,6.5,N,12.0,K*64');
      expect(env.state().waterSpeed).toBeCloseTo(6.5);
    });

    it('does not treat VTG speed over ground as water speed', () => {
      env.feed('$VWVHW,,T,,M,6.5,N,12.0,K*64', '$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48');
      expect(env.state().waterSpeed).toBeCloseTo(6.5);
      expect(env.state().dataStreams.speed).toHaveLength(2);
    });
  });

  describe('NMEA 2000 frames (candump format: CAN ID#data)', () => {
    let env: ReturnType<typeof setup>;
    beforeEach(() => {
      env = setup('NMEA2000');
    });

    it('stores PGN 128267 depth in metres including offset', () => {
      // depth 12.34 m, offset +0.5 m, range 100 m
      env.feed('0DF50B23#01D2040000F4010A');
      expect(env.state().depth).toBeCloseTo(12.84);
    });

    it('stores PGN 128259 water-referenced speed in knots', () => {
      // water 3.09 m/s, ground not available
      env.feed('09F50323#013501FFFF00FFFF');
      expect(env.state().waterSpeed).toBeCloseTo(3.09 * MS_TO_KNOTS);
    });

    it('does not set water speed from a ground-referenced-only PGN 128259', () => {
      env.feed('09F50323#01FFFF350100FFFF');
      expect(env.state().waterSpeed).toBeNull();
    });

    it('stores PGN 130306 apparent wind as knots and degrees', () => {
      // 5.14 m/s at 0.7854 rad, reference 2 (apparent)
      env.feed('09FD0223#010202AE1EFAFFFF');
      expect(env.state().windSpeed).toBeCloseTo(5.14 * MS_TO_KNOTS);
      expect(env.state().windDirection).toBeCloseTo(45, 1);
    });

    it('keeps the apparent wind when true wind (reference 3) arrives', () => {
      env.feed('09FD0223#010202AE1EFAFFFF', '09FD0223#01E803AE3CFBFFFF');
      expect(env.state().windSpeed).toBeCloseTo(5.14 * MS_TO_KNOTS);
      expect(env.state().windDirection).toBeCloseTo(45, 1);
    });

    it('stores PGN 130310 water temperature in °C', () => {
      // 288.15 K
      env.feed('15FD0623#018F70FFFFFFFFFF');
      expect(env.state().waterTemperature).toBeCloseTo(15);
    });
  });

  describe('stub simulator output', () => {
    it('keeps accepting plain numbers and { speed, direction } wind', () => {
      const store = configureStore({ reducer: { instruments: instrumentsReducer } });
      const base = { timestamp: Date.now(), source: 'stub' };

      store.dispatch(addInstrumentData({ ...base, type: InstrumentDataType.Depth, value: 8, unit: 'm' }));
      store.dispatch(addInstrumentData({ ...base, type: InstrumentDataType.Speed, value: 5.5, unit: 'kn' }));
      store.dispatch(
        addInstrumentData({
          ...base,
          type: InstrumentDataType.Wind,
          value: { speed: 12, direction: 270 },
          unit: 'kn',
        })
      );
      store.dispatch(
        addInstrumentData({ ...base, type: InstrumentDataType.Temperature, value: 18, unit: '°C' })
      );

      const state = store.getState().instruments;
      expect(state.depth).toBe(8);
      expect(state.waterSpeed).toBe(5.5);
      expect(state.windSpeed).toBe(12);
      expect(state.windDirection).toBe(270);
      expect(state.waterTemperature).toBe(18);
    });

    it('accepts { depth } objects and m/s wind', () => {
      const store = configureStore({ reducer: { instruments: instrumentsReducer } });
      const base = { timestamp: Date.now(), source: 'stub' };

      store.dispatch(
        addInstrumentData({ ...base, type: InstrumentDataType.Depth, value: { depth: 15 }, unit: 'm' })
      );
      store.dispatch(
        addInstrumentData({
          ...base,
          type: InstrumentDataType.Wind,
          value: { speed: 10, direction: 90 },
          unit: 'm/s',
        })
      );

      const state = store.getState().instruments;
      expect(state.depth).toBe(15);
      expect(state.windSpeed).toBeCloseTo(10 * MS_TO_KNOTS);
      expect(state.windDirection).toBe(90);
    });
  });
});

describe('InstrumentDataService: heading from an autopilot (HDM)', () => {
  function setupWithSettings(magneticVariation: number) {
    const store = configureStore({
      reducer: {
        instruments: instrumentsReducer,
        navigation: navigationReducer,
        settings: settingsReducer,
      },
    });
    store.dispatch(setSettingOptimistic({ key: 'magneticVariation', value: magneticVariation }));
    const service = new InstrumentDataService(store.dispatch as AppDispatch);
    const connection = new FakeConnection();
    service.wireConnection(connection as unknown as SerialConnection, 'NMEA0183');
    const parser = new NMEA0183Parser();
    const feed = (body: string) => connection.emit(`$${body}*${parser.calculateChecksum(body)}`);
    return { store, feed };
  }

  it('turns the magnetic heading true with the variation setting', () => {
    const { store, feed } = setupWithSettings(2.5);
    feed('APHDM,100.0,M');
    expect(store.getState().navigation.heading).toBeCloseTo(102.5);
  });

  it("prefers an instrument's own variation (RMC) over the setting", () => {
    const { store, feed } = setupWithSettings(2.5);
    feed('GPRMC,120000,A,5253.10,N,00521.30,E,5.0,270.0,171026,1.0,W,A');
    feed('APHDM,100.0,M');
    expect(store.getState().navigation.heading).toBeCloseTo(99);
  });

  it('stores rudder angle, heel and pitch', () => {
    const { store, feed } = setupWithSettings(0);
    feed('APRSA,-5.2,A,,V');
    feed('APXDR,A,-1.5,D,PTCH,A,12.3,D,ROLL');
    const { rudderAngle, heel, pitch } = store.getState().instruments;
    expect({ rudderAngle, heel, pitch }).toEqual({ rudderAngle: -5.2, heel: 12.3, pitch: -1.5 });
  });
});
