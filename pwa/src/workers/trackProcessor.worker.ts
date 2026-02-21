/**
 * Web Worker for heavy track processing computations
 * Offloads CPU-intensive tasks from the main thread
 */

import type { TrackPoint as DBTrackPoint } from '@/database/db';

// Use database TrackPoint type which has flat structure
type TrackPoint = DBTrackPoint;

export interface TrackProcessingMessage {
  type: 'compress' | 'calculate' | 'simplify';
  data: any;
}

export interface TrackProcessingResult {
  type: 'compressed' | 'calculated' | 'simplified';
  data: any;
}

// Douglas-Peucker algorithm for track simplification
function simplifyTrack(points: TrackPoint[], tolerance: number): TrackPoint[] {
  if (points.length <= 2) return points;

  // Find the point with maximum distance from line segment
  let maxDistance = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = simplifyTrack(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyTrack(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  } else {
    return [start, end];
  }
}

function perpendicularDistance(
  point: TrackPoint,
  lineStart: TrackPoint,
  lineEnd: TrackPoint
): number {
  const { latitude: x, longitude: y } = point;
  const { latitude: x1, longitude: y1 } = lineStart;
  const { latitude: x2, longitude: y2 } = lineEnd;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// Compress track points using RDP algorithm
function compressTrack(points: TrackPoint[], tolerance: number = 0.0001): string {
  const simplified = simplifyTrack(points, tolerance);
  return JSON.stringify(simplified);
}

// Simple distance calculation (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate track statistics
function calculateTrackStats(points: TrackPoint[]): {
  distance: number;
  avgSpeed: number;
  maxSpeed: number;
  duration: number;
} {
  if (points.length < 2) {
    return { distance: 0, avgSpeed: 0, maxSpeed: 0, duration: 0 };
  }

  let totalDistance = 0;
  let maxSpeed = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    // Calculate distance between points
    const segmentDistance = calculateDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
    totalDistance += segmentDistance;

    // Track max speed
    if (curr.speed && curr.speed > maxSpeed) {
      maxSpeed = curr.speed;
    }
  }

  // Calculate duration in hours
  const startTime = new Date(points[0].timestamp).getTime();
  const endTime = new Date(points[points.length - 1].timestamp).getTime();
  const durationMs = endTime - startTime;
  const durationHours = durationMs / (1000 * 60 * 60);

  // Calculate average speed
  const avgSpeed = durationHours > 0 ? totalDistance / durationHours : 0;

  return {
    distance: totalDistance,
    avgSpeed,
    maxSpeed,
    duration: durationMs,
  };
}

// Handle messages from main thread
self.onmessage = (event: MessageEvent<TrackProcessingMessage>) => {
  const { type, data } = event.data;

  try {
    let result: TrackProcessingResult;

    switch (type) {
      case 'compress':
        result = {
          type: 'compressed',
          data: compressTrack(data.points, data.tolerance),
        };
        break;

      case 'calculate':
        result = {
          type: 'calculated',
          data: calculateTrackStats(data.points),
        };
        break;

      case 'simplify':
        result = {
          type: 'simplified',
          data: simplifyTrack(data.points, data.tolerance),
        };
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage(result);
  } catch (error) {
    self.postMessage({
      type: 'error',
      data: { message: error instanceof Error ? error.message : 'Unknown error' },
    });
  }
};
