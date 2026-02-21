import type { Waypoint, Position } from '@/models';
import { calculateDistance, calculateBearing, calculateRouteDuration } from './calculations';

/**
 * Route calculation utilities
 * Provides comprehensive route analysis including distance, bearings, and time estimates
 */

export interface LegInfo {
  fromWaypoint: Waypoint;
  toWaypoint: Waypoint;
  distance: number;
  bearing: number;
  estimatedTime: number;
}

export interface RouteCalculationResult {
  totalDistance: number;
  totalTime: number;
  legs: LegInfo[];
  waypoints: Waypoint[];
}

/**
 * Calculate comprehensive route information
 * @param waypoints Array of waypoints in route order
 * @param averageSpeed Average speed in knots
 * @returns Complete route calculation with legs and totals
 */
export function calculateRouteInfo(
  waypoints: Waypoint[],
  averageSpeed: number = 5
): RouteCalculationResult {
  if (waypoints.length < 2) {
    return {
      totalDistance: 0,
      totalTime: 0,
      legs: [],
      waypoints,
    };
  }

  const legs: LegInfo[] = [];
  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    
    const distance = calculateDistance(from.position, to.position);
    const bearing = calculateBearing(from.position, to.position);
    const estimatedTime = calculateRouteDuration(distance, averageSpeed);

    legs.push({
      fromWaypoint: from,
      toWaypoint: to,
      distance,
      bearing,
      estimatedTime,
    });

    totalDistance += distance;
  }

  const totalTime = calculateRouteDuration(totalDistance, averageSpeed);

  return {
    totalDistance,
    totalTime,
    legs,
    waypoints,
  };
}

/**
 * Calculate total distance for a route
 * @param waypoints Array of waypoints
 * @returns Total distance in nautical miles
 */
export function calculateTotalDistance(waypoints: Waypoint[]): number {
  if (waypoints.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += calculateDistance(waypoints[i].position, waypoints[i + 1].position);
  }

  return total;
}

/**
 * Calculate bearings between all waypoints
 * @param waypoints Array of waypoints
 * @returns Array of bearings in degrees
 */
export function calculateRouteBearings(waypoints: Waypoint[]): number[] {
  if (waypoints.length < 2) return [];

  const bearings: number[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    bearings.push(calculateBearing(waypoints[i].position, waypoints[i + 1].position));
  }

  return bearings;
}

/**
 * Estimate travel time for a route
 * @param waypoints Array of waypoints
 * @param averageSpeed Average speed in knots
 * @returns Estimated time in hours
 */
export function estimateRouteTime(waypoints: Waypoint[], averageSpeed: number): number {
  const distance = calculateTotalDistance(waypoints);
  return calculateRouteDuration(distance, averageSpeed);
}

/**
 * Get route leg information for a specific segment
 * @param fromWaypoint Starting waypoint
 * @param toWaypoint Ending waypoint
 * @param averageSpeed Average speed in knots
 * @returns Leg information
 */
export function calculateLegInfo(
  fromWaypoint: Waypoint,
  toWaypoint: Waypoint,
  averageSpeed: number = 5
): LegInfo {
  const distance = calculateDistance(fromWaypoint.position, toWaypoint.position);
  const bearing = calculateBearing(fromWaypoint.position, toWaypoint.position);
  const estimatedTime = calculateRouteDuration(distance, averageSpeed);

  return {
    fromWaypoint,
    toWaypoint,
    distance,
    bearing,
    estimatedTime,
  };
}

/**
 * Find the closest waypoint to a given position
 * @param position Current position
 * @param waypoints Array of waypoints
 * @returns Index of closest waypoint and distance to it
 */
export function findClosestWaypoint(
  position: Position,
  waypoints: Waypoint[]
): { index: number; distance: number } | null {
  if (waypoints.length === 0) return null;

  let closestIndex = 0;
  let minDistance = calculateDistance(position, waypoints[0].position);

  for (let i = 1; i < waypoints.length; i++) {
    const distance = calculateDistance(position, waypoints[i].position);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }

  return { index: closestIndex, distance: minDistance };
}

/**
 * Calculate remaining distance from current position to end of route
 * @param currentPosition Current position
 * @param waypoints Array of waypoints
 * @param currentWaypointIndex Index of current target waypoint
 * @returns Remaining distance in nautical miles
 */
