import { v4 as uuidv4 } from "uuid";
import { AISTarget, Position, GeoBounds } from "../types";
import { getDatabase } from "./index";

export class AISRepository {
  private static readonly TARGET_TIMEOUT_MS = 24 * 60 * 60 * 1000;
  private static readonly HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000;

  async upsertTarget(target: AISTarget): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();

    await db.run(
      `INSERT OR REPLACE INTO ais_targets 
       (mmsi, name, call_sign, position_lat, position_lon, course, speed, heading, vessel_type, length, width, last_update)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        target.mmsi,
        target.name,
        target.callSign,
        target.position.latitude,
        target.position.longitude,
        target.course,
        target.speed,
        target.heading,
        target.vesselType,
        target.length,
        target.width,
        now,
      ],
    );

    await db.run(
      `INSERT INTO ais_history (mmsi, position_lat, position_lon, timestamp)
       VALUES (?, ?, ?, ?)`,
      [target.mmsi, target.position.latitude, target.position.longitude, now],
    );

    await this.cleanupOldHistory();
  }

  async getTarget(mmsi: string): Promise<AISTarget | null> {
    const db = await getDatabase();

    const target = await db.get<{
      mmsi: string;
      name: string | null;
      call_sign: string | null;
      position_lat: number | null;
      position_lon: number | null;
      course: number | null;
      speed: number | null;
      heading: number | null;
      vessel_type: number | null;
      length: number | null;
      width: number | null;
      last_update: number;
    }>(`SELECT * FROM ais_targets WHERE mmsi = ?`, [mmsi]);

    if (!target || !target.position_lat || !target.position_lon) return null;

    const history = await this.getTargetHistory(mmsi);

    return {
      mmsi: target.mmsi,
      name: target.name || "",
      callSign: target.call_sign || "",
      position: {
        latitude: target.position_lat,
        longitude: target.position_lon,
        accuracy: 0,
        timestamp: target.last_update,
      },
      course: target.course || 0,
      speed: target.speed || 0,
      heading: target.heading || 0,
      vesselType: target.vessel_type || 0,
      length: target.length || 0,
      width: target.width || 0,
      lastUpdate: new Date(target.last_update),
      history,
    };
  }

  async getTargets(bounds?: GeoBounds): Promise<AISTarget[]> {
    const db = await getDatabase();
    const now = Date.now();

    let sql = `SELECT * FROM ais_targets WHERE last_update > ?`;
    const params: unknown[] = [now - AISRepository.TARGET_TIMEOUT_MS];

    if (bounds) {
      sql += ` AND position_lat BETWEEN ? AND ? AND position_lon BETWEEN ? AND ?`;
      params.push(bounds.south, bounds.north, bounds.west, bounds.east);
    }

    const targets = await db.all<{
      mmsi: string;
      name: string | null;
      call_sign: string | null;
      position_lat: number | null;
      position_lon: number | null;
      course: number | null;
      speed: number | null;
      heading: number | null;
      vessel_type: number | null;
      length: number | null;
      width: number | null;
      last_update: number;
    }>(sql, params);

    const result: AISTarget[] = [];

    for (const target of targets) {
      if (!target.position_lat || !target.position_lon) continue;

      const history = await this.getTargetHistory(target.mmsi);

      result.push({
        mmsi: target.mmsi,
        name: target.name || "",
        callSign: target.call_sign || "",
        position: {
          latitude: target.position_lat,
          longitude: target.position_lon,
          accuracy: 0,
          timestamp: target.last_update,
        },
        course: target.course || 0,
        speed: target.speed || 0,
        heading: target.heading || 0,
        vesselType: target.vessel_type || 0,
        length: target.length || 0,
        width: target.width || 0,
        lastUpdate: new Date(target.last_update),
        history,
      });
    }

    return result;
  }

  async deleteTarget(mmsi: string): Promise<void> {
    const db = await getDatabase();
    await db.run(`DELETE FROM ais_history WHERE mmsi = ?`, [mmsi]);
    await db.run(`DELETE FROM ais_targets WHERE mmsi = ?`, [mmsi]);
  }

  async cleanupExpiredTargets(): Promise<void> {
    const db = await getDatabase();
    const cutoff = Date.now() - AISRepository.TARGET_TIMEOUT_MS;

    const expired = await db.all<{ mmsi: string }>(
      `SELECT mmsi FROM ais_targets WHERE last_update < ?`,
      [cutoff],
    );

    for (const target of expired) {
      await this.deleteTarget(target.mmsi);
    }
  }

  private async getTargetHistory(mmsi: string): Promise<Position[]> {
    const db = await getDatabase();
    const cutoff = Date.now() - AISRepository.HISTORY_RETENTION_MS;

    const history = await db.all<{
      position_lat: number;
      position_lon: number;
      timestamp: number;
    }>(
      `SELECT position_lat, position_lon, timestamp FROM ais_history 
       WHERE mmsi = ? AND timestamp > ? ORDER BY timestamp`,
      [mmsi, cutoff],
    );

    return history.map((h) => ({
      latitude: h.position_lat,
      longitude: h.position_lon,
      accuracy: 0,
      timestamp: h.timestamp,
    }));
  }

  private async cleanupOldHistory(): Promise<void> {
    const db = await getDatabase();
    const cutoff = Date.now() - AISRepository.HISTORY_RETENTION_MS;

    await db.run(`DELETE FROM ais_history WHERE timestamp < ?`, [cutoff]);
  }

  async calculateCPA(
    target: AISTarget,
    ownPosition: Position,
  ): Promise<{ distance: number; time: number; position: Position }> {
    const targetSpeedKnots = target.speed;
    const targetCourseRad = target.course * (Math.PI / 180);

    const targetVx = (targetSpeedKnots * Math.sin(targetCourseRad)) / 3600;
    const targetVy = (targetSpeedKnots * Math.cos(targetCourseRad)) / 3600;

    const ownLat = ownPosition.latitude;
    const ownLon = ownPosition.longitude;

    let minDistance = Infinity;
    let cpaTime = 0;
    let cpaPosition: Position = { ...ownPosition };

    for (let t = 0; t < 3600; t++) {
      const futureLat = target.position.latitude + (targetVy * t) / 60;
      const futureLon = target.position.longitude + (targetVx * t) / 60;

      const dLat = futureLat - ownLat;
      const dLon = futureLon - ownLon;
      const distance = Math.sqrt(dLat * dLat + dLon * dLon) * 60;

      if (distance < minDistance) {
        minDistance = distance;
        cpaTime = t;
        cpaPosition = {
          latitude: futureLat,
          longitude: futureLon,
          accuracy: 0,
          timestamp: Date.now(),
        };
      }
    }

    return {
      distance: minDistance,
      time: cpaTime / 60,
      position: cpaPosition,
    };
  }
}
