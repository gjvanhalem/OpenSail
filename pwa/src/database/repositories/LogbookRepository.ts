import { db, type LogbookEntry } from '../db';
import { BaseRepository } from './Repository';

export class LogbookRepository extends BaseRepository<LogbookEntry> {
  protected getTable() {
    return db.logbook;
  }

  protected generateId(): string {
    return `logbook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create entry with automatic timestamp
  async create(item: Omit<LogbookEntry, 'id'>): Promise<LogbookEntry> {
    const entryData = {
      ...item,
      timestamp: item.timestamp || new Date()
    };
    return await super.create(entryData);
  }

  // Get entries for a specific voyage
  async getByVoyageId(voyageId: string): Promise<LogbookEntry[]> {
    return await db.logbook
      .where('voyageId')
      .equals(voyageId)
      .sortBy('timestamp');
  }

  // Get entries within a date range
  async getByDateRange(startDate: Date, endDate: Date): Promise<LogbookEntry[]> {
    return await db.logbook
      .where('timestamp')
      .between(startDate, endDate, true, true)
      .sortBy('timestamp');
  }

  // Get entries by type
  async getByType(type: LogbookEntry['type']): Promise<LogbookEntry[]> {
    return await db.logbook
      .where('type')
      .equals(type)
      .sortBy('timestamp');
  }

  // Get all entries sorted by timestamp
  async getAllSorted(order: 'asc' | 'desc' = 'desc'): Promise<LogbookEntry[]> {
    const entries = await db.logbook.orderBy('timestamp').toArray();
    return order === 'desc' ? entries.reverse() : entries;
  }

  // Get recent entries (last N entries)
  async getRecent(limit: number): Promise<LogbookEntry[]> {
    const entries = await db.logbook
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
    return entries;
  }

  // Search entries by notes
  async searchNotes(query: string): Promise<LogbookEntry[]> {
    const lowerQuery = query.toLowerCase();
    return await db.logbook
      .filter(entry => 
        entry.notes?.toLowerCase().includes(lowerQuery) ?? false
      )
      .sortBy('timestamp');
  }

  // Get voyage start entry
  async getVoyageStart(voyageId: string): Promise<LogbookEntry | undefined> {
    return await db.logbook
      .where(['voyageId', 'type'])
      .equals([voyageId, 'voyage_start'])
      .first();
  }

  // Get voyage end entry
  async getVoyageEnd(voyageId: string): Promise<LogbookEntry | undefined> {
    return await db.logbook
      .where(['voyageId', 'type'])
      .equals([voyageId, 'voyage_end'])
      .first();
  }

  // Delete all entries for a voyage
  async deleteByVoyageId(voyageId: string): Promise<void> {
    await db.logbook
      .where('voyageId')
      .equals(voyageId)
      .delete();
  }

  // Get entries with position data
  async getEntriesWithPosition(): Promise<LogbookEntry[]> {
    return await db.logbook
      .filter(entry => entry.latitude !== null && entry.longitude !== null)
      .sortBy('timestamp');
  }

  // Get statistics for a voyage
  async getVoyageStats(voyageId: string): Promise<{
    totalEntries: number;
    totalDistance: number;
    maxSpeed: number;
    avgSpeed: number;
  }> {
    const entries = await this.getByVoyageId(voyageId);
    
    const totalDistance = entries.reduce((sum, entry) => sum + (entry.distance || 0), 0);
    const maxSpeed = Math.max(...entries.map(entry => entry.maxSpeed || 0));
    const avgSpeeds = entries.filter(entry => entry.avgSpeed !== undefined).map(entry => entry.avgSpeed!);
    const avgSpeed = avgSpeeds.length > 0 
      ? avgSpeeds.reduce((sum, speed) => sum + speed, 0) / avgSpeeds.length 
      : 0;

    return {
      totalEntries: entries.length,
      totalDistance,
      maxSpeed,
      avgSpeed
    };
  }

  // Export entries to CSV format
  async exportToCSV(startDate?: Date, endDate?: Date): Promise<string> {
    const entries = startDate && endDate
      ? await this.getByDateRange(startDate, endDate)
      : await this.getAllSorted('asc');

    const headers = ['Timestamp', 'Type', 'Latitude', 'Longitude', 'Distance', 'Avg Speed', 'Max Speed', 'Notes'];
    const rows = entries.map(entry => [
      entry.timestamp.toISOString(),
      entry.type,
      entry.latitude?.toString() || '',
      entry.longitude?.toString() || '',
      entry.distance?.toString() || '',
      entry.avgSpeed?.toString() || '',
      entry.maxSpeed?.toString() || '',
      entry.notes || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export const logbookRepository = new LogbookRepository();
