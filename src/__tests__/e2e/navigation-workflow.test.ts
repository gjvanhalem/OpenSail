/**
 * End-to-End Test: Complete Navigation Workflow
 * Tests: create route → navigate → record track
 */

import { RouteServiceImpl } from '../../services/RouteService';
import { TrackServiceImpl } from '../../services/TrackService';
import { InstrumentServiceImpl } from '../../services/InstrumentService';
import { ProtocolStubSimulator, testScenarios } from '../../protocols/ProtocolStub';
import { Position, Waypoint, InstrumentDataType, InstrumentConfig, StubConfig } from '../../types';

describe('E2E: Complete Navigation Workflow', () => {
  let routeService: RouteServiceImpl;
  let trackService: TrackServiceImpl;
  let instrumentService: InstrumentServiceImpl;
  let protocolStub: ProtocolStubSimulator;

  beforeEach(() => {
    routeService = new RouteServiceImpl();
    trackService = new TrackServiceImpl();
    instrumentService = new InstrumentServiceImpl();
    protocolStub = new ProtocolStubSimulator();
  });

  afterEach(async () => {
    await instrumentService.disconnect();
    protocolStub.stop();
  });

  it('should complete full navigation workflow: create route → navigate → record track', async () => {
    // Step 1: Create a route with multiple waypoints
    const waypoints: Waypoint[] = [
      {
        id: 'wp1',
        position: { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
        name: 'Start Point',
        description: 'Starting location',
        arrivalRadius: 50
      },
      {
        id: 'wp2',
        position: { latitude: 52.1, longitude: 5.1, accuracy: 5, timestamp: Date.now() },
        name: 'Waypoint 1',
        arrivalRadius: 50
      },
      {
        id: 'wp3',
        position: { latitude: 52.2, longitude: 5.2, accuracy: 5, timestamp: Date.now() },
        name: 'Destination',
        arrivalRadius: 50
      }
    ];

    const route = await routeService.createRoute(waypoints);
    expect(route).toBeDefined();
    expect(route.id).toBeDefined();
    expect(route.waypoints.length).toBe(3);
    expect(route.totalDistance).toBeGreaterThan(0);

    // Step 2: Validate the route
    const validation = await routeService.validateRoute(route);
    expect(validation).toBeDefined();
    expect(validation.isValid).toBe(true);

    // Step 3: Set route as active
    await routeService.setActiveRoute(route.id);
    const activeRoute = await routeService.getActiveRoute();
    expect(activeRoute).toBeDefined();
    expect(activeRoute?.id).toBe(route.id);

    // Step 4: Start track recording
    const trackId = await trackService.startRecording('Navigation Test Track');
    expect(trackId).toBeDefined();

    // Step 5: Connect instrument service with stub
    const instrumentConfig: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      baudRate: 4800,
      useStub: true
    };

    await instrumentService.connect(instrumentConfig);
    expect(instrumentService.getConnectionStatus()).toBe(true);

    // Step 6: Set up protocol stub with GPS track
    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate: 10,
      outputMode: 'callback'
    };

    protocolStub.setScenario(testScenarios.coastalNavigation);
    protocolStub.start(stubConfig);

    // Step 7: Subscribe to GPS data and record positions
    const positions: Position[] = [];
    instrumentService.subscribe(InstrumentDataType.GPS, (data) => {
      if (data.type === InstrumentDataType.GPS && data.value) {
        positions.push(data.value);
      }
    });

    // Wait for some GPS data to be collected
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 8: Stop track recording
    await trackService.stopRecording();

    // Step 9: Verify track was recorded
    const track = await trackService.getTrack(trackId);
    expect(track).toBeDefined();
    expect(track.points.length).toBeGreaterThan(0);
    expect(track.distance).toBeGreaterThan(0);

    // Step 10: Export track to GPX
    const gpxData = await trackService.exportTrack(trackId, 'gpx');
    expect(gpxData).toBeDefined();
    expect(gpxData).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(gpxData).toContain('<gpx');
    expect(gpxData).toContain('</gpx>');

    // Step 11: Convert track to route
    const newRoute = await trackService.convertToRoute(trackId);
    expect(newRoute).toBeDefined();
    expect(newRoute.waypoints.length).toBeGreaterThan(0);

    // Step 12: Export original route to GPX
    const routeGpx = await routeService.exportRoute(route.id, 'gpx');
    expect(routeGpx).toBeDefined();
    expect(routeGpx).toContain('<rte>');

    // Verify workflow completed successfully
    expect(positions.length).toBeGreaterThan(0);
    expect(track.points.length).toBeGreaterThan(0);
  }, 15000);

  it('should handle navigation with real-time instrument data', async () => {
    // Create route
    const waypoints: Waypoint[] = [
      {
        id: 'wp1',
        position: { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
        name: 'Start',
        arrivalRadius: 50
      },
      {
        id: 'wp2',
        position: { latitude: 52.5, longitude: 5.5, accuracy: 5, timestamp: Date.now() },
        name: 'End',
        arrivalRadius: 50
      }
    ];

    const route = await routeService.createRoute(waypoints);
    await routeService.setActiveRoute(route.id);

    // Start tracking
    const trackId = await trackService.startRecording('Instrument Data Test');

    // Connect instruments
    const config: InstrumentConfig = {
      protocol: 'nmea0183',
      connection: { type: 'serial', port: 'COM3' },
      useStub: true
    };

    await instrumentService.connect(config);

    // Set up stub with comprehensive data
    const stubConfig: StubConfig = {
      protocols: ['nmea0183'],
      updateRate: 10,
      outputMode: 'callback'
    };

    protocolStub.setScenario(testScenarios.coastalNavigation);
    protocolStub.start(stubConfig);

    // Collect various instrument data types
    const dataCollected = {
      gps: false,
      depth: false,
      wind: false,
      speed: false
    };

    instrumentService.subscribe(null, (data) => {
      if (data.type === InstrumentDataType.GPS) dataCollected.gps = true;
      if (data.type === InstrumentDataType.Depth) dataCollected.depth = true;
      if (data.type === InstrumentDataType.Wind) dataCollected.wind = true;
      if (data.type === InstrumentDataType.Speed) dataCollected.speed = true;
    });

    // Wait for data collection
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Stop tracking
    await trackService.stopRecording();

    // Verify all data types were received
    expect(dataCollected.gps).toBe(true);
    expect(dataCollected.depth).toBe(true);
    expect(dataCollected.wind).toBe(true);
    expect(dataCollected.speed).toBe(true);

    // Verify track was recorded
    const track = await trackService.getTrack(trackId);
    expect(track.points.length).toBeGreaterThan(0);
  }, 15000);

  it('should handle route modification during navigation', async () => {
    // Create initial route
    const waypoints: Waypoint[] = [
      {
        id: 'wp1',
        position: { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
        name: 'Start',
        arrivalRadius: 50
      },
      {
        id: 'wp2',
        position: { latitude: 52.1, longitude: 5.1, accuracy: 5, timestamp: Date.now() },
        name: 'End',
        arrivalRadius: 50
      }
    ];

    const route = await routeService.createRoute(waypoints);
    await routeService.setActiveRoute(route.id);

    // Start tracking
    const trackId = await trackService.startRecording('Route Modification Test');

    // Modify route by adding waypoint
    const updatedWaypoints: Waypoint[] = [
      ...waypoints,
      {
        id: 'wp3',
        position: { latitude: 52.15, longitude: 5.15, accuracy: 5, timestamp: Date.now() },
        name: 'New Waypoint',
        arrivalRadius: 50
      }
    ];

    const updatedRoute = await routeService.updateRoute(route.id, updatedWaypoints);
    expect(updatedRoute).toBeDefined();
    expect(updatedRoute?.waypoints.length).toBe(3);

    // Verify active route is updated
    const activeRoute = await routeService.getActiveRoute();
    expect(activeRoute?.waypoints.length).toBe(3);

    // Stop tracking
    await trackService.stopRecording();

    // Verify track was recorded
    const track = await trackService.getTrack(trackId);
    expect(track).toBeDefined();
  }, 10000);
});
