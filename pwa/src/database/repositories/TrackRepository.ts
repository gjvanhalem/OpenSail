import { db, type Track, type TrackPoint, type CompressedTrackPoints } from '../db';
import { BaseRepository } from './Repository';

export class TrackRepository extends BaseRepository<Track> {
  private pendingWrites: Array<{ track: Track; resolve: (value: Track) => void }> = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_DELAY = 1000; // 1 second
  private readonly BATCH_SIZE = 10;

  protected getTable() {
    return db.tracks;
  }

  protected generateId(): string {
    return `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Compress track points for efficient storage using RDP algorithm
  private compressTrackPoints(points: TrackPoint[]): CompressedTrackPoints {
    // Simple compression - in production, use RDP algorithm via Web Worker
    const simplified = this.simplifyPoints(points, 0.0001);
    return {
      compressed: true,
      data: JSON.stringify(simplified)
    };
  }

  // Distance filter: drop points closer than `tolerance` (degrees) to the last kept point.
  // Not Douglas-Peucker; that is in utils/trackToRoute.ts (track → route).
  private simplifyPoints(points: TrackPoint[], tolerance: number): TrackPoint[] {
    if (points.length <= 2) return points;
    
    // Keep first and last points
    const result: TrackPoint[] = [points[0]];
    let lastPoint = points[0];
    
    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.calculateDistance(lastPoint, points[i]);
      if (distance > tolerance) {
        result.push(points[i]);
        lastPoint = points[i];
      }
    }
    
    result.push(points[points.length - 1]);
    return result;
  }

  private calculateDistance(p1: TrackPoint, p2: TrackPoint): number {
    const latDiff = p2.latitude - p1.latitude;
    const lonDiff = p2.longitude - p1.longitude;
    return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
  }

  // Decompress track points for use
  private decompressTrackPoints(compressed: CompressedTrackPoints): TrackPoint[] {
    try {
      return JSON.parse(compressed.data);
    } catch (error) {
      console.error('Failed to decompress track points:', error);
      return [];
    }
  }

  // Batch write operations for better performance
  private async flushBatch(): Promise<void> {
    if (this.pendingWrites.length === 0) return;

    const batch = this.pendingWrites.splice(0, this.BATCH_SIZE);
    
    try {
      await db.transaction('rw', db.tracks, async () => {
        for (const { track, resolve } of batch) {
          const result = await db.tracks.add(track);
          resolve({ ...track, id: result as string });
        }
      });
    } catch (error) {
      console.error('Batch write failed:', error);
      // Reject all pending writes
      batch.forEach(({ resolve }) => resolve({} as Track));
    }

    // Schedule next batch if there are more writes
    if (this.pendingWrites.length > 0) {
      this.scheduleBatch();
    }
  }

  private scheduleBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.flushBatch();
    }, this.BATCH_DELAY);
  }

  // Create track with compressed points and batching
  async create(item: Omit<Track, 'id'>): Promise<Track> {
    // If points are already compressed, use as-is, otherwise compress
    const trackData: Track = {
      ...item,
      id: this.generateId(),
      points: item.points.compressed 
        ? item.points 
        : this.compressTrackPoints(JSON.parse(item.points.data))
    };

    // For immediate writes (like track completion), bypass batching
    if (item.endTime) {
      return await super.create(trackData);
    }

    // For ongoing tracks, use batching
    return new Promise((resolve) => {
      this.pendingWrites.push({ track: trackData, resolve });
      
      if (this.pendingWrites.length >= this.BATCH_SIZE) {
        this.flushBatch();
      } else {
        this.scheduleBatch();
      }
    });
  }

  // Batch update track points
  async batchUpdatePoints(updates: Array<{ id: string; points: TrackPoint[] }>): Promise<void> {
    await db.transaction('rw', db.tracks, async () => {
      for (const { id, points } of updates) {
        const compressed = this.compressTrackPoints(points);
        await db.tracks.update(id, { points: compressed });
      }
    });
  }

  // Get track with decompressed points
  async getByIdWithPoints(id: string): Promise<(Track & { decompressedPoints: TrackPoint[] }) | undefined> {
    const track = await this.getById(id);
    if (!track) return undefined;

    return {
      ...track,
      decompressedPoints: this.decompressTrackPoints(track.points)
    };
  }

  // Get tracks sorted by start time with efficient indexing
  async getAllSorted(order: 'asc' | 'desc' = 'desc'): Promise<Track[]> {
    if (order === 'desc') {
      return await db.tracks.orderBy('startTime').reverse().toArray();
    }
    return await db.tracks.orderBy('startTime').toArray();
  }

  // Get tracks within a date range (uses index)
  async getByDateRange(startDate: Date, endDate: Date): Promise<Track[]> {
    return await db.tracks
      .where('startTime')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  // Search tracks by name
  async searchByName(query: string): Promise<Track[]> {
    const lowerQuery = query.toLowerCase();
    return await db.tracks
      .filter(track => track.name.toLowerCase().includes(lowerQuery))
      .toArray();
  }

  // Get tracks by minimum distance
  async getByMinDistance(minDistance: number): Promise<Track[]> {
    return await db.tracks
      .filter(track => track.distance >= minDistance)
      .toArray();
  }

  // Update track points (with compression)
  async updatePoints(id: string, points: TrackPoint[]): Promise<Track> {
    const compressed = this.compressTrackPoints(points);
    return await this.update(id, { points: compressed });
  }

  // Get total storage size estimate
  async getStorageSize(): Promise<number> {
    const tracks = await this.getAll();
    return tracks.reduce((total, track) => {
      return total + track.points.data.length;
    }, 0);
  }

  // Delete old tracks to free up space
  async deleteOlderThan(date: Date): Promise<number> {
    const oldTracks = await db.tracks
      .where('endTime')
      .below(date)
      .toArray();
    
    await db.tracks
      .where('endTime')
      .below(date)
      .delete();
    
    return oldTracks.length;
  }

  // Monitor memory usage
  async getMemoryStats(): Promise<{
    trackCount: number;
    totalSize: number;
    averageSize: number;
    compressionRatio: number;
  }> {
    const tracks = await this.getAll();
    const totalSize = await this.getStorageSize();
    
    // Estimate uncompressed size (rough estimate)
    const estimatedUncompressed = tracks.reduce((total, track) => {
      const points = this.decompressTrackPoints(track.points);
      return total + (points.length * 100); // ~100 bytes per point
    }, 0);

    return {
      trackCount: tracks.length,
      totalSize,
      averageSize: tracks.length > 0 ? totalSize / tracks.length : 0,
      compressionRatio: estimatedUncompressed > 0 ? totalSize / estimatedUncompressed : 1,
    };
  }

  // Cleanup on destroy
  destroy(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.flushBatch(); // Flush remaining writes
    }
  }
}

export const trackRepository = new TrackRepository();