export function calculateRemainingDistance(
  currentPosition: Position,
  waypoints: Waypoint[],
  currentWaypointIndex: number
): number {
  if (currentWaypointIndex >= waypoints.length) return 0;

  // Distance to current waypoint
  let remaining = calculateDistance(currentPosition, waypoints[currentWaypointIndex].position);

  // Add distances for remaining legs
  for (let i = currentWaypointIndex; i < waypoints.length - 1; i++) {
    remaining += calculateDistance(waypoints[i].position, waypoints[i + 1].position);
  }

  return remaining;
}

/**
 * Calculate ETA (Estimated Time of Arrival) for route completion
 * @param currentPosition Current position
 * @param waypoints Array of waypoints
 * @param currentWaypointIndex Index of current target waypoint
 * @param currentSpeed Current speed in knots
 * @returns ETA as Date object
 */
export function calculateETA(
  currentPosition: Position,
  waypoints: Waypoint[],
  currentWaypointIndex: number,
  currentSpeed: number
): Date | null {
  if (currentSpeed <= 0 || currentWaypointIndex >= waypoints.length) return null;

  const remainingDistance = calculateRemainingDistance(
    currentPosition,
    waypoints,
    currentWaypointIndex
  );

  const remainingHours = remainingDistance / currentSpeed;
  const eta = new Date(Date.now() + remainingHours * 3600 * 1000);

  return eta;
}

/**
 * Check if current position has reached a waypoint
 * @param currentPosition Current position
 * @param waypoint Target waypoint
 * @returns True if within arrival radius
 */
export function hasReachedWaypoint(currentPosition: Position, waypoint: Waypoint): boolean {
  const distance = calculateDistance(currentPosition, waypoint.position);
  return distance <= waypoint.arrivalRadius;
}

/**
 * Calculate progress percentage along route
 * @param currentPosition Current position
 * @param waypoints Array of waypoints
 * @param currentWaypointIndex Index of current target waypoint
 * @returns Progress as percentage (0-100)
 */
export function calculateRouteProgress(
  currentPosition: Position,
  waypoints: Waypoint[],
  currentWaypointIndex: number
): number {
  if (waypoints.length < 2) return 0;

  const totalDistance = calculateTotalDistance(waypoints);
  if (totalDistance === 0) return 100;

  const remainingDistance = calculateRemainingDistance(
    currentPosition,
    waypoints,
    currentWaypointIndex
  );

  const completedDistance = totalDistance - remainingDistance;
  return Math.min(100, Math.max(0, (completedDistance / totalDistance) * 100));
}

/**
 * Validate route for basic issues
 * @param waypoints Array of waypoints
 * @returns Validation result with any warnings
 */
export function validateRoute(waypoints: Waypoint[]): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (waypoints.length < 2) {
    warnings.push('Route must have at least 2 waypoints');
    return { isValid: false, warnings };
  }

  // Check for duplicate positions
  for (let i = 0; i < waypoints.length - 1; i++) {
    for (let j = i + 1; j < waypoints.length; j++) {
      const distance = calculateDistance(waypoints[i].position, waypoints[j].position);
      if (distance < 0.01) {
        warnings.push(`Waypoints ${i + 1} and ${j + 1} are very close together`);
      }
    }
  }

  // Check for very long legs (> 500 nm)
  for (let i = 0; i < waypoints.length - 1; i++) {
    const distance = calculateDistance(waypoints[i].position, waypoints[i + 1].position);
    if (distance > 500) {
      warnings.push(`Leg ${i + 1} to ${i + 2} is very long (${distance.toFixed(1)} nm)`);
    }
  }

  // Check for invalid coordinates
  for (let i = 0; i < waypoints.length; i++) {
    const { latitude, longitude } = waypoints[i].position;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      warnings.push(`Waypoint ${i + 1} has invalid coordinates`);
      return { isValid: false, warnings };
    }
  }

  return { isValid: true, warnings };
}

/**
 * Format distance for display
 * @param nm Distance in nautical miles
 * @returns Formatted string
 */
export function formatDistance(nm: number): string {
  if (nm < 1) {
    return `${(nm * 1852).toFixed(0)} m`;
  }
  return `${nm.toFixed(2)} nm`;
}

/**
 * Format duration for display
 * @param hours Duration in hours
 * @returns Formatted string
 */
export function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  if (h === 0) {
    return `${m}m`;
  }
  return `${h}h ${m}m`;
}

/**
 * Format bearing for display
 * @param degrees Bearing in degrees
 * @returns Formatted string with cardinal direction
 */
export function formatBearing(degrees: number): string {
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return `${degrees.toFixed(0)}° ${cardinals[index]}`;
}
