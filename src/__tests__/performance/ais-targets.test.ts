/**
 * Performance Test: AIS Target Handling
 * Target: Handle 100+ AIS targets simultaneously
 */

import { AISServiceImpl } from '../../services/AISService';
import { InstrumentServiceImpl } from '../../services/InstrumentService';
import { ProtocolStubSimulator } from '../../protocols/ProtocolStub';
import { AISTarget, Position, InstrumentConfig, StubConfig, SimulationScenario, InstrumentDataType } from '../../types';

describe('Performance: AIS Target Handling', () => {
  let aisService: AISServiceImpl;
  let instrumentService: InstrumentServiceImpl;
  let protocolStub: ProtocolStubSimulator;

  beforeEach(() => {
    aisService = new AISServiceImpl();
    instrumentService = new InstrumentServiceImpl();
    protocolStub = new ProtocolStubSimulator();
  });

  afterEach(async () => {
    await instrumentService.disconnect();
    protocolStub.stop();
  });

  it('should handle 100+ AIS targets efficiently', async () => {
    // Generate 150 AIS targets
    const targets: AISTarget[] = [];
    for (let i = 0; i < 150; i++) {
      targets.push({
        mmsi: `${100000000 + i}`,
        name: `VESSEL_${i}`,
        callSign: `V${i}`,
        position: {
          latitude: 52.0 + (Math.random() * 0.5),
          longitude: 5.0 + (Math.random() * 0.5),
          accuracy: 10,
          timestamp: Date.now()
        },
        course: Math.random() * 360,
        speed: Math.random() * 20,
        heading: Math.random() * 360,
        vesselType: 70,
        length: 50 + Math.random() * 200,
        width: 10 + Math.random() * 30,
        lastUpdate: new Date(),
        history: []
      });
    }

    const startTime = performance.now();

    // Add all targets
    for (const target of targets) {
      await aisService.addTarget(target);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTimePerTarget = totalTime / targets.length;

    // Should add targets quickly
    expect(avgTimePerTarget).toBeLessThan(10);
    expect(totalTime).toBeLessThan(2000);

    // Verify all targets were added
    const allTargets = await aisService.getAllTargets();
    expect(allTargets.length).toBe(150);
  });

  it('should retrieve targets within performance budget', async () => {
    // Add 100 targets
    const targets: AISTarget[] = [];
    for (let i = 0; i < 100; i++) {
      const target: AISTarget = {
        mmsi: `${100000000 + i}`,
        name: `VESSEL_${i}`,
        callSign: `V${i}`,
        position: {
          latitude: 52.0 + (Math.random() * 0.5),
          longitude: 5.0 + (Math.random() * 0.5),
          accuracy: 10,
          timestamp: Date.now()
        },
        course: Math.random() * 360,
        speed: Math.random() * 20,
        heading: Math.random() * 360,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history: []
      };
      await aisService.addTarget(target);
    }

    // Measure retrieval time
    const retrievalTimes: number[] = [];

    for (let i = 0; i < 50; i++) {
      const startTime = performance.now();
      await aisService.getAllTargets();
      const endTime = performance.now();
      retrievalTimes.push(endTime - startTime);
    }

    const avgRetrievalTime = retrievalTimes.reduce((a, b) => a + b, 0) / retrievalTimes.length;

    // Retrieval should be fast
    expect(avgRetrievalTime).toBeLessThan(50);
  });

  it('should calculate CPA for multiple targets efficiently', async () => {
    // Add 100 targets
    for (let i = 0; i < 100; i++) {
      const target: AISTarget = {
        mmsi: `${100000000 + i}`,
        name: `VESSEL_${i}`,
        callSign: `V${i}`,
        position: {
          latitude: 52.0 + (i * 0.01),
          longitude: 5.0 + (i * 0.01),
          accuracy: 10,
          timestamp: Date.now()
        },
        course: 90 + (Math.random() * 20 - 10),
        speed: 10 + (Math.random() * 5),
        heading: 90,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history: []
      };
      await aisService.addTarget(target);
    }

    const ownPosition: Position = {
      latitude: 52.0,
      longitude: 5.0,
      accuracy: 5,
      timestamp: Date.now()
    };

    const ownCourse = 90;
    const ownSpeed = 10;

    const startTime = performance.now();
    await aisService.calculateAllCPA(ownPosition, ownCourse, ownSpeed);
    const endTime = performance.now();

    const calculationTime = endTime - startTime;

    // CPA calculation for 100 targets should complete quickly
    expect(calculationTime).toBeLessThan(500);
  });

  it('should update target positions efficiently', async () => {
    // Add 100 targets
    const targetIds: string[] = [];
    for (let i = 0; i < 100; i++) {
      const mmsi = `${100000000 + i}`;
      targetIds.push(mmsi);
      
      const target: AISTarget = {
        mmsi,
        name: `VESSEL_${i}`,
        callSign: `V${i}`,
        position: {
          latitude: 52.0 + (i * 0.001),
          longitude: 5.0 + (i * 0.001),
          accuracy: 10,
          timestamp: Date.now()
        },
        course: 90,
        speed: 10,
        heading: 90,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history: []
      };
      await aisService.addTarget(target);
    }

    // Update all targets
    const updateTimes: number[] = [];

    for (const mmsi of targetIds) {
      const newPosition: Position = {
        latitude: 52.0 + Math.random(),
        longitude: 5.0 + Math.random(),
        accuracy: 10,
        timestamp: Date.now()
      };

      const startTime = performance.now();
      await aisService.updateTargetPosition(mmsi, newPosition);
      const endTime = performance.now();
      updateTimes.push(endTime - startTime);
    }

    const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;

    // Updates should be fast
    expect(avgUpdateTime).toBeLessThan(10);
  });

  it('should filter targets by bounds efficiently', async () => {
    // Add 200 targets across a large area
    for (let i = 0; i < 200; i++) {
      const target: AISTarget = {
        mmsi: `${100000000 + i}`,
        name: `VESSEL_${i}`,
        callSign: `V${i}`,
        position: {
          latitude: 50.0 + (Math.random() * 5),
          longitude: 3.0 + (Math.random() * 5),
          accuracy: 10,
          timestamp: Date.now()
        },
        course: Math.random() * 360,
        speed: Math.random() * 20,
        heading: Math.random() * 360,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history: []
      };
      await aisService.addTarget(target);
    }

    const bounds = {
      north: 52.5,
      south: 52.0,
      east: 5.5,
      west: 5.0
    };

    const filterTimes: number[] = [];

    for (let i = 0; i < 50; i++) {
      const startTime = performance.now();
      await aisService.getTargetsInBounds(bounds);
      const endTime = performance.now();
      filterTimes.push(endTime - startTime);
    }

    const avgFilterTime = filterTimes.reduce((a, b) => a + b, 0) / filterTimes.length;

    // Filtering should be fast
    expect(avgFilterTime).toBeLessThan(50);
  });

  it('should handle target expiration efficiently', async () => {
    // Add 100 targets with old timestamps
    const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

    for (let i = 0; i < 100; i++) {
      const target: AISTarget = {
        mmsi: `${100000000 + i}`,
        name: `VESSEL_${i}`,
        callSign: `V${i}`,
        position: {
          latitude: 52.0 + (i * 0.001),
          longitude: 5.0 + (i * 0.001),
          accuracy: 10,
          timestamp: oldTimestamp
        },
        course: 90,
        speed: 10,
        heading: 90,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(oldTimestamp),
        history: []
      };
      await aisService.addTarget(target);
    }

    const startTime = performance.now();
    await aisService.cleanupExpiredTargets();
    const endTime = performance.now();

    const cleanupTime = endTime - startTime;

    // Cleanup should be fast
    expect(cleanupTime).toBeLessThan(500);

    // Verify targets were removed
    const remainingTargets = await aisService.getAllTargets();
    expect(remainingTargets.length).toBe(0);
  });

  it('should maintain performance with target history', async () => {
    // Add targets with history
    for (let i = 0; i < 50; i++) {
      const history: Position[] = [];
      
      // Add 100 history points per target
      for (let j = 0; j < 100; j++) {
        history.push({
          latitude: 52.0 + (j * 0.0001),
          longitude: 5.0 + (j * 0.0001),
          accuracy: 10,
          timestamp: Date.now() - (j * 60000)
        });
      }

      const target: AISTarget = {
        mmsi: `${100000000 + i}`,
        name: `VESSEL_${i}`,
        callSign: `V${i}`,
        position: history[0],
        course: 90,
        speed: 10,
        heading: 90,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history
      };
      await aisService.addTarget(target);
    }

    // Measure retrieval performance
    const startTime = performance.now();
    const targets = await aisService.getAllTargets();
    const endTime = performance.now();

    const retrievalTime = endTime - startTime;

    // Should handle targets with history efficiently
    expect(retrievalTime).toBeLessThan(200);
    expect(targets.length).toBe(50);
  });

  it('should process AIS messages at high rate', async () => {
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    // Generate scenario with many AIS targets
    const aisTargets: AISTarget[] = [];
    for (let i = 0; i < 100; i++) {
      aisTargets.push({
        mmsi: `${100000000 + i}`,
        name: `VESSEL_${i}`,
        callSign: `V${i}`,
        position: {
          latitude: 52.0 + (Math.random() * 0.5),
          longitude: 5.0 + (Math.random() * 0.5),
          accuracy: 10,
          timestamp: Date.now()
        },
        course: Math.random() * 360,
        speed: Math.random() * 20,
        heading: Math.random() * 360,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history: []
      });
    }

    const scenario: SimulationScenario = {
      name: 'AIS Performance Test',
      aisTargets
    };

    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate: 10,
      outputMode: 'callback'
    };

    protocolStub.setScenario(scenario);
    protocolStub.start(stubConfig);

    const processingTimes: number[] = [];
    let messageCount = 0;

    instrumentService.subscribe(InstrumentDataType.AIS, (data) => {
      const receiveTime = performance.now();
      const sendTime = data.timestamp;
      processingTimes.push(receiveTime - sendTime);
      messageCount++;
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(messageCount).toBeGreaterThan(50);

    const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;

    // Should process AIS messages quickly
    expect(avgProcessingTime).toBeLessThan(100);
  }, 10000);

  it('should handle concurrent target operations', async () => {
    // Add initial targets
    for (let i = 0; i < 50; i++) {
      const target: AISTarget = {
        mmsi: `${100000000 + i}`,
        name: `VESSEL_${i}`,
        callSign: `V${i}`,
        position: {
          latitude: 52.0 + (i * 0.001),
          longitude: 5.0 + (i * 0.001),
          accuracy: 10,
          timestamp: Date.now()
        },
        course: 90,
        speed: 10,
        heading: 90,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history: []
      };
      await aisService.addTarget(target);
    }

    const startTime = performance.now();

    // Perform concurrent operations
    const operations = [];

    // Add new targets
    for (let i = 50; i < 75; i++) {
      operations.push(aisService.addTarget({
        mmsi: `${100000000 + i}`,
        name: `VESSEL_${i}`,
        callSign: `V${i}`,
        position: {
          latitude: 52.0 + (i * 0.001),
          longitude: 5.0 + (i * 0.001),
          accuracy: 10,
          timestamp: Date.now()
        },
        course: 90,
        speed: 10,
        heading: 90,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history: []
      }));
    }

    // Update existing targets
    for (let i = 0; i < 25; i++) {
      operations.push(aisService.updateTargetPosition(
        `${100000000 + i}`,
        {
          latitude: 52.0 + Math.random(),
          longitude: 5.0 + Math.random(),
          accuracy: 10,
          timestamp: Date.now()
        }
      ));
    }

    // Get targets
    for (let i = 0; i < 10; i++) {
      operations.push(aisService.getAllTargets());
    }

    await Promise.all(operations);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Concurrent operations should complete quickly
    expect(totalTime).toBeLessThan(1000);
  });

  it('should scale with increasing target count', async () => {
    const targetCounts = [10, 50, 100, 150, 200];
    const retrievalTimes: number[] = [];

    for (const count of targetCounts) {
      // Clear existing targets
      await aisService.clearAllTargets();

      // Add targets
      for (let i = 0; i < count; i++) {
        const target: AISTarget = {
          mmsi: `${100000000 + i}`,
          name: `VESSEL_${i}`,
          callSign: `V${i}`,
          position: {
            latitude: 52.0 + (Math.random() * 0.5),
            longitude: 5.0 + (Math.random() * 0.5),
            accuracy: 10,
            timestamp: Date.now()
          },
          course: Math.random() * 360,
          speed: Math.random() * 20,
          heading: Math.random() * 360,
          vesselType: 70,
          length: 100,
          width: 20,
          lastUpdate: new Date(),
          history: []
        };
        await aisService.addTarget(target);
      }

      // Measure retrieval time
      const startTime = performance.now();
      await aisService.getAllTargets();
      const endTime = performance.now();
      retrievalTimes.push(endTime - startTime);
    }

    // Performance should scale reasonably (not exponentially)
    for (let i = 1; i < retrievalTimes.length; i++) {
      const ratio = retrievalTimes[i] / retrievalTimes[i - 1];
      const countRatio = targetCounts[i] / targetCounts[i - 1];
      
      // Time increase should not be more than 2x the count increase
      expect(ratio).toBeLessThan(countRatio * 2);
    }
  });
});
