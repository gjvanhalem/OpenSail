# IndexedDB Storage Layer

This module provides a complete IndexedDB storage layer for the PWA using Dexie.js with the repository pattern.

## Features

- **Dexie.js Integration**: Type-safe IndexedDB wrapper with excellent TypeScript support
- **Repository Pattern**: Clean CRUD interfaces for all data types
- **Track Compression**: Efficient storage of track points with JSON compression
- **AIS TTL Cleanup**: Automatic cleanup of expired AIS targets (24-hour retention)
- **Tile Caching**: LRU eviction for chart tiles with storage quota management
- **Version Migrations**: Support for database schema upgrades

## Database Schema

The database includes the following tables:

- `routes`: Navigation routes with waypoints
- `waypoints`: Individual waypoints (can be part of routes)
- `tracks`: Recorded vessel tracks with compressed point data
- `aisTargets`: AIS vessel targets with automatic expiration
- `logbook`: Electronic logbook entries
- `chartTiles`: Cached map tiles with LRU eviction
- `settings`: Application settings (key-value store)

## Usage

### Initialize Database

```typescript
import { initializeDatabase } from './database';

// Initialize on app startup
await initializeDatabase();
```

### Using Repositories

#### Route Repository

```typescript
import { routeRepository } from './database';

// Create a route
const route = await routeRepository.create({
  name: 'Coastal Cruise',
  waypoints: [
    { name: 'Start', latitude: 51.5, longitude: -0.1, arrivalRadius: 50 },
    { name: 'End', latitude: 51.6, longitude: -0.2, arrivalRadius: 50 }
  ],
  totalDistance: 15.2,
  estimatedDuration: 120,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Get all routes
const routes = await routeRepository.getAllSorted('desc');

// Search routes
const searchResults = await routeRepository.searchByName('cruise');

// Update route
await routeRepository.update(route.id!, { name: 'Updated Name' });

// Delete route
await routeRepository.delete(route.id!);
```

#### Track Repository

```typescript
import { trackRepository } from './database';

// Create a track with compressed points
const track = await trackRepository.create({
  name: 'Morning Sail',
  points: {
    compressed: true,
    data: JSON.stringify([
      { latitude: 51.5, longitude: -0.1, speed: 5.2, heading: 180, timestamp: new Date() }
    ])
  },
  startTime: new Date(),
  endTime: new Date(),
  distance: 10.5,
  maxSpeed: 6.8,
  avgSpeed: 5.2
});

// Get track with decompressed points
const trackWithPoints = await trackRepository.getByIdWithPoints(track.id!);
console.log(trackWithPoints?.decompressedPoints);

// Delete old tracks
const deletedCount = await trackRepository.deleteOlderThan(new Date('2024-01-01'));
```

#### AIS Repository

```typescript
import { aisRepository } from './database';

// Upsert AIS target (create or update)
await aisRepository.upsert({
  mmsi: '123456789',
  name: 'VESSEL NAME',
  callSign: 'ABC123',
  latitude: 51.5,
  longitude: -0.1,
  course: 180,
  speed: 10.5,
  heading: 180,
  vesselType: 70,
  length: 50,
  width: 10,
  lastUpdate: new Date(),
  history: JSON.stringify([])
});

// Get active targets (updated within 24 hours)
const activeTargets = await aisRepository.getActiveTargets();

// Get targets in bounds
const nearbyTargets = await aisRepository.getInBounds(51.0, 52.0, -1.0, 0.0);

// Clean up expired targets
const expiredCount = await aisRepository.cleanupExpired();
```

#### Logbook Repository

```typescript
import { logbookRepository } from './database';

// Create logbook entry
await logbookRepository.create({
  voyageId: 'voyage_123',
  timestamp: new Date(),
  latitude: 51.5,
  longitude: -0.1,
  type: 'waypoint',
  notes: 'Passed marker buoy'
});

// Get entries for a voyage
const entries = await logbookRepository.getByVoyageId('voyage_123');

// Export to CSV
const csv = await logbookRepository.exportToCSV(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
```

### Using Tile Cache

```typescript
import { tileCache } from './database';

// Store a tile
const tileData = new Blob([/* tile data */]);
await tileCache.putTile(10, 512, 342, tileData, 'vector', 'region_1');

// Retrieve a tile
const tile = await tileCache.getTile(10, 512, 342);

// Check if tile exists
const exists = await tileCache.hasTile(10, 512, 342);

// Clear region
const deletedCount = await tileCache.clearRegion({
  north: 52.0,
  south: 51.0,
  east: 0.0,
  west: -1.0
}, [10, 11, 12]);

// Get cache statistics
const stats = await tileCache.getStats();
console.log(`Total tiles: ${stats.totalTiles}, Size: ${stats.totalSize} bytes`);

// Check storage quota
const quota = await tileCache.checkStorageQuota();
console.log(`Storage used: ${quota.percentUsed.toFixed(2)}%`);

// Manual LRU eviction
await tileCache.evictOldest(100); // Remove 100 oldest tiles
```

## Storage Management

### Track Compression

Tracks are automatically compressed when stored to save space. The compression uses JSON stringification of track points.

### AIS Target Cleanup

AIS targets are automatically filtered to show only those updated within the last 24 hours. Use `cleanupExpired()` to remove old targets from storage.

### Tile Cache LRU Eviction

The tile cache automatically evicts the oldest tiles when storage approaches the 500MB limit. You can also manually evict tiles or clear specific regions.

### Storage Quota

Check available storage using the Storage API:

```typescript
const quota = await tileCache.checkStorageQuota();
if (quota.percentUsed > 90) {
  // Warn user or clean up old data
  await tileCache.evictOldest(1000);
}
```

## Database Migrations

Future schema changes can be added in `db.ts`:

```typescript
db.version(2).stores({
  routes: 'id, name, createdAt, updatedAt, archived',
}).upgrade(tx => {
  return tx.table('routes').toCollection().modify(route => {
    route.archived = false;
  });
});
```

## Performance Tips

1. **Batch Operations**: Use `bulkAdd`, `bulkUpdate`, or `bulkDelete` for multiple items
2. **Indexes**: Query using indexed fields (defined in schema) for better performance
3. **Compression**: Large datasets (tracks, history) should be compressed
4. **Cleanup**: Regularly clean up old data to maintain performance
5. **Transactions**: Dexie automatically handles transactions for consistency

## Error Handling

All repository methods return Promises and should be wrapped in try-catch:

```typescript
try {
  const route = await routeRepository.create(routeData);
} catch (error) {
  console.error('Failed to create route:', error);
  // Handle error appropriately
}
```

## Testing

The repositories can be tested using Dexie's in-memory database:

```typescript
import Dexie from 'dexie';
import 'fake-indexeddb/auto';

// Tests will use fake-indexeddb automatically
```
