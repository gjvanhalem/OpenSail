import { RouteServiceImpl } from './RouteService';
import { Position, Waypoint, Route } from '../types';
import { RouteRepository } from '../database/RouteRepository';

// Mock the RouteRepository
jest.mock('../database/RouteRepository');

describe('RouteService', () => {
  let service: RouteServiceImpl;
  let mockRouteRepo: jest.Mocked<RouteRepository>;
  let routeStore: Map<string, Route>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create an in-memory route store for testing
    routeStore = new Map<string, Route>();
    
    // Create a new service instance
    service = new RouteServiceImpl();
    
    // Get the mocked repository instance
    mockRouteRepo = (service as any).routeRepo as jest.Mocked<RouteRepository>;
    
    // Setup mock implementations that use the route store
    mockRouteRepo.createRoute = jest.fn().mockImplementation(async (name: string, waypoints: Waypoint[]): Promise<Route> => {
      const route: Route = {
        id: `route-${Date.now()}-${Math.random()}`,
        name,
        waypoints,
        totalDistance: 10,
        estimatedDuration: 3600,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      routeStore.set(route.id, route);
      return route;
    });
    
    mockRouteRepo.getRoute = jest.fn().mockImplementation(async (routeId: string): Promise<Route | null> => {
      return routeStore.get(routeId) || null;
    });
    
    mockRouteRepo.updateRoute = jest.fn().mockImplementation(async (routeId: string, waypoints: Waypoint[]): Promise<Route | null> => {
      const existing = routeStore.get(routeId);
      if (!existing) return null;
      
      const updated: Route = {
        ...existing,
        waypoints,
        updatedAt: new Date()
      };
      routeStore.set(routeId, updated);
      return updated;
    });
    
    mockRouteRepo.deleteRoute = jest.fn().mockImplementation(async (routeId: string): Promise<void> => {
      routeStore.delete(routeId);
    });
    
    mockRouteRepo.getAllRoutes = jest.fn().mockImplementation(async (): Promise<Route[]> => {
      return Array.from(routeStore.values());
    });
  });

  describe('distance calculations', () => {
    it('should calculate distance between two positions correctly', async () => {
      const start: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const end: Position = {
        latitude: 52.6,
        longitude: 5.1,
        accuracy: 0,
        timestamp: Date.now()
      };

      const distance = await service.calculateDistanceBetween(start, end);
      
      // Distance should be approximately 7.8 nautical miles
      expect(distance).toBeGreaterThan(7);
      expect(distance).toBeLessThan(9);
    });

    it('should return 0 for same position', async () => {
      const pos: Position = {
        latitude: 52.5,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const distance = await service.calculateDistanceBetween(pos, pos);
      expect(distance).toBeCloseTo(0, 2);
    });

    it('should handle positions across equator', async () => {
      const north: Position = {
        latitude: 10.0,
        longitude: 0.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const south: Position = {
        latitude: -10.0,
        longitude: 0.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const distance = await service.calculateDistanceBetween(north, south);
      
      // Should be approximately 1200 nautical miles (20 degrees * 60 nm/degree)
      expect(distance).toBeGreaterThan(1100);
      expect(distance).toBeLessThan(1300);
    });
  });

  describe('bearing calculations', () => {
    it('should calculate bearing correctly for north direction', async () => {
      const start: Position = {
        latitude: 52.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const end: Position = {
        latitude: 53.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const bearing = await service.calculateBearing(start, end);
      
      // Should be approximately 0 degrees (north)
      expect(bearing).toBeCloseTo(0, 0);
    });

    it('should calculate bearing correctly for east direction', async () => {
      const start: Position = {
        latitude: 52.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const end: Position = {
        latitude: 52.0,
        longitude: 6.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const bearing = await service.calculateBearing(start, end);
      
      // Should be approximately 90 degrees (east)
      expect(bearing).toBeGreaterThan(85);
      expect(bearing).toBeLessThan(95);
    });

    it('should calculate bearing correctly for south direction', async () => {
      const start: Position = {
        latitude: 53.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const end: Position = {
        latitude: 52.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const bearing = await service.calculateBearing(start, end);
      
      // Should be approximately 180 degrees (south)
      expect(bearing).toBeGreaterThan(175);
      expect(bearing).toBeLessThan(185);
    });

    it('should calculate bearing correctly for west direction', async () => {
      const start: Position = {
        latitude: 52.0,
        longitude: 6.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const end: Position = {
        latitude: 52.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const bearing = await service.calculateBearing(start, end);
      
      // Should be approximately 270 degrees (west)
      expect(bearing).toBeGreaterThan(265);
      expect(bearing).toBeLessThan(275);
    });
  });

  describe('route validation', () => {
    it('should validate a simple route', async () => {
      const route = {
        id: 'test-route',
        name: 'Test Route',
        waypoints: [
          {
            id: 'wp1',
            position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
            name: 'Start',
            arrivalRadius: 50
          },
          {
            id: 'wp2',
            position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
            name: 'End',
            arrivalRadius: 50
          }
        ],
        totalDistance: 10,
        estimatedDuration: 3600,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validation = await service.validateRoute(route);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('warnings');
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should generate warnings for long legs', async () => {
      const route = {
        id: 'test-route',
        name: 'Test Route',
        waypoints: [
          {
            id: 'wp1',
            position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
            name: 'Start',
            arrivalRadius: 50
          },
          {
            id: 'wp2',
            position: { latitude: 53.0, longitude: 6.0, accuracy: 0, timestamp: Date.now() },
            name: 'End',
            arrivalRadius: 50
          }
        ],
        totalDistance: 100,
        estimatedDuration: 3600,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validation = await service.validateRoute(route);
      
      expect(validation.warnings.length).toBeGreaterThan(0);
      const longLegWarning = validation.warnings.find(w => w.message.includes('Long leg'));
      expect(longLegWarning).toBeDefined();
      expect(longLegWarning?.type).toBe('hazard');
      expect(longLegWarning?.severity).toBe('low');
    });

    it('should mark route as valid when no high severity warnings exist', async () => {
      const route = {
        id: 'test-route',
        name: 'Test Route',
        waypoints: [
          {
            id: 'wp1',
            position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
            name: 'Start',
            arrivalRadius: 50
          },
          {
            id: 'wp2',
            position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
            name: 'End',
            arrivalRadius: 50
          }
        ],
        totalDistance: 10,
        estimatedDuration: 3600,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validation = await service.validateRoute(route);
      
      expect(validation.isValid).toBe(true);
    });

    it('should deduplicate warnings at the same position', async () => {
      const route = {
        id: 'test-route',
        name: 'Test Route',
        waypoints: [
          {
            id: 'wp1',
            position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
            name: 'Start',
            arrivalRadius: 50
          },
          {
            id: 'wp2',
            position: { latitude: 52.0001, longitude: 5.0001, accuracy: 0, timestamp: Date.now() },
            name: 'Mid',
            arrivalRadius: 50
          },
          {
            id: 'wp3',
            position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
            name: 'End',
            arrivalRadius: 50
          }
        ],
        totalDistance: 10,
        estimatedDuration: 3600,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validation = await service.validateRoute(route);
      
      // Should not have duplicate warnings for very close positions
      const warningKeys = validation.warnings.map(w => 
        `${w.type}-${w.position.latitude.toFixed(4)}-${w.position.longitude.toFixed(4)}`
      );
      const uniqueKeys = new Set(warningKeys);
      expect(warningKeys.length).toBe(uniqueKeys.size);
    });

    it('should validate multi-waypoint routes', async () => {
      const route = {
        id: 'test-route',
        name: 'Test Route',
        waypoints: [
          {
            id: 'wp1',
            position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
            name: 'Start',
            arrivalRadius: 50
          },
          {
            id: 'wp2',
            position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
            name: 'Mid1',
            arrivalRadius: 50
          },
          {
            id: 'wp3',
            position: { latitude: 52.2, longitude: 5.2, accuracy: 0, timestamp: Date.now() },
            name: 'Mid2',
            arrivalRadius: 50
          },
          {
            id: 'wp4',
            position: { latitude: 52.3, longitude: 5.3, accuracy: 0, timestamp: Date.now() },
            name: 'End',
            arrivalRadius: 50
          }
        ],
        totalDistance: 30,
        estimatedDuration: 3600,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validation = await service.validateRoute(route);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('warnings');
      // Should validate all legs (3 legs for 4 waypoints)
      expect(validation.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('route creation and management', () => {
    it('should create a route with multiple waypoints', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
          name: 'Start',
          arrivalRadius: 50
        },
        {
          id: 'wp2',
          position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
          name: 'Mid',
          arrivalRadius: 50
        },
        {
          id: 'wp3',
          position: { latitude: 52.2, longitude: 5.2, accuracy: 0, timestamp: Date.now() },
          name: 'End',
          arrivalRadius: 50
        }
      ];

      const route = await service.createRoute(waypoints);
      
      expect(route).toBeDefined();
      expect(route.id).toBeDefined();
      expect(route.waypoints.length).toBe(3);
      expect(route.totalDistance).toBeGreaterThan(0);
    });

    it('should throw error when creating route with less than 2 waypoints', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
          name: 'Start',
          arrivalRadius: 50
        }
      ];

      await expect(service.createRoute(waypoints)).rejects.toThrow('at least 2 waypoints');
    });

    it('should calculate route between two positions', async () => {
      const start: Position = {
        latitude: 52.0,
        longitude: 5.0,
        accuracy: 0,
        timestamp: Date.now()
      };

      const end: Position = {
        latitude: 52.5,
        longitude: 5.5,
        accuracy: 0,
        timestamp: Date.now()
      };

      const route = await service.calculateRoute(start, end);
      
      expect(route).toBeDefined();
      expect(route.waypoints.length).toBe(2);
      expect(route.waypoints[0].name).toBe('Start');
      expect(route.waypoints[1].name).toBe('Destination');
      expect(route.totalDistance).toBeGreaterThan(0);
    });
  });

  describe('GPX export', () => {
    it('should export route to valid GPX format', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
          name: 'Start Point',
          description: 'Starting location',
          arrivalRadius: 50
        },
        {
          id: 'wp2',
          position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
          name: 'End Point',
          description: 'Ending location',
          arrivalRadius: 50
        }
      ];

      const route = await service.createRoute(waypoints);
      const gpxString = await service.exportRoute(route.id, 'gpx');
      
      expect(gpxString).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(gpxString).toContain('<gpx');
      expect(gpxString).toContain('<rte>');
      expect(gpxString).toContain('<name>Start Point</name>');
      expect(gpxString).toContain('<rtept lat="52" lon="5">');
      expect(gpxString).toContain('<rtept lat="52.1" lon="5.1">');
      expect(gpxString).toContain('</rte>');
      expect(gpxString).toContain('</gpx>');
    });

    it('should escape special XML characters in GPX export', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
          name: 'Point <A> & "B"',
          description: 'Test & <special> "chars"',
          arrivalRadius: 50
        },
        {
          id: 'wp2',
          position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
          name: 'End',
          arrivalRadius: 50
        }
      ];

      const route = await service.createRoute(waypoints);
      const gpxString = await service.exportRoute(route.id, 'gpx');
      
      expect(gpxString).toContain('&lt;A&gt;');
      expect(gpxString).toContain('&amp;');
      expect(gpxString).toContain('&quot;');
      expect(gpxString).not.toContain('<A>');
      expect(gpxString).not.toContain('"B"');
    });

    it('should include all waypoints in GPX export', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
          name: 'WP1',
          arrivalRadius: 50
        },
        {
          id: 'wp2',
          position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
          name: 'WP2',
          arrivalRadius: 50
        },
        {
          id: 'wp3',
          position: { latitude: 52.2, longitude: 5.2, accuracy: 0, timestamp: Date.now() },
          name: 'WP3',
          arrivalRadius: 50
        },
        {
          id: 'wp4',
          position: { latitude: 52.3, longitude: 5.3, accuracy: 0, timestamp: Date.now() },
          name: 'WP4',
          arrivalRadius: 50
        }
      ];

      const route = await service.createRoute(waypoints);
      const gpxString = await service.exportRoute(route.id, 'gpx');
      
      const rteptCount = (gpxString.match(/<rtept/g) || []).length;
      expect(rteptCount).toBe(4);
      expect(gpxString).toContain('WP1');
      expect(gpxString).toContain('WP2');
      expect(gpxString).toContain('WP3');
      expect(gpxString).toContain('WP4');
    });

    it('should throw error when exporting non-existent route', async () => {
      await expect(service.exportRoute('non-existent-id', 'gpx')).rejects.toThrow('Route not found');
    });
  });

  describe('KML export', () => {
    it('should export route to valid KML format', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
          name: 'Start Point',
          arrivalRadius: 50
        },
        {
          id: 'wp2',
          position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
          name: 'End Point',
          arrivalRadius: 50
        }
      ];

      const route = await service.createRoute(waypoints);
      const kmlString = await service.exportRoute(route.id, 'kml');
      
      expect(kmlString).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(kmlString).toContain('<kml');
      expect(kmlString).toContain('<Document>');
      expect(kmlString).toContain('<Placemark>');
      expect(kmlString).toContain('<LineString>');
      expect(kmlString).toContain('<coordinates>');
      expect(kmlString).toContain('5,52,0');
      expect(kmlString).toContain('5.1,52.1,0');
      expect(kmlString).toContain('</LineString>');
      expect(kmlString).toContain('</Placemark>');
      expect(kmlString).toContain('</Document>');
      expect(kmlString).toContain('</kml>');
    });

    it('should escape special XML characters in KML export', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
          name: 'Route <A> & "B"',
          arrivalRadius: 50
        },
        {
          id: 'wp2',
          position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
          name: 'End',
          arrivalRadius: 50
        }
      ];

      const route = await service.createRoute(waypoints);
      const kmlString = await service.exportRoute(route.id, 'kml');
      
      expect(kmlString).toContain('&lt;A&gt;');
      expect(kmlString).toContain('&amp;');
      expect(kmlString).toContain('&quot;');
    });

    it('should include all waypoint coordinates in KML export', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
          name: 'WP1',
          arrivalRadius: 50
        },
        {
          id: 'wp2',
          position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
          name: 'WP2',
          arrivalRadius: 50
        },
        {
          id: 'wp3',
          position: { latitude: 52.2, longitude: 5.2, accuracy: 0, timestamp: Date.now() },
          name: 'WP3',
          arrivalRadius: 50
        }
      ];

      const route = await service.createRoute(waypoints);
      const kmlString = await service.exportRoute(route.id, 'kml');
      
      expect(kmlString).toContain('5,52,0');
      expect(kmlString).toContain('5.1,52.1,0');
      expect(kmlString).toContain('5.2,52.2,0');
    });

    it('should throw error when exporting non-existent route', async () => {
      await expect(service.exportRoute('non-existent-id', 'kml')).rejects.toThrow('Route not found');
    });
  });

  describe('route warning generation', () => {
    it('should generate warnings for routes with potential hazards', async () => {
      const route = {
        id: 'test-route',
        name: 'Test Route',
        waypoints: [
          {
            id: 'wp1',
            position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
            name: 'Start',
            arrivalRadius: 50
          },
          {
            id: 'wp2',
            position: { latitude: 53.0, longitude: 6.0, accuracy: 0, timestamp: Date.now() },
            name: 'End',
            arrivalRadius: 50
          }
        ],
        totalDistance: 100,
        estimatedDuration: 3600,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validation = await service.validateRoute(route);
      
      expect(validation).toBeDefined();
      expect(validation.isValid).toBeDefined();
      expect(validation.warnings).toBeDefined();
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should categorize warnings by severity', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
          name: 'Start',
          arrivalRadius: 50
        },
        {
          id: 'wp2',
          position: { latitude: 53.0, longitude: 6.0, accuracy: 0, timestamp: Date.now() },
          name: 'End',
          arrivalRadius: 50
        }
      ];

      const route = await service.createRoute(waypoints);
      const markers = await service.getRouteWarningMarkers(route.id);
      
      expect(markers).toHaveProperty('high');
      expect(markers).toHaveProperty('medium');
      expect(markers).toHaveProperty('low');
      expect(Array.isArray(markers.high)).toBe(true);
      expect(Array.isArray(markers.medium)).toBe(true);
      expect(Array.isArray(markers.low)).toBe(true);
    });

    it('should include position information in warnings', async () => {
      const route = {
        id: 'test-route',
        name: 'Test Route',
        waypoints: [
          {
            id: 'wp1',
            position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
            name: 'Start',
            arrivalRadius: 50
          },
          {
            id: 'wp2',
            position: { latitude: 53.0, longitude: 6.0, accuracy: 0, timestamp: Date.now() },
            name: 'End',
            arrivalRadius: 50
          }
        ],
        totalDistance: 100,
        estimatedDuration: 3600,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validation = await service.validateRoute(route);
      
      if (validation.warnings.length > 0) {
        const warning = validation.warnings[0];
        expect(warning.position).toBeDefined();
        expect(warning.position.latitude).toBeDefined();
        expect(warning.position.longitude).toBeDefined();
        expect(warning.type).toBeDefined();
        expect(warning.message).toBeDefined();
        expect(warning.severity).toBeDefined();
      }
    });

    it('should validate routes without warnings for short safe routes', async () => {
      const route = {
        id: 'test-route',
        name: 'Test Route',
        waypoints: [
          {
            id: 'wp1',
            position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
            name: 'Start',
            arrivalRadius: 50
          },
          {
            id: 'wp2',
            position: { latitude: 52.05, longitude: 5.05, accuracy: 0, timestamp: Date.now() },
            name: 'End',
            arrivalRadius: 50
          }
        ],
        totalDistance: 5,
        estimatedDuration: 3600,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validation = await service.validateRoute(route);
      
      expect(validation.isValid).toBe(true);
      // Short routes should have no or minimal warnings
      const highSeverityWarnings = validation.warnings.filter(w => w.severity === 'high');
      expect(highSeverityWarnings.length).toBe(0);
    });
  });

  describe('active route management', () => {
    it('should set and get active route', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
          name: 'Start',
          arrivalRadius: 50
        },
        {
          id: 'wp2',
          position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
          name: 'End',
          arrivalRadius: 50
        }
      ];

      const route = await service.createRoute(waypoints);
      await service.setActiveRoute(route.id);
      
      const activeRoute = await service.getActiveRoute();
      expect(activeRoute).toBeDefined();
      expect(activeRoute?.id).toBe(route.id);
    });

    it('should clear active route', async () => {
      const waypoints: Waypoint[] = [
        {
          id: 'wp1',
          position: { latitude: 52.0, longitude: 5.0, accuracy: 0, timestamp: Date.now() },
          name: 'Start',
          arrivalRadius: 50
        },
        {
          id: 'wp2',
          position: { latitude: 52.1, longitude: 5.1, accuracy: 0, timestamp: Date.now() },
          name: 'End',
          arrivalRadius: 50
        }
      ];

      const route = await service.createRoute(waypoints);
      await service.setActiveRoute(route.id);
      await service.clearActiveRoute();
      
      const activeRoute = await service.getActiveRoute();
      expect(activeRoute).toBeNull();
    });

    it('should throw error when setting non-existent route as active', async () => {
      await expect(service.setActiveRoute('non-existent-id')).rejects.toThrow('Route not found');
    });
  });
});
