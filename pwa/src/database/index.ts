// Export database instance and initialization
export { db, initializeDatabase, setupMigrations } from './db';

// Export database types
export type {
  Route,
  Waypoint,
  Track,
  TrackPoint,
  CompressedTrackPoints,
  AISTarget,
  LogbookEntry,
  ChartTile,
  ChartRegionRecord,
  Setting
} from './db';

// Export repositories
export {
  routeRepository,
  waypointRepository,
  trackRepository,
  aisRepository,
  logbookRepository
} from './repositories';

export type { Repository } from './repositories';

// Export tile cache service
export { tileCache } from './services/TileCache';
export type { TileCacheService, Bounds, TileCacheStats, TileEntry, StorageQuota } from './services/TileCache';
