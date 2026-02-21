/**
 * End-to-End Test: Instrument Integration
 * Tests: connect stub → verify data display
 */

import { InstrumentServiceImpl } from '../../services/InstrumentService';
import { ProtocolStubSimulator, testScenarios } from '../../protocols/ProtocolStub';
import { InstrumentConfig, InstrumentDataType, StubConfig } from '../../types';

describe('E2E: Instrument Integration', () => {
  let instrumentService: InstrumentServiceImpl;
  let protocolStub: ProtocolStubSimulator;

  beforeEach(() => {
    instrumentService = new InstrumentServiceImpl();
    protocolStub = new ProtocolStubSimulator();
  });

  afterEach(async () => {
    await instrumentService.disconnect();
    protocolStub.stop();
  });

  it('should connect to protocol stub and receive GPS data', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      baudRate: 4800,
      useStub: true
    };

    await instrumentService.connect(config);
    expect(instrumentService.getConnectionStatus()).toBe(true);

    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate: 10,
      outputMode: 'callback'
    };

    protocolStub.setScenario(testScenarios.coastalNavigation);
    protocolStub.start(stubConfig);

    const gpsData: any[] = [];
    instrumentService.subscribe(InstrumentDataType.GPS, (data) => {
      gpsData.push(data);
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(gpsData.length).toBeGreaterThan(0);
    expect(gpsData[0].type).toBe(InstrumentDataType.GPS);
    expect(gpsData[0].value).toHaveProperty('latitude');
    expect(gpsData[0].value).toHaveProperty('longitude');
  }, 10000);

  it('should receive depth data from multiple protocols', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    const stubConfig: StubConfig = {
      protocols: ['nmea0183', 'nmea2000', 'seatalk'],
      updateRate: 10,
      outputMode: 'callback'
    };

    protocolStub.setScenario(testScenarios.coastalNavigation);
    protocolStub.start(stubConfig);

    const depthData: any[] = [];
    instrumentService.subscribe(InstrumentDataType.Depth, (data) => {
      depthData.push(data);
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    expect(depthData.length).toBeGreaterThan(0);
    
    // Verify data from different protocols
    const sources = new Set(depthData.map(d => d.source));
    expect(sources.size).toBeGreaterThan(1);
  }, 10000);

  it('should receive wind data and display correctly', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate: 10,
      outputMode: 'callback'
    };

    protocolStub.setScenario(testScenarios.coastalNavigation);
    protocolStub.start(stubConfig);

    const windData: any[] = [];
    instrumentService.subscribe(InstrumentDataType.Wind, (data) => {
      windData.push(data);
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(windData.length).toBeGreaterThan(0);
    expect(windData[0].type).toBe(InstrumentDataType.Wind);
    expect(windData[0].value).toHaveProperty('speed');
    expect(windData[0].value).toHaveProperty('direction');
    expect(windData[0].value.speed).toBeGreaterThan(0);
  }, 10000);

  it('should receive speed data with correct units', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate: 10,
      outputMode: 'callback'
    };

    protocolStub.setScenario(testScenarios.coastalNavigation);
    protocolStub.start(stubConfig);

    const speedData: any[] = [];
    instrumentService.subscribe(InstrumentDataType.Speed, (data) => {
      speedData.push(data);
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(speedData.length).toBeGreaterThan(0);
    expect(speedData[0].type).toBe(InstrumentDataType.Speed);
    expect(speedData[0].unit).toBe('kn');
    expect(typeof speedData[0].value).toBe('number');
  }, 10000);

  it('should handle harbor approach scenario with AIS data', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate: 10,
      outputMode: 'callback'
    };

    protocolStub.setScenario(testScenarios.harborApproach);
    protocolStub.start(stubConfig);

    const aisData: any[] = [];
    instrumentService.subscribe(InstrumentDataType.AIS, (data) => {
      aisData.push(data);
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    expect(aisData.length).toBeGreaterThan(0);
    expect(aisData[0].type).toBe(InstrumentDataType.AIS);
    expect(aisData[0].value).toHaveProperty('mmsi');
    expect(aisData[0].value).toHaveProperty('position');
  }, 10000);

  it('should receive all instrument data types simultaneously', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate: 10,
      outputMode: 'callback'
    };

    protocolStub.setScenario(testScenarios.coastalNavigation);
    protocolStub.start(stubConfig);

    const dataTypes = new Set<InstrumentDataType>();
    instrumentService.subscribe(null, (data) => {
      dataTypes.add(data.type);
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify multiple data types received
    expect(dataTypes.size).toBeGreaterThan(2);
    expect(dataTypes.has(InstrumentDataType.GPS)).toBe(true);
  }, 10000);

  it('should handle data updates at specified rate', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    const updateRate = 20; // 20 Hz
    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate,
      outputMode: 'callback'
    };

    protocolStub.setScenario(testScenarios.openWater);
    protocolStub.start(stubConfig);

    const timestamps: number[] = [];
    instrumentService.subscribe(InstrumentDataType.GPS, (data) => {
      timestamps.push(data.timestamp);
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(timestamps.length).toBeGreaterThan(10);

    // Calculate average interval
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const expectedInterval = 1000 / updateRate;

    // Allow 50% tolerance for timing variations
    expect(avgInterval).toBeGreaterThan(expectedInterval * 0.5);
    expect(avgInterval).toBeLessThan(expectedInterval * 1.5);
  }, 10000);

  it('should maintain data stream during scenario changes', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate: 10,
      outputMode: 'callback'
    };

    // Start with coastal navigation
    protocolStub.setScenario(testScenarios.coastalNavigation);
    protocolStub.start(stubConfig);

    const dataReceived: any[] = [];
    instrumentService.subscribe(null, (data) => {
      dataReceived.push(data);
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const countBefore = dataReceived.length;

    // Switch to harbor approach
    protocolStub.stop();
    protocolStub.setScenario(testScenarios.harborApproach);
    protocolStub.start(stubConfig);

    await new Promise(resolve => setTimeout(resolve, 500));

    const countAfter = dataReceived.length;

    // Verify data continued after scenario change
    expect(countAfter).toBeGreaterThan(countBefore);
  }, 10000);

  it('should handle multiple subscribers to same data type', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate: 10,
      outputMode: 'callback'
    };

    protocolStub.setScenario(testScenarios.coastalNavigation);
    protocolStub.start(stubConfig);

    const subscriber1Data: any[] = [];
    const subscriber2Data: any[] = [];
    const subscriber3Data: any[] = [];

    instrumentService.subscribe(InstrumentDataType.GPS, (data) => {
      subscriber1Data.push(data);
    });

    instrumentService.subscribe(InstrumentDataType.GPS, (data) => {
      subscriber2Data.push(data);
    });

    instrumentService.subscribe(InstrumentDataType.GPS, (data) => {
      subscriber3Data.push(data);
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // All subscribers should receive data
    expect(subscriber1Data.length).toBeGreaterThan(0);
    expect(subscriber2Data.length).toBeGreaterThan(0);
    expect(subscriber3Data.length).toBeGreaterThan(0);

    // All should receive approximately the same amount
    expect(Math.abs(subscriber1Data.length - subscriber2Data.length)).toBeLessThan(3);
    expect(Math.abs(subscriber2Data.length - subscriber3Data.length)).toBeLessThan(3);
  }, 10000);

  it('should provide latest data on demand', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate: 10,
      outputMode: 'callback'
    };

    protocolStub.setScenario(testScenarios.coastalNavigation);
    protocolStub.start(stubConfig);

    // Wait for some data to be generated
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get latest data
    const latestGPS = instrumentService.getLatestData(InstrumentDataType.GPS);
    const latestDepth = instrumentService.getLatestData(InstrumentDataType.Depth);
    const latestWind = instrumentService.getLatestData(InstrumentDataType.Wind);

    expect(latestGPS).toBeDefined();
    expect(latestDepth).toBeDefined();
    expect(latestWind).toBeDefined();

    expect(latestGPS?.type).toBe(InstrumentDataType.GPS);
    expect(latestDepth?.type).toBe(InstrumentDataType.Depth);
    expect(latestWind?.type).toBe(InstrumentDataType.Wind);
  }, 10000);
});
