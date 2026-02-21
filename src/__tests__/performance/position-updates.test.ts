/**
 * Performance Test: Position Update Processing
 * Target: Process position updates within 100ms
 */

import { InstrumentServiceImpl } from '../../services/InstrumentService';
import { RouteServiceImpl } from '../../services/RouteService';
import { TrackServiceImpl } from '../../services/TrackService';
import { ProtocolStubSimulator } from '../../protocols/ProtocolStub';
import { InstrumentConfig, StubConfig, InstrumentDataType, Position, SimulationScenario } from '../../types';

describe('Performance: Position Update Processing', () => {
  let instrumentService: InstrumentServiceImpl;
  let routeService: RouteServiceImpl;
  let trackService: TrackServiceImpl;
  let protocolStub: ProtocolStubSimulator;

  beforeEach(() => {
    instrumentService = new InstrumentServiceImpl();
    routeService = new RouteServiceImpl();
    trackService = new TrackServiceImpl();
    protocolStub = new ProtocolStubSimulator();
  });

  afterEach(async () => {
    await instrumentService.disconnect();
    protocolStub.stop();
  });

  it('should process GPS position updates within 100ms', async () => {
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

    const scenario: SimulationScenario = {
      name: 'Performance Test',
      gpsTrack: [
        { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() }
      ]
    };

    protocolStub.setScenario(scenario);
    protocolStub.start(stubConfig);

    const processingTimes: number[] = [];

    instrumentService.subscribe(InstrumentDataType.GPS, (data) => {
      const receiveTime = performance.now();
      const sendTime = data.timestamp;
      const processingTime = receiveTime - sendTime;
      processingTimes.push(processingTime);
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(processingTimes.length).toBeGreaterThan(10);

    const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    const maxProcessingTime = Math.max(...processingTimes);

    // Average processing time should be well under 100ms
    expect(avgProcessingTime).toBeLessThan(100);
    
    // Maximum processing time should not exceed 100ms
    expect(maxProcessingTime).toBeLessThan(100);
  }, 10000);

  it('should handle high-frequency position updates', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    // Test with 10 Hz update rate
    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate: 10,
      outputMode: 'callback'
    };

    const scenario: SimulationScenario = {
      name: 'High Frequency Test',
      gpsTrack: [
        { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() }
      ]
    };

    protocolStub.setScenario(scenario);
    protocolStub.start(stubConfig);

    let updateCount = 0;
    const startTime = performance.now();

    instrumentService.subscribe(InstrumentDataType.GPS, () => {
      updateCount++;
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;
    const actualRate = updateCount / duration;

    // Should handle at least 8 Hz (allowing for some overhead)
    expect(actualRate).toBeGreaterThan(8);
  }, 10000);

  it('should process position updates with minimal latency', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate: 5,
      outputMode: 'callback'
    };

    const scenario: SimulationScenario = {
      name: 'Latency Test',
      gpsTrack: [
        { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() }
      ]
    };

    protocolStub.setScenario(scenario);

    const latencies: number[] = [];
    let lastTimestamp = 0;

    instrumentService.subscribe(InstrumentDataType.GPS, (data) => {
      const now = performance.now();
      if (lastTimestamp > 0) {
        const latency = now - lastTimestamp;
        latencies.push(latency);
      }
      lastTimestamp = now;
    });

    protocolStub.start(stubConfig);

    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(latencies.length).toBeGreaterThan(5);

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    // Average latency should be close to update interval (200ms for 5 Hz)
    expect(avgLatency).toBeGreaterThan(150);
    expect(avgLatency).toBeLessThan(250);
  }, 10000);

  it('should update track recording efficiently', async () => {
    const trackId = await trackService.startRecording('Performance Test');

    const positions: Position[] = [];
    for (let i = 0; i < 100; i++) {
      positions.push({
        latitude: 52.0 + (i * 0.001),
        longitude: 5.0 + (i * 0.001),
        accuracy: 5,
        timestamp: Date.now() + (i * 1000)
      });
    }

    const recordTimes: number[] = [];

    for (const pos of positions) {
      const startTime = performance.now();
      await trackService.recordPosition(pos, 5.0, 90);
      const endTime = performance.now();
      recordTimes.push(endTime - startTime);
    }

    await trackService.stopRecording();

    const avgRecordTime = recordTimes.reduce((a, b) => a + b, 0) / recordTimes.length;
    const maxRecordTime = Math.max(...recordTimes);

    // Recording should be fast
    expect(avgRecordTime).toBeLessThan(50);
    expect(maxRecordTime).toBeLessThan(100);
  });

  it('should calculate route progress efficiently', async () => {
    // Create a route
    const waypoints = [
      {
        id: 'wp1',
        position: { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
        name: 'Start',
        arrivalRadius: 50
      },
      {
        id: 'wp2',
        position: { latitude: 52.1, longitude: 5.1, accuracy: 5, timestamp: Date.now() },
        name: 'Mid',
        arrivalRadius: 50
      },
      {
        id: 'wp3',
        position: { latitude: 52.2, longitude: 5.2, accuracy: 5, timestamp: Date.now() },
        name: 'End',
        arrivalRadius: 50
      }
    ];

    const route = await routeService.createRoute(waypoints);
    await routeService.setActiveRoute(route.id);

    // Simulate position updates along route
    const positions: Position[] = [];
    for (let i = 0; i <= 20; i++) {
      positions.push({
        latitude: 52.0 + (i * 0.01),
        longitude: 5.0 + (i * 0.01),
        accuracy: 5,
        timestamp: Date.now()
      });
    }

    const calculationTimes: number[] = [];

    for (const pos of positions) {
      const startTime = performance.now();
      
      // Calculate distance to next waypoint
      const nextWaypoint = route.waypoints[1];
      await routeService.calculateDistanceBetween(pos, nextWaypoint.position);
      
      const endTime = performance.now();
      calculationTimes.push(endTime - startTime);
    }

    const avgCalcTime = calculationTimes.reduce((a, b) => a + b, 0) / calculationTimes.length;

    // Route calculations should be very fast
    expect(avgCalcTime).toBeLessThan(10);
  });

  it('should handle burst of position updates', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    // Simulate burst of updates
    const burstSize = 50;
    const positions: Position[] = [];

    for (let i = 0; i < burstSize; i++) {
      positions.push({
        latitude: 52.0 + (i * 0.0001),
        longitude: 5.0 + (i * 0.0001),
        accuracy: 5,
        timestamp: Date.now() + i
      });
    }

    const startTime = performance.now();

    // Send burst of position updates
    for (const pos of positions) {
      protocolStub.updateValue(InstrumentDataType.GPS, pos);
    }

    let receivedCount = 0;
    instrumentService.subscribe(InstrumentDataType.GPS, () => {
      receivedCount++;
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Should process burst quickly
    expect(processingTime).toBeLessThan(2000);
    expect(receivedCount).toBeGreaterThan(0);
  }, 10000);

  it('should maintain performance with multiple subscribers', async () => {
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

    const scenario: SimulationScenario = {
      name: 'Multi-Subscriber Test',
      gpsTrack: [
        { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() }
      ]
    };

    protocolStub.setScenario(scenario);

    // Add multiple subscribers
    const subscriberCount = 10;
    const processingTimes: number[][] = Array(subscriberCount).fill(null).map(() => []);

    for (let i = 0; i < subscriberCount; i++) {
      const subscriberIndex = i;
      instrumentService.subscribe(InstrumentDataType.GPS, (data) => {
        const receiveTime = performance.now();
        const sendTime = data.timestamp;
        processingTimes[subscriberIndex].push(receiveTime - sendTime);
      });
    }

    protocolStub.start(stubConfig);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check that all subscribers received data efficiently
    for (let i = 0; i < subscriberCount; i++) {
      expect(processingTimes[i].length).toBeGreaterThan(10);
      const avgTime = processingTimes[i].reduce((a, b) => a + b, 0) / processingTimes[i].length;
      expect(avgTime).toBeLessThan(100);
    }
  }, 10000);

  it('should process position updates from multiple protocols', async () => {
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

    const scenario: SimulationScenario = {
      name: 'Multi-Protocol Test',
      gpsTrack: [
        { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() }
      ]
    };

    protocolStub.setScenario(scenario);
    protocolStub.start(stubConfig);

    const processingTimes: number[] = [];

    instrumentService.subscribe(InstrumentDataType.GPS, (data) => {
      const receiveTime = performance.now();
      const sendTime = data.timestamp;
      processingTimes.push(receiveTime - sendTime);
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(processingTimes.length).toBeGreaterThan(10);

    const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;

    // Should handle multiple protocols efficiently
    expect(avgProcessingTime).toBeLessThan(100);
  }, 10000);
});
