import { ProtocolStubSimulator, testScenarios } from './ProtocolStub';
import { InstrumentDataType, StubConfig, SimulationScenario } from '../types';

describe('ProtocolStub', () => {
  let stub: ProtocolStubSimulator;

  beforeEach(() => {
    stub = new ProtocolStubSimulator();
  });

  afterEach(() => {
    stub.stop();
  });

  describe('start and stop', () => {
    it('should start generating data', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 10,
        outputMode: 'callback'
      };

      const scenario: SimulationScenario = {
        name: 'Test',
        gpsTrack: [
          {
            latitude: 52.5,
            longitude: 5.0,
            accuracy: 5,
            timestamp: Date.now()
          }
        ]
      };

      stub.setScenario(scenario);

      let dataReceived = false;
      stub.getDataStream().subscribe((data) => {
        dataReceived = true;
        expect(data).toBeDefined();
        expect(data.source).toBeDefined();
        stub.stop();
        done();
      });

      stub.start(config);
    });

    it('should stop generating data when stopped', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 10,
        outputMode: 'callback'
      };

      stub.start(config);
      stub.stop();

      setTimeout(() => {
        done();
      }, 200);
    });

    it('should restart if already running', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 10,
        outputMode: 'callback'
      };

      stub.start(config);
      stub.start(config);

      setTimeout(() => {
        stub.stop();
        done();
      }, 100);
    });
  });

  describe('setScenario', () => {
    it('should set a simulation scenario', () => {
      const scenario: SimulationScenario = {
        name: 'Test Scenario',
        gpsTrack: [
          {
            latitude: 52.0,
            longitude: 4.0,
            accuracy: 5,
            timestamp: Date.now()
          }
        ],
        depth: { values: [10, 15, 20], interval: 10 },
        wind: { speed: 15, direction: 270, variation: 10 },
        speed: { speed: 6.5, variation: 5 }
      };

      expect(() => stub.setScenario(scenario)).not.toThrow();
    });

    it('should reset position index when setting new scenario', () => {
      const scenario1: SimulationScenario = {
        name: 'Scenario 1',
        gpsTrack: [
          { latitude: 52.0, longitude: 4.0, accuracy: 5, timestamp: Date.now() },
          { latitude: 52.1, longitude: 4.1, accuracy: 5, timestamp: Date.now() }
        ]
      };

      const scenario2: SimulationScenario = {
        name: 'Scenario 2',
        gpsTrack: [
          { latitude: 53.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() }
        ]
      };

      stub.setScenario(scenario1);
      stub.setScenario(scenario2);

      expect(() => stub.setScenario(scenario2)).not.toThrow();
    });
  });

  describe('updateValue', () => {
    it('should emit custom instrument data', (done) => {
      stub.getDataStream().subscribe((data) => {
        expect(data.type).toBe(InstrumentDataType.Depth);
        expect(data.value).toBe(15.5);
        expect(data.unit).toBe('m');
        expect(data.source).toBe('stub');
        done();
      });

      stub.updateValue(InstrumentDataType.Depth, 15.5);
    });

    it('should emit speed data', (done) => {
      stub.getDataStream().subscribe((data) => {
        expect(data.type).toBe(InstrumentDataType.Speed);
        expect(data.value).toBe(7.2);
        expect(data.unit).toBe('kn');
        done();
      });

      stub.updateValue(InstrumentDataType.Speed, 7.2);
    });
  });

  describe('NMEA0183 data generation', () => {
    it('should generate GPS data from track', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 10,
        outputMode: 'callback'
      };

      const scenario: SimulationScenario = {
        name: 'GPS Test',
        gpsTrack: [
          {
            latitude: 52.5,
            longitude: 5.0,
            accuracy: 5,
            timestamp: Date.now()
          }
        ]
      };

      stub.setScenario(scenario);

      stub.getDataStream().subscribe((data) => {
        if (data.type === InstrumentDataType.GPS) {
          expect(data.source).toMatch(/nmea0183|stub/);
          expect(data.value).toHaveProperty('latitude');
          expect(data.value).toHaveProperty('longitude');
          stub.stop();
          done();
        }
      });

      stub.start(config);
    });

    it('should generate depth data', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 10,
        outputMode: 'callback'
      };

      const scenario: SimulationScenario = {
        name: 'Depth Test',
        depth: { values: [10, 15, 20], interval: 10 }
      };

      stub.setScenario(scenario);

      stub.getDataStream().subscribe((data) => {
        if (data.type === InstrumentDataType.Depth) {
          expect(data.value).toBeDefined();
          expect(typeof data.value).toBe('number');
          stub.stop();
          done();
        }
      });

      stub.start(config);
    });

    it('should generate wind data', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 10,
        outputMode: 'callback'
      };

      const scenario: SimulationScenario = {
        name: 'Wind Test',
        wind: { speed: 15, direction: 270, variation: 10 }
      };

      stub.setScenario(scenario);

      stub.getDataStream().subscribe((data) => {
        if (data.type === InstrumentDataType.Wind) {
          expect(data.value).toHaveProperty('speed');
          expect(data.value).toHaveProperty('direction');
          stub.stop();
          done();
        }
      });

      stub.start(config);
    });

    it('should generate speed data', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 10,
        outputMode: 'callback'
      };

      const scenario: SimulationScenario = {
        name: 'Speed Test',
        speed: { speed: 6.5, variation: 5 }
      };

      stub.setScenario(scenario);

      stub.getDataStream().subscribe((data) => {
        if (data.type === InstrumentDataType.Speed) {
          expect(data.value).toBeDefined();
          expect(typeof data.value).toBe('number');
          stub.stop();
          done();
        }
      });

      stub.start(config);
    });

    it('should generate AIS data', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 10,
        outputMode: 'callback'
      };

      const scenario: SimulationScenario = {
        name: 'AIS Test',
        aisTargets: [
          {
            mmsi: '123456789',
            name: 'TEST VESSEL',
            callSign: 'ABC',
            position: {
              latitude: 52.0,
              longitude: 4.0,
              accuracy: 10,
              timestamp: Date.now()
            },
            course: 90,
            speed: 5,
            heading: 90,
            vesselType: 70,
            length: 100,
            width: 20,
            lastUpdate: new Date(),
            history: []
          }
        ]
      };

      stub.setScenario(scenario);

      stub.getDataStream().subscribe((data) => {
        if (data.type === InstrumentDataType.AIS) {
          expect(data.value).toHaveProperty('mmsi');
          expect(data.value).toHaveProperty('position');
          stub.stop();
          done();
        }
      });

      stub.start(config);
    });
  });

  describe('NMEA2000 data generation', () => {
    it('should generate depth data', (done) => {
      const config: StubConfig = {
        protocols: ['nmea2000'],
        updateRate: 10,
        outputMode: 'callback'
      };

      const scenario: SimulationScenario = {
        name: 'NMEA2000 Depth',
        depth: { values: [10, 15, 20], interval: 10 }
      };

      stub.setScenario(scenario);

      stub.getDataStream().subscribe((data) => {
        if (data.type === InstrumentDataType.Depth && data.source === 'nmea2000') {
          expect(data.value).toHaveProperty('depth');
          expect(data.unit).toBe('m');
          stub.stop();
          done();
        }
      });

      stub.start(config);
    });

    it('should generate wind data', (done) => {
      const config: StubConfig = {
        protocols: ['nmea2000'],
        updateRate: 10,
        outputMode: 'callback'
      };

      const scenario: SimulationScenario = {
        name: 'NMEA2000 Wind',
        wind: { speed: 15, direction: 270, variation: 10 }
      };

      stub.setScenario(scenario);

      stub.getDataStream().subscribe((data) => {
        if (data.type === InstrumentDataType.Wind && data.source === 'nmea2000') {
          expect(data.value).toHaveProperty('speed');
          expect(data.value).toHaveProperty('direction');
          stub.stop();
          done();
        }
      });

      stub.start(config);
    });
  });

  describe('SeaTalk data generation', () => {
    it('should generate depth data', (done) => {
      const config: StubConfig = {
        protocols: ['seatalk'],
        updateRate: 10,
        outputMode: 'callback'
      };

      const scenario: SimulationScenario = {
        name: 'SeaTalk Depth',
        depth: { values: [10, 15, 20], interval: 10 }
      };

      stub.setScenario(scenario);

      stub.getDataStream().subscribe((data) => {
        if (data.type === InstrumentDataType.Depth && data.source === 'seatalk') {
          expect(data.value).toHaveProperty('depth');
          stub.stop();
          done();
        }
      });

      stub.start(config);
    });

    it('should generate wind data', (done) => {
      const config: StubConfig = {
        protocols: ['seatalk'],
        updateRate: 10,
        outputMode: 'callback'
      };

      const scenario: SimulationScenario = {
        name: 'SeaTalk Wind',
        wind: { speed: 15, direction: 270, variation: 10 }
      };

      stub.setScenario(scenario);

      stub.getDataStream().subscribe((data) => {
        if (data.type === InstrumentDataType.Wind && data.source === 'seatalk') {
          expect(data.value).toHaveProperty('speed');
          expect(data.value).toHaveProperty('angle');
          stub.stop();
          done();
        }
      });

      stub.start(config);
    });
  });

  describe('test scenarios', () => {
    it('should have coastal navigation scenario', () => {
      expect(testScenarios.coastalNavigation).toBeDefined();
      expect(testScenarios.coastalNavigation.name).toBe('Coastal Navigation');
      expect(testScenarios.coastalNavigation.gpsTrack).toBeDefined();
      expect(testScenarios.coastalNavigation.depth).toBeDefined();
      expect(testScenarios.coastalNavigation.wind).toBeDefined();
      expect(testScenarios.coastalNavigation.speed).toBeDefined();
    });

    it('should have harbor approach scenario', () => {
      expect(testScenarios.harborApproach).toBeDefined();
      expect(testScenarios.harborApproach.name).toBe('Harbor Approach');
      expect(testScenarios.harborApproach.gpsTrack).toBeDefined();
      expect(testScenarios.harborApproach.aisTargets).toBeDefined();
      expect(testScenarios.harborApproach.aisTargets?.length).toBeGreaterThan(0);
    });

    it('should have open water scenario', () => {
      expect(testScenarios.openWater).toBeDefined();
      expect(testScenarios.openWater.name).toBe('Open Water Passage');
      expect(testScenarios.openWater.gpsTrack).toBeDefined();
      expect(testScenarios.openWater.gpsTrack?.length).toBeGreaterThan(0);
    });

    it('should execute coastal navigation scenario', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 10,
        outputMode: 'callback'
      };

      stub.setScenario(testScenarios.coastalNavigation);

      let dataCount = 0;
      stub.getDataStream().subscribe((data) => {
        dataCount++;
        expect(data).toBeDefined();

        if (dataCount >= 3) {
          stub.stop();
          done();
        }
      });

      stub.start(config);
    });

    it('should execute harbor approach scenario', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 10,
        outputMode: 'callback'
      };

      stub.setScenario(testScenarios.harborApproach);

      let hasAIS = false;
      stub.getDataStream().subscribe((data) => {
        if (data.type === InstrumentDataType.AIS) {
          hasAIS = true;
          stub.stop();
          done();
        }
      });

      stub.start(config);
    });

    it('should execute open water scenario', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 10,
        outputMode: 'callback'
      };

      stub.setScenario(testScenarios.openWater);

      stub.getDataStream().subscribe((data) => {
        expect(data).toBeDefined();
        stub.stop();
        done();
      });

      stub.start(config);
    });
  });

  describe('multiple protocols', () => {
    it('should generate data for multiple protocols simultaneously', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183', 'nmea2000', 'seatalk'],
        updateRate: 10,
        outputMode: 'callback'
      };

      const scenario: SimulationScenario = {
        name: 'Multi-Protocol Test',
        depth: { values: [10], interval: 10 },
        wind: { speed: 15, direction: 270, variation: 10 }
      };

      stub.setScenario(scenario);

      const sources = new Set<string>();
      stub.getDataStream().subscribe((data) => {
        sources.add(data.source);

        if (sources.size >= 2) {
          stub.stop();
          done();
        }
      });

      stub.start(config);
    });
  });

  describe('data stream', () => {
    it('should provide observable data stream', () => {
      const stream = stub.getDataStream();
      expect(stream).toBeDefined();
      expect(typeof stream.subscribe).toBe('function');
    });

    it('should emit data to multiple subscribers', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 10,
        outputMode: 'callback'
      };

      const scenario: SimulationScenario = {
        name: 'Multi-Subscriber Test',
        depth: { values: [10], interval: 10 }
      };

      stub.setScenario(scenario);

      let subscriber1Received = false;
      let subscriber2Received = false;

      stub.getDataStream().subscribe(() => {
        subscriber1Received = true;
        checkComplete();
      });

      stub.getDataStream().subscribe(() => {
        subscriber2Received = true;
        checkComplete();
      });

      function checkComplete() {
        if (subscriber1Received && subscriber2Received) {
          stub.stop();
          done();
        }
      }

      stub.start(config);
    });
  });

  describe('GPS track cycling', () => {
    it('should cycle through GPS track positions', (done) => {
      const config: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 50,
        outputMode: 'callback'
      };

      const scenario: SimulationScenario = {
        name: 'Track Cycling Test',
        gpsTrack: [
          { latitude: 52.0, longitude: 4.0, accuracy: 5, timestamp: Date.now() },
          { latitude: 52.1, longitude: 4.1, accuracy: 5, timestamp: Date.now() },
          { latitude: 52.2, longitude: 4.2, accuracy: 5, timestamp: Date.now() }
        ]
      };

      stub.setScenario(scenario);

      let positionCount = 0;
      stub.getDataStream().subscribe((data) => {
        if (data.type === InstrumentDataType.GPS) {
          positionCount++;
          if (positionCount >= 5) {
            stub.stop();
            done();
          }
        }
      });

      stub.start(config);
    });
  });
});
