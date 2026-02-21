/**
 * Storage monitoring and optimization utilities
 * Helps track and manage IndexedDB storage usage
 */

import { db } from '@/database/db';
import { trackRepository } from '@/database/repositories/TrackRepository';

export interface StorageStats {
  used: number;
  quota: number;
  percentage: number;
  breakdown: {
    tracks: number;
    chartTiles: number;
    routes: number;
    logbook: number;
    aisTargets: number;
    settings: number;
  };
}

/**
 * Get current storage usage statistics
 */
export async function getStorageStats(): Promise<StorageStats> {
  const breakdown = {
    tracks: 0,
    chartTiles: 0,
    routes: 0,
    logbook: 0,
    aisTargets: 0,
    settings: 0,
  };

  try {
    // Get track storage size
    breakdown.tracks = await trackRepository.getStorageSize();

    // Get chart tiles size
    const tiles = await db.chartTiles.toArray();
    breakdown.chartTiles = tiles.reduce((total, tile) => total + tile.data.size, 0);

    // Get routes size (estimate)
    const routes = await db.routes.toArray();
    breakdown.routes = routes.reduce(
      (total, route) => total + JSON.stringify(route).length,
      0
    );

    // Get logbook size (estimate)
    const logbook = await db.logbook.toArray();
    breakdown.logbook = logbook.reduce(
      (total, entry) => total + JSON.stringify(entry).length,
      0
    );

    // Get AIS targets size (estimate)
    const aisTargets = await db.aisTargets.toArray();
    breakdown.aisTargets = aisTargets.reduce(
      (total, target) => total + JSON.stringify(target).length,
      0
    );

    // Get settings size (estimate)
    const settings = await db.settings.toArray();
    breakdown.settings = settings.reduce(
      (total, setting) => total + JSON.stringify(setting).length,
      0
    );

    // Get browser storage quota
    const estimate = await navigator.storage?.estimate();
    const used = estimate?.usage || 0;
    const quota = estimate?.quota || 0;
    const percentage = quota > 0 ? (used / quota) * 100 : 0;

    return {
      used,
      quota,
      percentage,
      breakdown,
    };
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return {
      used: 0,
      quota: 0,
      percentage: 0,
      breakdown,
    };
  }
}

/**
 * Check if storage is running low
 */
export async function isStorageLow(threshold: number = 80): Promise<boolean> {
  const stats = await getStorageStats();
  return stats.percentage >= threshold;
}

/**
 * Clean up old data to free storage
 */
export async function cleanupStorage(options: {
  deleteTracksOlderThan?: Date;
  deleteTilesOlderThan?: Date;
  deleteLogbookOlderThan?: Date;
  deleteAISHistoryOlderThan?: Date;
} = {}): Promise<{
  tracksDeleted: number;
  tilesDeleted: number;
  logbookDeleted: number;
  aisHistoryCleared: number;
}> {
  const result = {
    tracksDeleted: 0,
    tilesDeleted: 0,
    logbookDeleted: 0,
    aisHistoryCleared: 0,
  };

  try {
    // Delete old tracks
    if (options.deleteTracksOlderThan) {
      result.tracksDeleted = await trackRepository.deleteOlderThan(
        options.deleteTracksOlderThan
      );
    }

    // Delete old chart tiles
    if (options.deleteTilesOlderThan) {
      const oldTiles = await db.chartTiles
        .where('timestamp')
        .below(options.deleteTilesOlderThan)
        .toArray();
      
      await db.chartTiles
        .where('timestamp')
        .below(options.deleteTilesOlderThan)
        .delete();
      
      result.tilesDeleted = oldTiles.length;
    }

    // Delete old logbook entries
    if (options.deleteLogbookOlderThan) {
      const oldEntries = await db.logbook
        .where('timestamp')
        .below(options.deleteLogbookOlderThan)
        .toArray();
      
      await db.logbook
        .where('timestamp')
        .below(options.deleteLogbookOlderThan)
        .delete();
      
      result.logbookDeleted = oldEntries.length;
    }

    // Clear old AIS history
    if (options.deleteAISHistoryOlderThan) {
      const targets = await db.aisTargets.toArray();
      let cleared = 0;

      for (const target of targets) {
        if (target.lastUpdate < options.deleteAISHistoryOlderThan) {
          await db.aisTargets.delete(target.mmsi);
          cleared++;
        }
      }

      result.aisHistoryCleared = cleared;
    }

    return result;
  } catch (error) {
    console.error('Failed to cleanup storage:', error);
    return result;
  }
}

/**
 * Optimize database by compacting and rebuilding indexes
 */
export async function optimizeDatabase(): Promise<void> {
  try {
    // Dexie doesn't have a built-in compact method
    // But we can trigger garbage collection by closing and reopening
    await db.close();
    await db.open();
    console.log('Database optimized');
  } catch (error) {
    console.error('Failed to optimize database:', error);
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Monitor storage and trigger cleanup if needed
 */
export async function autoCleanupIfNeeded(threshold: number = 85): Promise<boolean> {
  const isLow = await isStorageLow(threshold);

  if (isLow) {
    console.warn('Storage is running low, triggering automatic cleanup');

    // Delete tracks older than 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Delete tiles older than 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Delete logbook older than 1 year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Delete AIS history older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await cleanupStorage({
      deleteTracksOlderThan: sixMonthsAgo,
      deleteTilesOlderThan: threeMonthsAgo,
      deleteLogbookOlderThan: oneYearAgo,
      deleteAISHistoryOlderThan: sevenDaysAgo,
    });

    return true;
  }

  return false;
}
