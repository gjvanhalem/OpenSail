import type { Position, Waypoint } from '../models';

/**
 * Navigation calculation utilities
 * Provides distance, bearing, and coordinate transformation functions
 */

/**
 * Calculate distance between two positions using Haversine formula
 * @param pos1 First position
 * @param pos2 Second position
 * @returns Distance in nautical miles
 */
export function calculateDistance(pos1: Position, pos2: Position): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = toRadians(pos2.latitude - pos1.latitude);
  const dLon = toRadians(pos2.longitude - pos1.longitude);
  const lat1 = toRadians(pos1.latitude);
  const lat2 = toRadians(pos2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bearing from one position to another
 * @param start Starting position
 * @param end Ending position
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(start: Position, end: Position): number {
  const lat1 = toRadians(start.latitude);
  const lat2 = toRadians(end.latitude);
  const dLon = toRadians(end.longitude - start.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);

  return ((bearing * 180) / Math.PI + 360) % 360;
}

/**
 * Convert degrees to radians
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param radians Angle in radians
 * @returns Angle in degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Interpolate a position between two points
 * @param start Starting position
 * @param end Ending position
 * @param fraction Fraction of distance (0-1)
 * @returns Interpolated position
 */
export function interpolatePosition(start: Position, end: Position, fraction: number): Position {
  const lat = start.latitude + (end.latitude - start.latitude) * fraction;
  const lon = start.longitude + (end.longitude - start.longitude) * fraction;

  return {
    latitude: lat,
    longitude: lon,
    accuracy: Math.max(start.accuracy, end.accuracy),
    timestamp: Date.now()
  };
}

/**
 * Calculate total distance of a route
 * @param waypoints Array of waypoints
 * @returns Total distance in nautical miles
 */
export function calculateRouteDistance(waypoints: Waypoint[]): number {
  if (waypoints.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistance += calculateDistance(waypoints[i].position, waypoints[i + 1].position);
  }

  return totalDistance;
}

/**
 * Calculate estimated duration for a route
 * @param distance Distance in nautical miles
 * @param averageSpeed Average speed in knots
 * @returns Duration in hours
 */
export function calculateRouteDuration(distance: number, averageSpeed: number): number {
  if (averageSpeed <= 0) return 0;
  return distance / averageSpeed;
}

/**
 * Calculate cross-track error (distance from current position to route line)
 * @param currentPos Current position
 * @param routeStart Start of route segment
 * @param routeEnd End of route segment
 * @returns Cross-track error in nautical miles (positive = right of track, negative = left)
 */
export function calculateCrossTrackError(
  currentPos: Position,
  routeStart: Position,
  routeEnd: Position
): number {
  const R = 3440.065; // Earth radius in nautical miles
  
  const d13 = calculateDistance(routeStart, currentPos);
  const brg12 = toRadians(calculateBearing(routeStart, routeEnd));
  const brg13 = toRadians(calculateBearing(routeStart, currentPos));
  
  const dxt = Math.asin(Math.sin(d13 / R) * Math.sin(brg13 - brg12)) * R;
  
  return dxt;
}

/**
 * Calculate along-track distance (distance along route to closest point)
 * @param currentPos Current position
 * @param routeStart Start of route segment
 * @param routeEnd End of route segment
 * @returns Along-track distance in nautical miles
 */
export function calculateAlongTrackDistance(
  currentPos: Position,
  routeStart: Position,
  routeEnd: Position
): number {
  const R = 3440.065; // Earth radius in nautical miles
  
  const d13 = calculateDistance(routeStart, currentPos);
  const dxt = calculateCrossTrackError(currentPos, routeStart, routeEnd);
  
  const dat = Math.acos(Math.cos(d13 / R) / Math.cos(dxt / R)) * R;
  
  return dat;
}

/**
 * Calculate destination point given start point, bearing, and distance
 * @param start Starting position
 * @param bearing Bearing in degrees
 * @param distance Distance in nautical miles
 * @returns Destination position
 */
export function calculateDestination(
  start: Position,
  bearing: number,
  distance: number
): Position {
  const R = 3440.065; // Earth radius in nautical miles
  const lat1 = toRadians(start.latitude);
  const lon1 = toRadians(start.longitude);
  const brng = toRadians(bearing);
  const d = distance;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d / R) + Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
      Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: toDegrees(lat2),
    longitude: toDegrees(lon2),
    accuracy: start.accuracy,
    timestamp: Date.now()
  };
}

/**
 * Calculate Closest Point of Approach (CPA) between two vessels
 * @param pos1 Position of vessel 1
 * @param course1 Course of vessel 1 in degrees
 * @param speed1 Speed of vessel 1 in knots
 * @param pos2 Position of vessel 2
 * @param course2 Course of vessel 2 in degrees
 * @param speed2 Speed of vessel 2 in knots
 * @returns Object with CPA distance (nm), time (hours), and position
 */
export function calculateCPA(
  pos1: Position,
  course1: number,
  speed1: number,
  pos2: Position,
  course2: number,
  speed2: number
): { distance: number; time: number; position: Position } {
  // Convert to relative motion
  const relSpeed = Math.sqrt(
    speed1 * speed1 +
      speed2 * speed2 -
      2 * speed1 * speed2 * Math.cos(toRadians(course2 - course1))
  );

  if (relSpeed === 0) {
    // Vessels are stationary or moving together
    return {
      distance: calculateDistance(pos1, pos2),
      time: 0,
      position: pos1
    };
  }

  // Calculate relative bearing
  const bearing12 = calculateBearing(pos1, pos2);
  const relBearing = bearing12 - course1;

  // Calculate time to CPA
  const distance12 = calculateDistance(pos1, pos2);
  const tcpa = (distance12 * Math.cos(toRadians(relBearing))) / relSpeed;

  if (tcpa < 0) {
    // CPA is in the past
    return {
      distance: distance12,
      time: 0,
      position: pos1
    };
  }

  // Calculate CPA distance
  const cpaDistance = distance12 * Math.abs(Math.sin(toRadians(relBearing)));

  // Calculate CPA position
  const cpaPosition = calculateDestination(pos1, course1, speed1 * tcpa);

  return {
    distance: cpaDistance,
    time: tcpa,
    position: cpaPosition
  };
}

/**
 * Normalize angle to 0-360 range
 * @param angle Angle in degrees
 * @returns Normalized angle (0-360)
 */
export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Calculate difference between two angles (shortest path)
 * @param angle1 First angle in degrees
 * @param angle2 Second angle in degrees
 * @returns Difference in degrees (-180 to 180)
 */
export function angleDifference(angle1: number, angle2: number): number {
  let diff = angle2 - angle1;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}

/**
 * Check if a position is within a circular area
 * @param position Position to check
 * @param center Center of the circle
 * @param radius Radius in nautical miles
 * @returns True if position is within the circle
 */
export function isWithinRadius(position: Position, center: Position, radius: number): boolean {
  const distance = calculateDistance(position, center);
  return distance <= radius;
}

/**
 * Calculate speed in knots from two positions and time difference
 * @param pos1 First position
 * @param pos2 Second position
 * @returns Speed in knots
 */
export function calculateSpeed(pos1: Position, pos2: Position): number {
  const distance = calculateDistance(pos1, pos2);
  const timeDiff = (pos2.timestamp - pos1.timestamp) / 1000 / 3600; // Convert ms to hours
  
  if (timeDiff === 0) return 0;
  
  return distance / timeDiff;
}
