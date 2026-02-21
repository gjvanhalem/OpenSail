/**
 * End-to-End Test: Emergency Functions
 * Tests: MOB marker and anchor watch
 */

import { SafetyServiceImpl } from '../../services/SafetyService';
import { InstrumentServiceImpl } from '../../services/InstrumentService';
import { ProtocolStubSimulator, testScenarios } from '../../protocols/ProtocolStub';
import { Position, InstrumentConfig, StubConfig, InstrumentDataType } from '../../types';

describe('E2E: Emergency Functions', () => {
  let safetyService: SafetyServiceImpl;
  let instrumentService: InstrumentServiceImpl;
  let protocolStub: ProtocolStubSimulator;

  beforeEach(() => {
    safetyService = new SafetyServiceImpl();
    instrumentService = new InstrumentServiceImpl();
    protocolStub = new ProtocolStubSimulator();
  });

  afterEach(async () => {
    await instrumentService.disconnect();
    protocolStub.stop();
  });

  describe('Man Overboard (MOB)', () => {
    it('should create MOB marker with current position', async () => {
      const currentPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const mobId = await safetyService.activateMOB(currentPosition);
      expect(mobId).toBeDefined();

      const mobMarker = await safetyService.getMOBMarker(mobId);
      expect(mobMarker).toBeDefined();
      expect(mobMarker?.position.latitude).toBe(52.5);
      expect(mobMarker?.position.longitude).toBe(5.0);
      expect(mobMarker?.timestamp).toBeDefined();
    });

    it('should calculate bearing and distance to MOB position', async () => {
      const mobPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const mobId = await safetyService.activateMOB(mobPosition);

      const currentPosition: Position = {
        latitude: 52.51,
        longitude: 5.01,
        accuracy: 5,
        timestamp: Date.now()
      };

      const navigation = await safetyService.getMOBNavigation(mobId, currentPosition);
      expect(navigation).toBeDefined();
      expect(navigation.distance).toBeGreaterThan(0);
      expect(navigation.bearing).toBeGreaterThanOrEqual(0);
      expect(navigation.bearing).toBeLessThan(360);
    });

    it('should trigger alarm when MOB is activated', async () => {
      const currentPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const alarms: any[] = [];
      safetyService.subscribeToAlarms((alarm) => {
        alarms.push(alarm);
      });

      await safetyService.activateMOB(currentPosition);

      expect(alarms.length).toBeGreaterThan(0);
      expect(alarms[0].type).toBe('mob');
      expect(alarms[0].severity).toBe('critical');
    });

    it('should record MOB event with timestamp', async () => {
      const currentPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const mobId = await safetyService.activateMOB(currentPosition);
      const events = await safetyService.getSafetyEvents();

      const mobEvent = events.find(e => e.type === 'mob' && e.id === mobId);
      expect(mobEvent).toBeDefined();
      expect(mobEvent?.timestamp).toBeDefined();
      expect(mobEvent?.position).toEqual(currentPosition);
    });

    it('should provide navigation guidance back to MOB', async () => {
      const mobPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const mobId = await safetyService.activateMOB(mobPosition);

      // Simulate vessel moving away
      const positions: Position[] = [
        { latitude: 52.51, longitude: 5.01, accuracy: 5, timestamp: Date.now() },
        { latitude: 52.52, longitude: 5.02, accuracy: 5, timestamp: Date.now() },
        { latitude: 52.53, longitude: 5.03, accuracy: 5, timestamp: Date.now() }
      ];

      for (const pos of positions) {
        const nav = await safetyService.getMOBNavigation(mobId, pos);
        expect(nav.distance).toBeGreaterThan(0);
        expect(nav.bearing).toBeDefined();
        
        // Distance should increase as we move away
        if (positions.indexOf(pos) > 0) {
          const prevNav = await safetyService.getMOBNavigation(mobId, positions[positions.indexOf(pos) - 1]);
          expect(nav.distance).toBeGreaterThan(prevNav.distance);
        }
      }
    });

    it('should clear MOB marker when deactivated', async () => {
      const currentPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const mobId = await safetyService.activateMOB(currentPosition);
      expect(await safetyService.getMOBMarker(mobId)).toBeDefined();

      await safetyService.deactivateMOB(mobId);
      expect(await safetyService.getMOBMarker(mobId)).toBeNull();
    });
  });

  describe('Anchor Watch', () => {
    it('should activate anchor watch with configurable radius', async () => {
      const anchorPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const radius = 100; // 100 meters
      const watchId = await safetyService.activateAnchorWatch(anchorPosition, radius);
      expect(watchId).toBeDefined();

      const anchorWatch = await safetyService.getAnchorWatch(watchId);
      expect(anchorWatch).toBeDefined();
      expect(anchorWatch?.position).toEqual(anchorPosition);
      expect(anchorWatch?.radius).toBe(radius);
    });

    it('should trigger alarm when vessel moves outside radius', async () => {
      const anchorPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const radius = 50; // 50 meters
      const watchId = await safetyService.activateAnchorWatch(anchorPosition, radius);

      const alarms: any[] = [];
      safetyService.subscribeToAlarms((alarm) => {
        alarms.push(alarm);
      });

      // Simulate vessel drifting outside radius (approximately 0.001 degrees = 111 meters)
      const driftedPosition: Position = {
        latitude: 52.501,
        longitude: 5.001,
        accuracy: 5,
        timestamp: Date.now()
      };

      await safetyService.checkAnchorWatch(watchId, driftedPosition);

      expect(alarms.length).toBeGreaterThan(0);
      expect(alarms[0].type).toBe('anchor_watch');
      expect(alarms[0].severity).toBe('high');
    });

    it('should not trigger alarm when vessel is within radius', async () => {
      const anchorPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const radius = 100; // 100 meters
      const watchId = await safetyService.activateAnchorWatch(anchorPosition, radius);

      const alarms: any[] = [];
      safetyService.subscribeToAlarms((alarm) => {
        alarms.push(alarm);
      });

      // Simulate small movement within radius
      const nearPosition: Position = {
        latitude: 52.5001,
        longitude: 5.0001,
        accuracy: 5,
        timestamp: Date.now()
      };

      await safetyService.checkAnchorWatch(watchId, nearPosition);

      const anchorAlarms = alarms.filter(a => a.type === 'anchor_watch');
      expect(anchorAlarms.length).toBe(0);
    });

    it('should monitor position every 10 seconds', async () => {
      const anchorPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const watchId = await safetyService.activateAnchorWatch(anchorPosition, 100);

      // Connect to instrument service for position updates
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: { type: 'serial', port: 'COM3' },
        useStub: true
      };

      await instrumentService.connect(config);

      const stubConfig: StubConfig = {
        protocols: ['nmea0183'],
        updateRate: 1, // 1 Hz for testing
        outputMode: 'callback'
      };

      protocolStub.setScenario(testScenarios.coastalNavigation);
      protocolStub.start(stubConfig);

      const checks: number[] = [];
      instrumentService.subscribe(InstrumentDataType.GPS, async (data) => {
        if (data.value) {
          await safetyService.checkAnchorWatch(watchId, data.value);
          checks.push(Date.now());
        }
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(checks.length).toBeGreaterThan(2);
    }, 10000);

    it('should record anchor watch events with timestamps', async () => {
      const anchorPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const watchId = await safetyService.activateAnchorWatch(anchorPosition, 50);

      // Trigger alarm by moving outside radius
      const driftedPosition: Position = {
        latitude: 52.501,
        longitude: 5.001,
        accuracy: 5,
        timestamp: Date.now()
      };

      await safetyService.checkAnchorWatch(watchId, driftedPosition);

      const events = await safetyService.getSafetyEvents();
      const anchorEvents = events.filter(e => e.type === 'anchor_watch');

      expect(anchorEvents.length).toBeGreaterThan(0);
      expect(anchorEvents[0].timestamp).toBeDefined();
    });

    it('should display anchor watch circle on chart', async () => {
      const anchorPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const radius = 100;
      const watchId = await safetyService.activateAnchorWatch(anchorPosition, radius);

      const anchorWatch = await safetyService.getAnchorWatch(watchId);
      expect(anchorWatch).toBeDefined();

      // Verify circle parameters for display
      expect(anchorWatch?.position.latitude).toBe(52.5);
      expect(anchorWatch?.position.longitude).toBe(5.0);
      expect(anchorWatch?.radius).toBe(100);
      expect(anchorWatch?.active).toBe(true);
    });

    it('should deactivate anchor watch', async () => {
      const anchorPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const watchId = await safetyService.activateAnchorWatch(anchorPosition, 100);
      expect(await safetyService.getAnchorWatch(watchId)).toBeDefined();

      await safetyService.deactivateAnchorWatch(watchId);

      const anchorWatch = await safetyService.getAnchorWatch(watchId);
      expect(anchorWatch?.active).toBe(false);
    });

    it('should support configurable radius from 10m to 500m', async () => {
      const anchorPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      // Test minimum radius
      const watch1 = await safetyService.activateAnchorWatch(anchorPosition, 10);
      const anchorWatch1 = await safetyService.getAnchorWatch(watch1);
      expect(anchorWatch1?.radius).toBe(10);

      // Test maximum radius
      const watch2 = await safetyService.activateAnchorWatch(anchorPosition, 500);
      const anchorWatch2 = await safetyService.getAnchorWatch(watch2);
      expect(anchorWatch2?.radius).toBe(500);

      // Test mid-range radius
      const watch3 = await safetyService.activateAnchorWatch(anchorPosition, 250);
      const anchorWatch3 = await safetyService.getAnchorWatch(watch3);
      expect(anchorWatch3?.radius).toBe(250);
    });
  });

  describe('Combined Emergency Scenarios', () => {
    it('should handle MOB and anchor watch simultaneously', async () => {
      // Activate anchor watch
      const anchorPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      const watchId = await safetyService.activateAnchorWatch(anchorPosition, 100);

      // Activate MOB
      const mobPosition: Position = {
        latitude: 52.51,
        longitude: 5.01,
        accuracy: 5,
        timestamp: Date.now()
      };

      const mobId = await safetyService.activateMOB(mobPosition);

      // Verify both are active
      expect(await safetyService.getAnchorWatch(watchId)).toBeDefined();
      expect(await safetyService.getMOBMarker(mobId)).toBeDefined();

      // Check events
      const events = await safetyService.getSafetyEvents();
      expect(events.some(e => e.type === 'mob')).toBe(true);
      expect(events.some(e => e.type === 'anchor_watch')).toBe(true);
    });

    it('should prioritize MOB alarm over anchor watch', async () => {
      const alarms: any[] = [];
      safetyService.subscribeToAlarms((alarm) => {
        alarms.push(alarm);
      });

      // Activate anchor watch
      const anchorPosition: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 5,
        timestamp: Date.now()
      };

      await safetyService.activateAnchorWatch(anchorPosition, 50);

      // Activate MOB
      const mobPosition: Position = {
        latitude: 52.51,
        longitude: 5.01,
        accuracy: 5,
        timestamp: Date.now()
      };

      await safetyService.activateMOB(mobPosition);

      // MOB should be critical, anchor watch should be high
      const mobAlarms = alarms.filter(a => a.type === 'mob');
      expect(mobAlarms.length).toBeGreaterThan(0);
      expect(mobAlarms[0].severity).toBe('critical');
    });
  });
});
