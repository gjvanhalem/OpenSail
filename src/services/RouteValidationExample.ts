/**
 * Route Validation Example
 * 
 * This file demonstrates how to use the route validation features
 * to check routes for shallow water, hazards, and restricted areas.
 */

import { RouteServiceImpl } from './RouteService';
import { Route, Position, Waypoint } from '../types';

/**
 * Example: Validate a route and display warnings
 */
export async function validateRouteExample() {
  const routeService = new RouteServiceImpl();

  // Create a sample route
  const waypoints: Waypoint[] = [
    {
      id: 'wp1',
      position: { latitude: 52.0, longitude: 5.0, accuracy: 10, timestamp: Date.now() },
      name: 'Amsterdam Harbor',
      description: 'Starting point',
      arrivalRadius: 50
    },
    {
      id: 'wp2',
      position: { latitude: 52.5, longitude: 5.5, accuracy: 10, timestamp: Date.now() },
      name: 'Marker Wadden',
      description: 'Intermediate waypoint',
      arrivalRadius: 50
    },
    {
      id: 'wp3',
      position: { latitude: 53.0, longitude: 6.0, accuracy: 10, timestamp: Date.now() },
      name: 'Lauwersoog',
      description: 'Destination',
      arrivalRadius: 50
    }
  ];

  const route = await routeService.createRoute(waypoints);

  // Validate the route
  const validation = await routeService.validateRoute(route);

  console.log('Route Validation Results:');
  console.log(`Valid: ${validation.isValid}`);
  console.log(`Total Warnings: ${validation.warnings.length}`);

  // Display warnings by severity
  const highSeverity = validation.warnings.filter(w => w.severity === 'high');
  const mediumSeverity = validation.warnings.filter(w => w.severity === 'medium');
  const lowSeverity = validation.warnings.filter(w => w.severity === 'low');

  if (highSeverity.length > 0) {
    console.log('\n🔴 HIGH SEVERITY WARNINGS (Route is NOT safe):');
    highSeverity.forEach(w => {
      console.log(`  - ${w.type}: ${w.message}`);
      console.log(`    Position: ${w.position.latitude.toFixed(4)}, ${w.position.longitude.toFixed(4)}`);
    });
  }

  if (mediumSeverity.length > 0) {
    console.log('\n🟡 MEDIUM SEVERITY WARNINGS (Proceed with caution):');
    mediumSeverity.forEach(w => {
      console.log(`  - ${w.type}: ${w.message}`);
      console.log(`    Position: ${w.position.latitude.toFixed(4)}, ${w.position.longitude.toFixed(4)}`);
    });
  }

  if (lowSeverity.length > 0) {
    console.log('\n🟢 LOW SEVERITY WARNINGS (Informational):');
    lowSeverity.forEach(w => {
      console.log(`  - ${w.type}: ${w.message}`);
      console.log(`    Position: ${w.position.latitude.toFixed(4)}, ${w.position.longitude.toFixed(4)}`);
    });
  }

  return validation;
}

/**
 * Example: Get warning markers for chart display
 */
export async function getWarningMarkersExample(routeId: string) {
  const routeService = new RouteServiceImpl();

  // Get warnings grouped by severity for display on chart
  const markers = await routeService.getRouteWarningMarkers(routeId);

  console.log('Warning Markers for Chart Display:');
  console.log(`High severity markers: ${markers.high.length}`);
  console.log(`Medium severity markers: ${markers.medium.length}`);
  console.log(`Low severity markers: ${markers.low.length}`);

  // In a real UI, you would render these markers on the chart:
  // - High severity: Red markers with warning icon
  // - Medium severity: Yellow markers with caution icon
  // - Low severity: Blue markers with info icon

  return markers;
}

/**
 * Example: Validation workflow for route planning
 */
export async function routePlanningWorkflow() {
  const routeService = new RouteServiceImpl();

  // Step 1: Create route
  const waypoints: Waypoint[] = [
    {
      id: 'wp1',
      position: { latitude: 52.0, longitude: 5.0, accuracy: 10, timestamp: Date.now() },
      name: 'Start',
      arrivalRadius: 50
    },
    {
      id: 'wp2',
      position: { latitude: 52.8, longitude: 5.8, accuracy: 10, timestamp: Date.now() },
      name: 'End',
      arrivalRadius: 50
    }
  ];

  const route = await routeService.createRoute(waypoints);
  console.log(`Created route: ${route.name} (${route.id})`);

  // Step 2: Validate route
  const validation = await routeService.validateRoute(route);

  // Step 3: Check if route is safe
  if (!validation.isValid) {
    console.log('⚠️  Route has HIGH SEVERITY warnings and is NOT recommended!');
    console.log('Please modify the route to avoid dangerous areas.');
    return { route, validation, safe: false };
  }

  // Step 4: Display any medium/low warnings
  if (validation.warnings.length > 0) {
    console.log('ℹ️  Route has warnings but is navigable with caution:');
    validation.warnings.forEach(w => {
      console.log(`  - ${w.severity.toUpperCase()}: ${w.message}`);
    });
  } else {
    console.log('✅ Route is clear with no warnings!');
  }

  // Step 5: Activate route for navigation
  await routeService.setActiveRoute(route.id);
  console.log('Route activated for navigation');

  return { route, validation, safe: true };
}

/**
 * Warning Types and Their Meanings:
 * 
 * 1. SHALLOW_WATER
 *    - High severity: Depth < 3.0m (critical - vessel may run aground)
 *    - Medium severity: Depth < 5.0m (caution - limited depth)
 *    - Detected by sampling points along route and checking chart depth data
 * 
 * 2. HAZARD
 *    - High severity: Rocks, wrecks, critical obstructions
 *    - Medium severity: Moderate obstructions
 *    - Low severity: Long legs (>50nm), informational hazards
 *    - Detected by querying chart features along route corridor
 * 
 * 3. RESTRICTED_AREA
 *    - High severity: Prohibited areas (military zones, no-entry areas)
 *    - Medium severity: Restricted areas (nature reserves, shipping lanes)
 *    - Detected by checking if route intersects restricted zones
 * 
 * Integration with Chart Data:
 * 
 * The validation system is designed to integrate with the ChartManager
 * when chart data becomes available. Currently, the following methods
 * are prepared for integration:
 * 
 * - getDepthAtPosition(): Query depth from chart tiles
 * - getHazardsAlongRoute(): Query navigation hazards from chart features
 * - getRestrictedAreasAlongRoute(): Query restricted areas from chart data
 * 
 * When chart data is available, these methods will:
 * 1. Query the appropriate chart tiles for the route area
 * 2. Extract relevant features (depth contours, hazards, areas)
 * 3. Perform spatial analysis to detect conflicts
 * 4. Generate appropriate warnings with positions and severity
 */
