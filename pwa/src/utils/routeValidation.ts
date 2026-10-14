import type { Route, RouteValidation, RouteWarning, Waypoint, Position } from '../models';
import { calculateDistance, interpolatePosition } from './calculations';

/**
 * Route validation utilities
 * Provides functions to validate routes and check for potential hazards
 */

/**
 * Validate a route and return warnings
 * @param route Route to validate
 * @returns Route validation result with warnings
 */
export async function validateRoute(route: Route): Promise<RouteValidation> {
  const warnings: RouteWarning[] = [];

  // Validate each leg of the route
  for (let i = 0; i < route.waypoints.length - 1; i++) {
    const current = route.waypoints[i];
    const next = route.waypoints[i + 1];

    // Check for excessively long legs
    const distance = calculateDistance(current.position, next.position);
    if (distance > 50) {
      warnings.push({
        type: 'hazard',
        position: current.position,
        message: `Long leg (${distance.toFixed(1)} nm) - consider adding intermediate waypoints for safety`,
        severity: 'low'
      });
    }

    // Check for very short legs (potential duplicate waypoints)
    if (distance < 0.1) {
      warnings.push({
        type: 'hazard',
        position: current.position,
        message: `Very short leg (${distance.toFixed(2)} nm) - waypoints may be too close`,
        severity: 'low'
      });
    }
  }

  // Check for duplicate waypoint names
  const nameCount = new Map<string, number>();
  route.waypoints.forEach(wp => {
    const count = nameCount.get(wp.name) || 0;
    nameCount.set(wp.name, count + 1);
  });

  nameCount.forEach((count, name) => {
    if (count > 1) {
      warnings.push({
        type: 'hazard',
        position: route.waypoints[0].position,
        message: `Duplicate waypoint name: "${name}" appears ${count} times`,
        severity: 'low'
      });
    }
  });

  // Remove duplicate warnings
  const uniqueWarnings = deduplicateWarnings(warnings);

  return {
    isValid: uniqueWarnings.filter(w => w.severity === 'high').length === 0,
    warnings: uniqueWarnings
  };
}

/**
 * Check if a route leg crosses shallow water
 * Note: This is a placeholder that will be integrated with chart data
 * @param start Start waypoint
 * @param end End waypoint
 * @param minDepth Minimum safe depth in meters
 * @returns Array of shallow water warnings
 */
// Placeholder: parameters are part of the public signature but not used until chart data is integrated
export const checkShallowWater: (
  start: Waypoint,
  end: Waypoint,
  minDepth?: number
) => Promise<RouteWarning[]> = async () => {
  const warnings: RouteWarning[] = [];
  
  // TODO: Integrate with chart data when available
  // For now, this is a placeholder that returns no warnings
  // When chart data is available:
  // 1. Sample points along the route leg
  // 2. Query depth data from chart tiles
  // 3. Generate warnings for shallow areas
  
  return warnings;
};

/**
 * Check if a route leg passes near hazards
 * Note: This is a placeholder that will be integrated with chart data
 * @param start Start waypoint
 * @param end End waypoint
 * @param corridorWidth Width of corridor to check in nautical miles
 * @returns Array of hazard warnings
 */
// Placeholder: parameters are part of the public signature but not used until chart data is integrated
export const checkHazards: (
  start: Waypoint,
  end: Waypoint,
  corridorWidth?: number
) => Promise<RouteWarning[]> = async () => {
  const warnings: RouteWarning[] = [];
  
  // TODO: Integrate with chart data when available
  // For now, this is a placeholder that returns no warnings
  // When chart data is available:
  // 1. Define corridor polygon around route leg
  // 2. Query chart features (rocks, wrecks, obstructions)
  // 3. Generate warnings for hazards within corridor
  
  return warnings;
};

/**
 * Check if a route leg passes through restricted areas
 * Note: This is a placeholder that will be integrated with chart data
 * @param start Start waypoint
 * @param end End waypoint
 * @returns Array of restricted area warnings
 */
// Placeholder: parameters are part of the public signature but not used until chart data is integrated
export const checkRestrictedAreas: (
  start: Waypoint,
  end: Waypoint
) => Promise<RouteWarning[]> = async () => {
  const warnings: RouteWarning[] = [];
  
  // TODO: Integrate with chart data when available
  // For now, this is a placeholder that returns no warnings
  // When chart data is available:
  // 1. Query chart features for restricted areas
  // 2. Check if route intersects with any areas
  // 3. Generate warnings with area details
  
  return warnings;
};

/**
 * Sample points along a route leg for analysis
 * @param start Start position
 * @param end End position
 * @param interval Interval between samples in nautical miles
 * @returns Array of sample positions
 */
export function sampleRouteLeg(
  start: Position,
  end: Position,
  interval: number = 0.5
): Position[] {
  const distance = calculateDistance(start, end);
  const numSamples = Math.max(2, Math.ceil(distance / interval));
  const samples: Position[] = [];

  for (let i = 0; i <= numSamples; i++) {
    const fraction = i / numSamples;
    samples.push(interpolatePosition(start, end, fraction));
  }

  return samples;
}

/**
 * Remove duplicate warnings at the same position
 * @param warnings Array of warnings
 * @returns Deduplicated array of warnings
 */
function deduplicateWarnings(warnings: RouteWarning[]): RouteWarning[] {
  const seen = new Map<string, RouteWarning>();

  for (const warning of warnings) {
    const key = `${warning.type}-${warning.position.latitude.toFixed(4)}-${warning.position.longitude.toFixed(4)}`;

    const existing = seen.get(key);
    if (!existing || compareSeverity(warning.severity, existing.severity) > 0) {
      seen.set(key, warning);
    }
  }

  return Array.from(seen.values());
}

/**
 * Compare severity levels
 * @param a First severity
 * @param b Second severity
 * @returns Positive if a > b, negative if a < b, 0 if equal
 */
function compareSeverity(a: 'low' | 'medium' | 'high', b: 'low' | 'medium' | 'high'): number {
  const levels = { low: 1, medium: 2, high: 3 };
  return levels[a] - levels[b];
}

/**
 * Check if a waypoint is valid
 * @param waypoint Waypoint to validate
 * @returns True if valid, false otherwise
 */
export function isValidWaypoint(waypoint: Waypoint): boolean {
  // Check latitude range
  if (waypoint.position.latitude < -90 || waypoint.position.latitude > 90) {
    return false;
  }

  // Check longitude range
  if (waypoint.position.longitude < -180 || waypoint.position.longitude > 180) {
    return false;
  }

  // Check name is not empty
  if (!waypoint.name || waypoint.name.trim().length === 0) {
    return false;
  }

  // Check arrival radius is positive
  if (waypoint.arrivalRadius <= 0) {
    return false;
  }

  return true;
}

/**
 * Check if a route is valid
 * @param route Route to validate
 * @returns True if valid, false otherwise
 */
export function isValidRoute(route: Route): boolean {
  // Check minimum waypoints
  if (route.waypoints.length < 2) {
    return false;
  }

  // Check all waypoints are valid
  for (const waypoint of route.waypoints) {
    if (!isValidWaypoint(waypoint)) {
      return false;
    }
  }

  // Check name is not empty
  if (!route.name || route.name.trim().length === 0) {
    return false;
  }

  return true;
}
