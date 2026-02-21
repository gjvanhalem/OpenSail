import { v4 as uuidv4 } from "uuid";
import { Track, TrackPoint, Position, TrackFilter } from "../types";
import { getDatabase } from "./index";

export class TrackRepository {
  private static readonly BATCH_SIZE = 10;
  private static readonly COMPRESSION_AGE_DAYS = 7;
  private static readonly COMPRESSION_THRESHOLD = 100; // Compress tracks with more than 100 points

  async startRecording(name: string, startPosition: Position): Promise<Track> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = Date.now();

    await db.run(
      `INSERT INTO tracks (id, name, start_time, distance, max_speed, avg_speed)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, now, 0, 0, 0],
    );

    await db.run(
      `INSERT INTO track_points (track_id, position_lat, position_lon, speed, heading, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, startPosition.latitude, startPosition.longitude, 0, 0, now],
    );

    return {
      id,
      name,
      points: [
        {
          position: startPosition,
          speed: 0,
          heading: 0,
          timestamp: new Date(now),
        },
      ],
      startTime: new Date(now),
      endTime: new Date(now),
      distance: 0,
      maxSpeed: 0,
      avgSpeed: 0,
    };
  }

  async addTrackPoint(trackId: string, point: TrackPoint): Promise<void> {
    const db = await getDatabase();

    await db.run(
      `INSERT INTO track_points (track_id, position_lat, position_lon, speed, heading, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        trackId,
        point.position.latitude,
        point.position.longitude,
        point.speed,
        point.heading,
        point.timestamp.getTime(),
      ],
    );

    const track = await this.getTrack(trackId);
    if (track) {
      await this.updateTrackStatistics(trackId, track.points.length);
    }
  }

  async stopRecording(trackId: string): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();

    await db.run(`UPDATE tracks SET end_time = ? WHERE id = ?`, [now, trackId]);

    await this.updateTrackStatistics(trackId);
  }

  async getTrack(trackId: string): Promise<Track | null> {
    const db = await getDatabase();

    const track = await db.get<{
      id: string;
      name: string;
      start_time: number;
      end_time: number | null;
      distance: number;
      max_speed: number;
      avg_speed: number;
    }>(`SELECT * FROM tracks WHERE id = ?`, [trackId]);

    if (!track) return null;

    const points = await this.getTrackPoints(trackId);

    return {
      id: track.id,
      name: track.name,
      points,
      startTime: new Date(track.start_time),
      endTime: track.end_time ? new Date(track.end_time) : new Date(),
      distance: track.distance,
      maxSpeed: track.max_speed,
      avgSpeed: track.avg_speed,
    };
  }

  async getTracks(filter?: TrackFilter): Promise<Track[]> {
    const db = await getDatabase();

    let sql = `SELECT * FROM tracks WHERE 1=1`;
    const params: unknown[] = [];

    if (filter?.startDate) {
      sql += ` AND start_time >= ?`;
      params.push(filter.startDate.getTime());
    }

    if (filter?.endDate) {
      sql += ` AND start_time <= ?`;
      params.push(filter.endDate.getTime());
    }

    sql += ` ORDER BY start_time DESC`;

    const tracks = await db.all<{
      id: string;
      name: string;
      start_time: number;
      end_time: number | null;
      distance: number;
      max_speed: number;
      avg_speed: number;
    }>(sql, params);

    const result: Track[] = [];

    for (const track of tracks) {
      if (filter?.minDistance && track.distance < filter.minDistance) {
        continue;
      }

      const points = await this.getTrackPoints(track.id);
      result.push({
        id: track.id,
        name: track.name,
        points,
        startTime: new Date(track.start_time),
        endTime: track.end_time ? new Date(track.end_time) : new Date(),
        distance: track.distance,
        maxSpeed: track.max_speed,
        avgSpeed: track.avg_speed,
      });
    }

    return result;
  }

  async deleteTrack(trackId: string): Promise<void> {
    const db = await getDatabase();
    await db.run(`DELETE FROM track_points WHERE track_id = ?`, [trackId]);
    await db.run(`DELETE FROM tracks WHERE id = ?`, [trackId]);
  }

  async compressOldTracks(): Promise<number> {
    const db = await getDatabase();
    const cutoffDate = Date.now() - (TrackRepository.COMPRESSION_AGE_DAYS * 24 * 60 * 60 * 1000);

    // Find tracks older than cutoff date
    const oldTracks = await db.all<{ id: string }>(
      `SELECT id FROM tracks WHERE start_time < ?`,
      [cutoffDate]
    );

    let compressedCount = 0;

    for (const track of oldTracks) {
      const compressed = await this.compressTrack(track.id);
      if (compressed) {
        compressedCount++;
      }
    }

    return compressedCount;
  }

  private async compressTrack(trackId: string): Promise<boolean> {
    const db = await getDatabase();

    // Get all track points
    const points = await this.getTrackPoints(trackId);
    
    if (points.length <= TrackRepository.COMPRESSION_THRESHOLD) {
      return false; // Track is already small enough
    }

    // Apply Douglas-Peucker algorithm to reduce points while preserving shape
    const compressedPoints = this.douglasPeucker(points, 0.0001); // ~11 meters tolerance

    if (compressedPoints.length >= points.length * 0.8) {
      return false; // Compression didn't save much space
    }

    // Delete all existing points
    await db.run(`DELETE FROM track_points WHERE track_id = ?`, [trackId]);

    // Insert compressed points
    for (const point of compressedPoints) {
      await db.run(
        `INSERT INTO track_points (track_id, position_lat, position_lon, speed, heading, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          trackId,
          point.position.latitude,
          point.position.longitude,
          point.speed,
          point.heading,
          point.timestamp.getTime()
        ]
      );
    }

    console.log(`Compressed track ${trackId}: ${points.length} -> ${compressedPoints.length} points`);
    return true;
  }

  private douglasPeucker(points: TrackPoint[], tolerance: number): TrackPoint[] {
    if (points.length <= 2) {
      return points;
    }

    // Find the point with maximum distance from the line between first and last
    let maxDistance = 0;
    let maxIndex = 0;

    const first = points[0];
    const last = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(
        points[i].position,
        first.position,
        last.position
      );

      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const leftSegment = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const rightSegment = this.douglasPeucker(points.slice(maxIndex), tolerance);

      // Combine results (remove duplicate middle point)
      return [...leftSegment.slice(0, -1), ...rightSegment];
    } else {
      // All points between first and last can be removed
      return [first, last];
    }
  }

  private perpendicularDistance(
    point: Position,
    lineStart: Position,
    lineEnd: Position
  ): number {
    const x0 = point.latitude;
    const y0 = point.longitude;
    const x1 = lineStart.latitude;
    const y1 = lineStart.longitude;
    const x2 = lineEnd.latitude;
    const y2 = lineEnd.longitude;

    const numerator = Math.abs(
      (y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1
    );
    const denominator = Math.sqrt(
      Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  async exportToGPX(trackId: string): Promise<string> {
    const track = await this.getTrack(trackId);
    if (!track) return "";

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="OpenSail">
  <trk>
    <name>${this.escapeXml(track.name)}</name>
    <trkseg>
`;

    for (const point of track.points) {
      gpx += `      <trkpt lat="${point.position.latitude}" lon="${point.position.longitude}">
        <ele>0</ele>
        <time>${point.timestamp.toISOString()}</time>
      </trkpt>
`;
    }

    gpx += `    </trkseg>
  </trk>
</gpx>`;

    return gpx;
  }

  private async getTrackPoints(trackId: string): Promise<TrackPoint[]> {
    const db = await getDatabase();

    const points = await db.all<{
      position_lat: number;
      position_lon: number;
      speed: number;
      heading: number;
      timestamp: number;
    }>(
      `SELECT position_lat, position_lon, speed, heading, timestamp FROM track_points WHERE track_id = ? ORDER BY timestamp`,
      [trackId],
    );

    return points.map((p) => ({
      position: {
        latitude: p.position_lat,
        longitude: p.position_lon,
        accuracy: 0,
        timestamp: p.timestamp,
      },
      speed: p.speed,
      heading: p.heading,
      timestamp: new Date(p.timestamp),
    }));
  }

  private async updateTrackStatistics(
    trackId: string,
    pointCount?: number,
  ): Promise<void> {
    const db = await getDatabase();

    const points = await this.getTrackPoints(trackId);
    if (points.length < 2) return;

    let totalDistance = 0;
    let maxSpeed = 0;
    let speedSum = 0;

    for (let i = 1; i < points.length; i++) {
      const dist = this.calculateDistance(
        points[i - 1].position,
        points[i].position,
      );
      totalDistance += dist;

      if (points[i].speed > maxSpeed) {
        maxSpeed = points[i].speed;
      }
      speedSum += points[i].speed;
    }

    const avgSpeed = speedSum / points.length;
    const duration =
      (points[points.length - 1].timestamp.getTime() -
        points[0].timestamp.getTime()) /
      1000;

    await db.run(
      `UPDATE tracks SET distance = ?, max_speed = ?, avg_speed = ? WHERE id = ?`,
      [totalDistance, maxSpeed, avgSpeed, trackId],
    );
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    const R = 3440.065;
    const dLat = this.toRad(pos2.latitude - pos1.latitude);
    const dLon = this.toRad(pos2.longitude - pos1.longitude);
    const lat1 = this.toRad(pos1.latitude);
    const lat2 = this.toRad(pos2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
