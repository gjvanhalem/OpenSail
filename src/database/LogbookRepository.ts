import { v4 as uuidv4 } from "uuid";
import { LogbookEntry, Voyage, LogbookFilter, Position } from "../types";
import { getDatabase } from "./index";

export class LogbookRepository {
  async startVoyage(startPosition: Position): Promise<Voyage> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = Date.now();

    await db.run(
      `INSERT INTO voyages (id, start_time, start_position_lat, start_position_lon)
       VALUES (?, ?, ?, ?)`,
      [id, now, startPosition.latitude, startPosition.longitude],
    );

    await this.addEntry({
      id: uuidv4(),
      voyageId: id,
      timestamp: new Date(now),
      position: startPosition,
      type: "voyage_start",
      notes: "Voyage started",
    });

    return {
      id,
      startTime: new Date(now),
      startPosition,
    };
  }

  async endVoyage(
    voyageId: string, 
    endPosition: Position,
    distance?: number,
    avgSpeed?: number,
    maxSpeed?: number
  ): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();

    const voyage = await this.getVoyage(voyageId);
    if (!voyage || !voyage.startPosition) return;

    // Use provided statistics or calculate from entries
    let finalDistance = distance;
    let finalAvgSpeed = avgSpeed;
    let finalMaxSpeed = maxSpeed;

    if (finalDistance === undefined) {
      const entries = await this.getEntries({ voyageId });
      for (const entry of entries) {
        if (entry.distance) finalDistance = entry.distance;
      }
    }

    if (finalAvgSpeed === undefined && finalDistance !== undefined) {
      const durationHours = (now - voyage.startTime.getTime()) / 3600000;
      finalAvgSpeed = durationHours > 0 ? finalDistance / durationHours : 0;
    }

    await db.run(
      `UPDATE voyages SET end_time = ?, end_position_lat = ?, end_position_lon = ?, distance = ?, avg_speed = ?, max_speed = ? WHERE id = ?`,
      [
        now,
        endPosition.latitude,
        endPosition.longitude,
        finalDistance || null,
        finalAvgSpeed || null,
        finalMaxSpeed || null,
        voyageId,
      ],
    );

    await this.addEntry({
      id: uuidv4(),
      voyageId,
      timestamp: new Date(now),
      position: endPosition,
      type: "voyage_end",
      distance: finalDistance,
      avgSpeed: finalAvgSpeed,
      maxSpeed: finalMaxSpeed,
      notes: "Voyage ended",
    });
  }

  async addEntry(entry: LogbookEntry): Promise<void> {
    const db = await getDatabase();

    await db.run(
      `INSERT INTO logbook_entries (id, voyage_id, timestamp, position_lat, position_lon, type, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.voyageId,
        entry.timestamp.getTime(),
        entry.position?.latitude || null,
        entry.position?.longitude || null,
        entry.type,
        entry.notes || null,
      ],
    );
  }

  async getVoyage(voyageId: string): Promise<Voyage | null> {
    const db = await getDatabase();

    const voyage = await db.get<{
      id: string;
      start_time: number;
      end_time: number | null;
      start_position_lat: number | null;
      start_position_lon: number | null;
      end_position_lat: number | null;
      end_position_lon: number | null;
      distance: number | null;
      avg_speed: number | null;
      max_speed: number | null;
    }>(`SELECT * FROM voyages WHERE id = ?`, [voyageId]);

    if (!voyage) return null;

    return {
      id: voyage.id,
      startTime: new Date(voyage.start_time),
      endTime: voyage.end_time ? new Date(voyage.end_time) : undefined,
      startPosition:
        voyage.start_position_lat && voyage.start_position_lon
          ? {
              latitude: voyage.start_position_lat,
              longitude: voyage.start_position_lon,
              accuracy: 0,
              timestamp: voyage.start_time,
            }
          : undefined,
      endPosition:
        voyage.end_position_lat && voyage.end_position_lon
          ? {
              latitude: voyage.end_position_lat,
              longitude: voyage.end_position_lon,
              accuracy: 0,
              timestamp: voyage.end_time || 0,
            }
          : undefined,
      distance: voyage.distance || undefined,
      avgSpeed: voyage.avg_speed || undefined,
      maxSpeed: voyage.max_speed || undefined,
    };
  }

  async getEntries(filter?: LogbookFilter): Promise<LogbookEntry[]> {
    const db = await getDatabase();

    let sql = `SELECT * FROM logbook_entries WHERE 1=1`;
    const params: unknown[] = [];

    if (filter?.voyageId) {
      sql += ` AND voyage_id = ?`;
      params.push(filter.voyageId);
    }

    if (filter?.startDate) {
      sql += ` AND timestamp >= ?`;
      params.push(filter.startDate.getTime());
    }

    if (filter?.endDate) {
      sql += ` AND timestamp <= ?`;
      params.push(filter.endDate.getTime());
    }

    sql += ` ORDER BY timestamp DESC`;

    const entries = await db.all<{
      id: string;
      voyage_id: string;
      timestamp: number;
      position_lat: number | null;
      position_lon: number | null;
      type: string;
      notes: string | null;
    }>(sql, params);

    return entries.map((e) => ({
      id: e.id,
      voyageId: e.voyage_id,
      timestamp: new Date(e.timestamp),
      position:
        e.position_lat && e.position_lon
          ? {
              latitude: e.position_lat,
              longitude: e.position_lon,
              accuracy: 0,
              timestamp: e.timestamp,
            }
          : null,
      type: e.type as LogbookEntry["type"],
      notes: e.notes || undefined,
    }));
  }

  async exportToCSV(voyageId?: string): Promise<string> {
    const entries = await this.getEntries({ voyageId });

    let csv = "Timestamp,Voyage ID,Type,Latitude,Longitude,Notes\n";

    for (const entry of entries) {
      csv += `${entry.timestamp.toISOString()},${entry.voyageId},${entry.type},`;
      csv += entry.position
        ? `${entry.position.latitude},${entry.position.longitude}`
        : ",";
      csv += `,${entry.notes || ""}\n`;
    }

    return csv;
  }

  async getActiveVoyage(): Promise<Voyage | null> {
    const db = await getDatabase();

    const voyage = await db.get<{
      id: string;
      start_time: number;
    }>(
      `SELECT id, start_time FROM voyages WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1`,
    );

    if (!voyage) return null;

    return this.getVoyage(voyage.id);
  }

  async getVoyages(filter?: { startDate?: Date; endDate?: Date }): Promise<Voyage[]> {
    const db = await getDatabase();

    let sql = `SELECT * FROM voyages WHERE 1=1`;
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

    const voyages = await db.all<{
      id: string;
      start_time: number;
      end_time: number | null;
      start_position_lat: number | null;
      start_position_lon: number | null;
      end_position_lat: number | null;
      end_position_lon: number | null;
      distance: number | null;
      avg_speed: number | null;
      max_speed: number | null;
    }>(sql, params);

    return voyages.map(v => ({
      id: v.id,
      startTime: new Date(v.start_time),
      endTime: v.end_time ? new Date(v.end_time) : undefined,
      startPosition:
        v.start_position_lat && v.start_position_lon
          ? {
              latitude: v.start_position_lat,
              longitude: v.start_position_lon,
              accuracy: 0,
              timestamp: v.start_time,
            }
          : undefined,
      endPosition:
        v.end_position_lat && v.end_position_lon
          ? {
              latitude: v.end_position_lat,
              longitude: v.end_position_lon,
              accuracy: 0,
              timestamp: v.end_time || 0,
            }
          : undefined,
      distance: v.distance || undefined,
      avgSpeed: v.avg_speed || undefined,
      maxSpeed: v.max_speed || undefined,
    }));
  }
}
