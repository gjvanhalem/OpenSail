# Offline Chart Caching

Users can download a chart region for offline use: base map, OpenSeaMap seamarks, Rijkswaterstaat ENC depth data and the label fonts. The map then works without a connection inside that region.

## How the map loads tiles

Every chart tile goes through one MapLibre protocol, `opensail://` (`tileProtocol.ts`):

- `opensail://<source>/{z}/{x}/{y}`: a tile of a source (`base`, `seamarks`, `enc-<region>`)
- `opensail://glyphs/{fontstack}/{range}`: a range of label glyphs

`loadTile()` reads IndexedDB (TileCache) first, then the network while online. Offline, a missing tile is an empty tile, so the map shows what it has without errors. The service worker does **not** cache tiles or glyphs; that would store every tile twice.

Tile sources:
- **base**: OpenFreeMap vector tiles. The tile URL is read once per session from the OpenFreeMap TileJSON, because it changes with every weekly build.
- **seamarks**: OpenSeaMap raster tiles.
- **enc-&lt;region&gt;**: a PMTiles archive from the chart catalog, read with HTTP range requests (`registerPmtilesSource()`). In the Windows and Android apps the archive is read with native HTTP (`platform/FetchRangeSource.ts`), so its host needs no CORS headers.

## Chart catalog

`services/chartCatalog.ts` reads `charts/index.json`: one manifest per ENC region (bounds, zoom range, edition date, archive file), built by `tools/enc-pipeline`. The browser version reads it from its own host (`/charts/`); the native apps read it from the `gjvanhalem/opensail-charts` GitHub releases (`VITE_CHART_CATALOG_URL` in `.env.native`). No catalog (offline, 404) means no ENC regions.

## Components

### ChartDownloadPanel
The "Offline Charts" panel, opened from the Offline charts button on the Chart page (`ChartControls`).

**Features:**
- Storage usage, quota and whether storage is persistent
- Download a new region (name, zoom levels 8-14, estimated size and tile count)
- Lists which ENC regions the area includes
- Active downloads with progress and Cancel
- Downloaded regions (`ChartRegionList`): delete, or update when a newer ENC edition exists

### ViewportRegionSelector
Selects the region to download from the current map view.

**Usage:**
1. User pans and zooms to frame the desired area
2. Clicks "Select This Area" to confirm
3. The region is the map's visible area (MapLibre `getBounds()`, passed up through ChartView's `onBoundsChange`)

### ChartUpdateNotice
Tells the user when a downloaded region has a newer ENC edition.

## Services

### ChartDownloadService
Downloads everything a region needs into TileCache.

**Key Methods:**
- `downloadRegion()`: downloads all tiles and glyphs for a region
- `updateRegion()`: downloads the ENC tiles again for the catalog's current editions; base map and seamark tiles are kept
- `calculateTileCount()`: number of tiles over all sources
- `estimateDownloadSize()`: rough size in MB
- `encRegionsFor()`: catalog ENC regions that overlap the bounds
- `cancelDownload()`: cancels an active download

**Behaviour:**
- 6 parallel requests, tiles written to IndexedDB in batches of 50
- Tiles already stored (for another region) are reused, not downloaded again
- At most 30,000 tiles per download (`MAX_TILES_PER_DOWNLOAD`)
- Checks the storage quota first and asks for persistent storage
- Progress is reported every 10 tiles

### ChartCacheLoader
Puts the downloaded regions from IndexedDB into the Redux store on app startup.

### chartUpdates
`findChartUpdates()` compares the ENC editions in downloaded regions with the catalog. `useChartUpdateCheck()` runs the check on start and whenever the app comes online.

## State Management

### chartCacheSlice
**State:**
- `cachedRegions`: downloaded regions
- `activeDownloads`: downloads in progress, by region id
- `totalCacheSize`, `totalTileCount`: cache totals
- `storageQuota`: browser storage quota
- `persistentStorage`: whether the browser keeps the storage under pressure
- `updates`, `lastUpdateCheck`: newer ENC editions found by the last check

**Actions and thunks:**
- `startDownload`, `updateDownloadProgress`, `completeDownload`, `failDownload`
- `addCachedRegion` (upsert), `removeCachedRegion`, `updateCachedRegion`
- `loadCacheStats`, `checkForChartUpdates`, `clearRegion`, `clearAllCache`

## Storage

### TileCache Service (`database/services/TileCache.ts`)
- Tiles in the `chartTiles` table, keyed `<source>/<z>/<x>/<y>` (glyphs: `glyphs/<fontstack>/<range>`)
- Each tile lists the regions that include it, and is deleted with the last of them
- Downloaded regions in the `chartRegions` table, with their ENC manifests and edition date
- Storage statistics, quota check and persistent storage request

There is no automatic eviction: tiles stay until the user deletes their region.

## Error Handling

- **Too large:** more than 30,000 tiles is refused; choose a smaller area or fewer zoom levels
- **Quota:** checked before the download starts; a `QuotaExceededError` while writing stops the download
- **Network errors:** failed tiles are counted, the download continues; the region keeps a `failedTiles` count. If no tile could be downloaded, the download fails
- **Cancellation:** the region is deleted again, so nothing half-done stays behind

## Future Enhancements

- [ ] Resume interrupted downloads
- [ ] Automatic region suggestions based on routes
- [ ] Export/import downloaded regions
