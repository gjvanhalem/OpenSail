# IndexedDB Storage Layer

This module is the PWA's IndexedDB storage layer, built on Dexie 4 with the repository pattern. The same storage is used in the browser and in the Windows (WebView2) and Android (WebView) apps.

## Features

- **Dexie Integration**: Type-safe IndexedDB wrapper (`db.ts`, database `NavigationDB`)
- **Repository Pattern**: CRUD interfaces per data type (`repositories/`)
- **Track Simplification**: Track points are simplified (Douglas-Peucker) and stored as JSON
- **AIS TTL**: AIS targets older than 24 hours count as expired
- **Tile Cache**: Offline chart tiles and downloaded regions (`services/TileCache.ts`)
- **Version Migrations**: Schema versions 1-4 in `db.ts`

## Database Schema

- `routes`: Navigation routes with waypoints
- `waypoints`: Individual waypoints (can be part of routes)
- `tracks`: Recorded vessel tracks with simplified point data and a line colour
- `aisTargets`: AIS vessel targets (no decoder feeds them yet)
- `logbook`: Logbook entries (the logbook is Phase 6; the page is a hidden placeholder)
- `safetyEvents`: Man-overboard and anchor-watch events, read back on start-up to restore an active MOB or anchor watch
- `chartTiles`: Offline chart tiles and label glyphs, each with the regions that include it
- `chartRegions`: Chart regions downloaded for offline use
- `settings`: Application settings (key-value store, values JSON)

## Usage

### Initialize Database

```typescript
import { initializeDatabase } from './database';

// Initialize on app startup
await initializeDatabase();
```

### Repositories

`repositories/index.ts` exports one instance per repository: `routeRepository`, `waypointRepository`, `trackRepository`, `aisRepository`, `logbookRepository`, `settingsRepository` and `safetyEventRepository`. `BaseRepository` gives `getAll`, `getById`, `create`, `update`, `delete` and `count`.

#### Route Repository

```typescript
import { routeRepository } from './database';

const routes = await routeRepository.getAllSorted('desc');
const searchResults = await routeRepository.searchByName('cruise');
await routeRepository.update(route.id!, { name: 'Updated Name' });
await routeRepository.delete(route.id!);
```

#### Track Repository

```typescript
import { trackRepository } from './database';

// Points that are not yet marked compressed are simplified on create
const trackWithPoints = await trackRepository.getByIdWithPoints(trackId);
console.log(trackWithPoints?.decompressedPoints);

const deletedCount = await trackRepository.deleteOlderThan(new Date('2026-01-01'));
```

A track without an `endTime` is written in batches (up to 10 writes, or after 1 second); a finished track is written at once.

#### AIS Repository

```typescript
import { aisRepository } from './database';

await aisRepository.upsert(target);
const activeTargets = await aisRepository.getActiveTargets(); // updated within 24 hours
const nearbyTargets = await aisRepository.getInBounds(52.0, 53.0, 4.5, 5.5);
const expiredCount = await aisRepository.cleanupExpired();
```

#### Settings Repository

```typescript
import { settingsRepository } from './database/repositories';

const units = await settingsRepository.get('units');
await settingsRepository.set('displayMode', 'night');
const all = await settingsRepository.getAll(); // AppSettings with defaults filled in
```

`AppSettings` and `DEFAULT_SETTINGS` in `SettingsRepository.ts` are the list of settings. The Redux `settingsSlice` loads and saves them through this repository.

#### Safety Event Repository

`getBySession()`, `getRecent()` and `getActiveSessions()` (the MOB or anchor watch that was active when the app closed).

### Using Tile Cache

```typescript
import { tileCache } from './database';

// A tile by source and z/x/y ('base', 'seamarks', 'enc-<region>')
const tile = await tileCache.getTile('base', 10, 525, 336);

// Downloaded regions
const regions = await tileCache.getRegions();
await tileCache.deleteRegion(regionId); // tiles no other region needs go with it

// Statistics and quota
const stats = await tileCache.getStats();
const quota = await tileCache.checkStorageQuota();
await tileCache.requestPersistentStorage();
```

Tiles are written by `ChartDownloadService` (`putTiles()`). See `components/chart/OFFLINE_CHARTS_README.md`.

## Storage Management

### Tracks

Track points are simplified with a Douglas-Peucker pass and stored as a JSON string (`CompressedTrackPoints`).

### AIS Targets

`getActiveTargets()` returns only targets updated within the last 24 hours. `cleanupExpired()` removes older ones.

### Tile Cache

There is no automatic eviction. A tile is deleted when the last downloaded region that includes it is deleted.

## Database Migrations

Schema changes go in the `NavigationDatabase` constructor in `db.ts` as a new `this.version(n)`:

- **1**: routes, waypoints, tracks, aisTargets, logbook, chartTiles, settings
- **2**: `safetyEvents`
- **3**: offline charts: `chartTiles` gets `source` and `*regions`, new `chartRegions` table; old (Mapbox) tiles are cleared
- **4**: settings nothing read any more are deleted (`REMOVED_SETTINGS`)

## Performance Tips

1. **Batch Operations**: Use `bulkAdd`, `bulkPut` or `bulkDelete` for multiple items
2. **Indexes**: Query on indexed fields (defined in the schema)
3. **Transactions**: Use `db.transaction()` when several tables change together

## Error Handling

Repository methods return Promises; wrap them in try-catch:

```typescript
try {
  const route = await routeRepository.create(routeData);
} catch (error) {
  console.error('Failed to create route:', error);
}
```

## Testing

Tests run against `fake-indexeddb`, loaded in `src/test/setup.ts`, so Vitest tests can use the real Dexie database.
