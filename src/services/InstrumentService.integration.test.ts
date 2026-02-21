import { InstrumentServiceImpl } from './InstrumentService';
import { InstrumentConfig, InstrumentDataType, InstrumentData } from '../types';
import { testScenarios } from '../protocols/ProtocolStub';

describe('InstrumentService - Integration Tests', () => {
  let service: InstrumentServiceImpl;

  beforeEach(() => {
    service = new InstrumentServiceImpl();
  });

  afterEach(async () => {
    await service.disconnect();
  });

  describe('Connection to Protocol Stubs', () => {
    it('should connect to NMEA0183 protocol stub', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      await service.connect(config);
      
      expect(service.getConnectionStatus()).toBe(true);
      expect(service.isStubEnabled()).toBe(true);
    });

    it('should connect to NMEA2000 protocol stub', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea2000',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 250000,
        useStub: true
      };

      await service.connect(config);
      
      expect(service.getConnectionStatus()).toBe(true);
      expect(service.isStubEnabled()).toBe(true);
    });

    it('should connect to SeaTalk protocol stub', async () => {
      const config: InstrumentConfig = {
        protocol: 'seatalk',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      await service.connect(config);
      
      expect(service.getConnectionStatus()).toBe(true);
      expect(service.isStubEnabled()).toBe(true);
    });

    it('should disconnect from protocol stub', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);

      await service.disconnect();
      expect(service.getConnectionStatus()).toBe(false);
    });
  });

  describe('Data Subscription and Distribution', () => {
    it('should receive GPS data from stub', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      const receivedData: InstrumentData[] = [];
      
      service.subscribe(InstrumentDataType.GPS, (data) => {
        receivedData.push(data);
      });

      await service.connect(config);

      // Wait for data to be generated
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(receivedData.length).toBeGreaterThan(0);
      expect(receivedData[0].type).toBe(InstrumentDataType.GPS);
      expect(receivedData[0].source).toBe('stub');
    });

    it('should receive depth data from stub', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      const receivedData: InstrumentData[] = [];
      
      service.subscribe(InstrumentDataType.Depth, (data) => {
        receivedData.push(data);
      });

      await service.connect(config);

      // Wait for data to be generated
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(receivedData.length).toBeGreaterThan(0);
      expect(receivedData[0].type).toBe(InstrumentDataType.Depth);
    });

    it('should receive wind data from stub', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      const receivedData: InstrumentData[] = [];
      
      service.subscribe(InstrumentDataType.Wind, (data) => {
        receivedData.push(data);
      });

      await service.connect(config);

      // Wait for data to be generated
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(receivedData.length).toBeGreaterThan(0);
      expect(receivedData[0].type).toBe(InstrumentDataType.Wind);
    });

    it('should receive speed data from stub', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      const receivedData: InstrumentData[] = [];
      
      service.subscribe(InstrumentDataType.Speed, (data) => {
        receivedData.push(data);
      });

      await service.connect(config);

      // Wait for data to be generated
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(receivedData.length).toBeGreaterThan(0);
      expect(receivedData[0].type).toBe(InstrumentDataType.Speed);
    });

    it('should receive all data types with null subscription', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      const receivedData: InstrumentData[] = [];
      
      service.subscribe(null, (data) => {
        receivedData.push(data);
      });

      await service.connect(config);

      // Wait for data to be generated
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(receivedData.length).toBeGreaterThan(0);
      
      // Should receive multiple data types
      const dataTypes = new Set(receivedData.map(d => d.type));
      expect(dataTypes.size).toBeGreaterThan(1);
    });

    it('should support multiple subscribers', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      const subscriber1Data: InstrumentData[] = [];
      const subscriber2Data: InstrumentData[] = [];
      
      service.subscribe(InstrumentDataType.GPS, (data) => {
        subscriber1Data.push(data);
      });

      service.subscribe(InstrumentDataType.GPS, (data) => {
        subscriber2Data.push(data);
      });

      await service.connect(config);

      // Wait for data to be generated
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(subscriber1Data.length).toBeGreaterThan(0);
      expect(subscriber2Data.length).toBeGreaterThan(0);
      expect(subscriber1Data.length).toBe(subscriber2Data.length);
    });

    it('should unsubscribe correctly', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      const receivedData: InstrumentData[] = [];
      
      const subscription = service.subscribe(InstrumentDataType.GPS, (data) => {
        receivedData.push(data);
      });

      await service.connect(config);

      // Wait for some data
      await new Promise(resolve => setTimeout(resolve, 1000));

      const countBeforeUnsubscribe = receivedData.length;
      
      subscription.unsubscribe();

      // Wait more time
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should not receive more data after unsubscribe
      expect(receivedData.length).toBe(countBeforeUnsubscribe);
    });

    it('should filter data by type correctly', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      const gpsData: InstrumentData[] = [];
      const depthData: InstrumentData[] = [];
      
      service.subscribe(InstrumentDataType.GPS, (data) => {
        gpsData.push(data);
      });

      service.subscribe(InstrumentDataType.Depth, (data) => {
        depthData.push(data);
      });

      await service.connect(config);

      // Wait for data to be generated
      await new Promise(resolve => setTimeout(resolve, 2000));

      // GPS subscriber should only receive GPS data
      expect(gpsData.every(d => d.type === InstrumentDataType.GPS)).toBe(true);
      
      // Depth subscriber should only receive depth data
      expect(depthData.every(d => d.type === InstrumentDataType.Depth)).toBe(true);
    });

    it('should provide latest data via getLatestData', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      await service.connect(config);

      // Wait for data to be generated
      await new Promise(resolve => setTimeout(resolve, 2000));

      const latestGPS = service.getLatestData(InstrumentDataType.GPS);
      
      // Should have received some GPS data
      expect(latestGPS).not.toBeNull();
      if (latestGPS) {
        expect(latestGPS.type).toBe(InstrumentDataType.GPS);
      }
    });
  });

  describe('Stub Mode Switching', () => {
    it('should switch from physical to stub mode', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: false
      };

      await service.connect(config);
      expect(service.isStubEnabled()).toBe(false);

      service.setStubMode(true);
      expect(service.isStubEnabled()).toBe(true);
    });

    it('should receive data after switching to stub mode', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: false
      };

      const receivedData: InstrumentData[] = [];
      
      service.subscribe(null, (data) => {
        receivedData.push(data);
      });

      await service.connect(config);
      
      service.setStubMode(true);

      // Wait for stub data
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(receivedData.length).toBeGreaterThan(0);
    });

    it('should maintain subscriptions when switching modes', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: false
      };

      const receivedData: InstrumentData[] = [];
      
      const subscription = service.subscribe(InstrumentDataType.GPS, (data) => {
        receivedData.push(data);
      });

      await service.connect(config);
      
      service.setStubMode(true);

      // Wait for data
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(receivedData.length).toBeGreaterThan(0);
      
      subscription.unsubscribe();
    });
  });

  describe('Reconnection Logic', () => {
    it('should handle disconnect and reconnect cycle', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      // First connection
      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);

      // Disconnect
      await service.disconnect();
      expect(service.getConnectionStatus()).toBe(false);

      // Reconnect
      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);
    });

    it('should receive data after reconnection', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      const receivedData: InstrumentData[] = [];
      
      service.subscribe(null, (data) => {
        receivedData.push(data);
      });

      // First connection
      await service.connect(config);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const countAfterFirst = receivedData.length;
      expect(countAfterFirst).toBeGreaterThan(0);

      // Disconnect
      await service.disconnect();
      await new Promise(resolve => setTimeout(resolve, 500));

      const countAfterDisconnect = receivedData.length;

      // Reconnect
      await service.connect(config);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should receive more data after reconnection
      expect(receivedData.length).toBeGreaterThan(countAfterDisconnect);
    });

    it('should handle multiple reconnections', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      for (let i = 0; i < 3; i++) {
        await service.connect(config);
        expect(service.getConnectionStatus()).toBe(true);

        await service.disconnect();
        expect(service.getConnectionStatus()).toBe(false);
      }

      // Final connection should work
      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);
    });

    it('should clear reconnection timer on manual disconnect', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      await service.connect(config);
      await service.disconnect();

      // Wait longer than reconnection interval
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Should still be disconnected (no automatic reconnection after manual disconnect)
      expect(service.getConnectionStatus()).toBe(false);
    });
  });

  describe('Protocol-Specific Integration', () => {
    it('should handle NMEA0183 protocol end-to-end', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      const receivedData: InstrumentData[] = [];
      
      service.subscribe(null, (data) => {
        receivedData.push(data);
      });

      await service.connect(config);
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(receivedData.length).toBeGreaterThan(0);
      expect(receivedData.some(d => d.source === 'stub')).toBe(true);
    });

    it('should handle NMEA2000 protocol end-to-end', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea2000',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 250000,
        useStub: true
      };

      const receivedData: InstrumentData[] = [];
      
      service.subscribe(null, (data) => {
        receivedData.push(data);
      });

      await service.connect(config);
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(receivedData.length).toBeGreaterThan(0);
      expect(receivedData.some(d => d.source === 'nmea2000')).toBe(true);
    });

    it('should handle SeaTalk protocol end-to-end', async () => {
      const config: InstrumentConfig = {
        protocol: 'seatalk',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      const receivedData: InstrumentData[] = [];
      
      service.subscribe(null, (data) => {
        receivedData.push(data);
      });

      await service.connect(config);
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(receivedData.length).toBeGreaterThan(0);
      expect(receivedData.some(d => d.source === 'seatalk')).toBe(true);
    });
  });

  describe('Error Handling in Integration', () => {
    it('should handle subscriber callback errors gracefully', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      const goodData: InstrumentData[] = [];
      
      // Subscriber that throws error
      service.subscribe(null, () => {
        throw new Error('Subscriber error');
      });

      // Subscriber that works
      service.subscribe(null, (data) => {
        goodData.push(data);
      });

      await service.connect(config);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Good subscriber should still receive data despite error in other subscriber
      expect(goodData.length).toBeGreaterThan(0);
    });

    it('should handle connection with invalid config gracefully', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: ''
        },
        baudRate: 4800,
        useStub: true
      };

      // Should not throw, stub mode should work regardless
      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);
    });
  });
});
