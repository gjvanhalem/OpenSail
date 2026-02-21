/**
 * End-to-End Test: Offline Mode
 * Tests: disconnect network → verify full functionality
 */

import { RouteServiceImpl } from '../../services/RouteService';
import { TrackServiceImpl } from '../../services/TrackService';
import { LogbookServiceImpl } from '../../services/LogbookService';
import { SettingsServiceImpl } from '../../services/SettingsService';
import { SyncManagerImpl } from '../../services/SyncManager';
import { Position, Waypoint } from '../../types';

describe('E2E: Offline Mode Functionality', () => {
  let routeService: RouteServiceImpl;
  let trackService: TrackServiceImpl;
  let logbookService: LogbookServiceImpl;
  let settingsService: SettingsServiceImpl;
  let syncManager: SyncManagerImpl;

  beforeEach(() => {
    routeService = new RouteServiceImpl();
    trackService = new TrackServiceImpl();
    logbookService = new LogbookServiceImpl();
    settingsService = new SettingsServiceImpl();
    syncManager = new SyncManagerImpl();
  });

  it('should create and manage routes in offline mode', async () => {
    // Simulate offline mode
    syncManager.setOnlineStatus(false);
    expect(syncManager.isOnline()).toBe(false);

    // Create route offline
    const waypoints: Waypoint[] = [
      {
        id: 'wp1',
        position: { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
        name: 'Offline Start',
        arrivalRadius: 50
      },
      {
        id: 'wp2',
        position: { latitude: 52.1, longitude: 5.1, accuracy: 5, timestamp: Date.now() },
        name: 'Offline End',
        arrivalRadius: 50
      }
    ];

    const route = await routeService.createRoute(waypoints);
    expect(route).toBeDefined();
    expect(route.id).toBeDefined();

    // Validate route offline
    const validation = await routeService.validateRoute(route);
    expect(validation).toBeDefined();
    expect(validation.isValid).toBe(true);

    // Export route offline
    const gpxData = await routeService.exportRoute(route.id, 'gpx');
    expect(gpxData).toBeDefined();
    expect(gpxData).toContain('<gpx');

    // Set as active route
    await routeService.setActiveRoute(route.id);
    const activeRoute = await routeService.getActiveRoute();
    expect(activeRoute?.id).toBe(route.id);

    // Verify operation was queued for sync
    const queuedOps = syncManager.getQueuedOperations();
    expect(queuedOps.length).toBeGreaterThan(0);
  });

  it('should record tracks in offline mode', async () => {
    // Set offline
    syncManager.setOnlineStatus(false);

    // Start track recording
    const trackId = await trackService.startRecording('Offline Track');
    expect(trackId).toBeDefined();

    // Simulate position updates
    const positions: Position[] = [
      { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
      { latitude: 52.01, longitude: 5.01, accuracy: 5, timestamp: Date.now() + 1000 },
      { latitude: 52.02, longitude: 5.02, accuracy: 5, timestamp: Date.now() + 2000 }
    ];

    for (const pos of positions) {
      await trackService.recordPosition(pos, 5.0, 90);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Stop recording
    await trackService.stopRecording();

    // Retrieve track
    const track = await trackService.getTrack(trackId);
    expect(track).toBeDefined();
    expect(track.points.length).toBeGreaterThanOrEqual(3);
    expect(track.distance).toBeGreaterThan(0);

    // Export track offline
    const gpxData = await trackService.exportTrack(trackId, 'gpx');
    expect(gpxData).toBeDefined();
    expect(gpxData).toContain('<trk>');
  });

  it('should maintain logbook in offline mode', async () => {
    // Set offline
    syncManager.setOnlineStatus(false);

    // Start voyage
    const voyageId = await logbookService.startVoyage();
    expect(voyageId).toBeDefined();

    // Add logbook entries
    await logbookService.addEntry({
      id: 'entry1',
      voyageId,
      timestamp: new Date(),
      position: { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
      type: 'note',
      notes: 'Departed harbor'
    });

    await logbookService.addEntry({
      id: 'entry2',
      voyageId,
      timestamp: new Date(),
      position: { latitude: 52.1, longitude: 5.1, accuracy: 5, timestamp: Date.now() },
      type: 'waypoint',
      notes: 'Passed buoy'
    });

    // End voyage
    await logbookService.endVoyage();

    // Retrieve entries
    const entries = await logbookService.getEntries({ voyageId });
    expect(entries.length).toBeGreaterThanOrEqual(2);

    // Export logbook offline
    const csvData = await logbookService.exportLogbook('csv');
    expect(csvData).toBeDefined();
    expect(csvData).toContain('timestamp');
  });

  it('should manage settings in offline mode', async () => {
    // Set offline
    syncManager.setOnlineStatus(false);

    // Update settings
    await settingsService.updateSetting('units.distance', 'nautical');
    await settingsService.updateSetting('units.speed', 'knots');
    await settingsService.updateSetting('display.chartRotation', 'heading-up');
    await settingsService.updateSetting('alerts.anchorWatch.enabled', true);

    // Retrieve settings
    const distanceUnit = await settingsService.getSetting('units.distance');
    expect(distanceUnit).toBe('nautical');

    const speedUnit = await settingsService.getSetting('units.speed');
    expect(speedUnit).toBe('knots');

    const chartRotation = await settingsService.getSetting('display.chartRotation');
    expect(chartRotation).toBe('heading-up');

    const anchorWatch = await settingsService.getSetting('alerts.anchorWatch.enabled');
    expect(anchorWatch).toBe(true);

    // Get all settings
    const allSettings = await settingsService.getAllSettings();
    expect(allSettings).toBeDefined();
    expect(Object.keys(allSettings).length).toBeGreaterThan(0);
  });

  it('should queue operations for sync when offline', async () => {
    // Set offline
    syncManager.setOnlineStatus(false);

    // Perform multiple operations
    const waypoints: Waypoint[] = [
      {
        id: 'wp1',
        position: { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
        name: 'Point A',
        arrivalRadius: 50
      },
      {
        id: 'wp2',
        position: { latitude: 52.1, longitude: 5.1, accuracy: 5, timestamp: Date.now() },
        name: 'Point B',
        arrivalRadius: 50
      }
    ];

    const route1 = await routeService.createRoute(waypoints);
    const route2 = await routeService.createRoute(waypoints);
    
    await settingsService.updateSetting('test.key', 'test.value');

    // Check queued operations
    const queuedOps = syncManager.getQueuedOperations();
    expect(queuedOps.length).toBeGreaterThan(0);

    // Verify operations are queued
    const routeOps = queuedOps.filter(op => op.type === 'route');
    expect(routeOps.length).toBeGreaterThan(0);
  });

  it('should sync queued operations when coming back online', async () => {
    // Start offline
    syncManager.setOnlineStatus(false);

    // Create data offline
    const waypoints: Waypoint[] = [
      {
        id: 'wp1',
        position: { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
        name: 'Sync Test',
        arrivalRadius: 50
      },
      {
        id: 'wp2',
        position: { latitude: 52.1, longitude: 5.1, accuracy: 5, timestamp: Date.now() },
        name: 'Sync End',
        arrivalRadius: 50
      }
    ];

    await routeService.createRoute(waypoints);
    await settingsService.updateSetting('sync.test', 'value');

    const queuedBefore = syncManager.getQueuedOperations();
    expect(queuedBefore.length).toBeGreaterThan(0);

    // Go back online
    syncManager.setOnlineStatus(true);
    expect(syncManager.isOnline()).toBe(true);

    // Trigger sync
    await syncManager.syncNow();

    // Wait for sync to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify queue is processed
    const queuedAfter = syncManager.getQueuedOperations();
    expect(queuedAfter.length).toBeLessThanOrEqual(queuedBefore.length);
  });

  it('should handle offline-to-online transition seamlessly', async () => {
    // Start online
    syncManager.setOnlineStatus(true);

    // Create route online
    const waypoints1: Waypoint[] = [
      {
        id: 'wp1',
        position: { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
        name: 'Online Point',
        arrivalRadius: 50
      },
      {
        id: 'wp2',
        position: { latitude: 52.1, longitude: 5.1, accuracy: 5, timestamp: Date.now() },
        name: 'Online End',
        arrivalRadius: 50
      }
    ];

    const route1 = await routeService.createRoute(waypoints1);
    expect(route1).toBeDefined();

    // Go offline
    syncManager.setOnlineStatus(false);

    // Create route offline
    const waypoints2: Waypoint[] = [
      {
        id: 'wp3',
        position: { latitude: 52.2, longitude: 5.2, accuracy: 5, timestamp: Date.now() },
        name: 'Offline Point',
        arrivalRadius: 50
      },
      {
        id: 'wp4',
        position: { latitude: 52.3, longitude: 5.3, accuracy: 5, timestamp: Date.now() },
        name: 'Offline End',
        arrivalRadius: 50
      }
    ];

    const route2 = await routeService.createRoute(waypoints2);
    expect(route2).toBeDefined();

    // Go back online
    syncManager.setOnlineStatus(true);
    await syncManager.syncNow();

    // Verify both routes are accessible
    const allRoutes = await routeService.getAllRoutes();
    expect(allRoutes.length).toBeGreaterThanOrEqual(2);

    const foundRoute1 = allRoutes.find(r => r.id === route1.id);
    const foundRoute2 = allRoutes.find(r => r.id === route2.id);
    expect(foundRoute1).toBeDefined();
    expect(foundRoute2).toBeDefined();
  });

  it('should maintain data integrity across offline/online transitions', async () => {
    // Create baseline data online
    syncManager.setOnlineStatus(true);

    const trackId = await trackService.startRecording('Integrity Test');
    await trackService.recordPosition(
      { latitude: 52.0, longitude: 5.0, accuracy: 5, timestamp: Date.now() },
      5.0,
      90
    );

    // Go offline
    syncManager.setOnlineStatus(false);

    // Add more data offline
    await trackService.recordPosition(
      { latitude: 52.01, longitude: 5.01, accuracy: 5, timestamp: Date.now() },
      5.0,
      90
    );
    await trackService.recordPosition(
      { latitude: 52.02, longitude: 5.02, accuracy: 5, timestamp: Date.now() },
      5.0,
      90
    );

    await trackService.stopRecording();

    // Go back online
    syncManager.setOnlineStatus(true);
    await syncManager.syncNow();

    // Verify data integrity
    const track = await trackService.getTrack(trackId);
    expect(track).toBeDefined();
    expect(track.points.length).toBeGreaterThanOrEqual(3);

    // Verify all points are present
    const latitudes = track.points.map(p => p.position.latitude);
    expect(latitudes).toContain(52.0);
    expect(latitudes).toContain(52.01);
    expect(latitudes).toContain(52.02);
  });
});
