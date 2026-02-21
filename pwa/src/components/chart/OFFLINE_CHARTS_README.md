# Offline Chart Caching

This feature allows users to download chart tiles for offline use, enabling navigation without internet connectivity.

## Components

### ChartDownloadPanel
Main UI panel for managing offline chart downloads and cached regions.

**Features:**
- Display storage usage and quota
- Download new regions
- View cached regions
- Monitor active downloads
- Clear cached regions

### ViewportRegionSelector
UI component for selecting a region to download based on the current map viewport.

**Usage:**
1. User pans and zooms to frame the desired area
2. Clicks "Select This Area" to confirm
3. Region bounds are calculated from viewport

## Services

### ChartDownloadService
Handles downloading chart tiles for a specified region.

**Key Methods:**
- `downloadRegion()`: Downloads all tiles for a region
- `calculateTileCount()`: Estimates number of tiles
- `estimateDownloadSize()`: Estimates download size in MB
- `cancelDownload()`: Cancels an active download

**Features:**
- Parallel tile downloads
- Progress tracking
- Error handling
- Quota checking
- Automatic retry for failed tiles

### ChartCacheLoader
Loads cached regions from IndexedDB on app startup.

**Functionality:**
- Scans IndexedDB for cached tiles
- Groups tiles by region
- Calculates region bounds and metadata
- Populates Redux store with cached regions

## State Management

### chartCacheSlice
Redux slice for managing chart cache state.

**State:**
- `cachedRegions`: List of downloaded regions
- `activeDownloads`: Currently downloading regions
- `totalCacheSize`: Total size of cached tiles
- `storageQuota`: Browser storage quota information

**Actions:**
- `startDownload`: Initialize a download
- `updateDownloadProgress`: Update download progress
- `completeDownload`: Mark download as complete
- `clearRegion`: Delete a cached region
- `clearAllCache`: Delete all cached tiles

## Storage

### TileCache Service
IndexedDB-based tile storage with LRU eviction.

**Features:**
- Store tiles by z/x/y coordinates
- Tag tiles with region identifier
- LRU eviction when quota exceeded
- Query tiles by region or zoom level
- Calculate storage statistics

### Service Worker Integration
Workbox-based service worker with cache-first strategy for tiles.

**Caching Strategy:**
1. Check IndexedDB for tile
2. Check Service Worker cache
3. Fetch from network if not cached
4. Store in both caches for future use

**Configuration:**
- Vector tiles (.mvt): Cache-first, 1 year expiration
- Raster tiles (.png/.jpg): Cache-first, 90 days expiration
- Maximum 5000 vector tiles cached

## Usage Flow

### Downloading a Region

1. User opens "Offline Charts" panel
2. Clicks "Select Region on Map"
3. Pans/zooms to desired area
4. Clicks "Select This Area"
5. Enters region name
6. Selects zoom levels (8-14)
7. Reviews estimated size
8. Clicks "Start Download"
9. Progress bar shows download status
10. Region appears in "Cached Regions" list

### Using Offline Charts

1. Tiles are automatically served from cache when offline
2. Service Worker intercepts tile requests
3. Returns cached tiles if available
4. Falls back to network if not cached
5. No user intervention required

### Managing Cache

1. View cached regions in panel
2. See tile count and size for each region
3. Delete individual regions
4. Clear all cached tiles
5. Monitor storage quota usage

## Error Handling

### Quota Exceeded
- Checked before download starts
- LRU eviction during download
- User notified if insufficient space
- Suggests clearing old regions

### Network Errors
- Failed tiles tracked separately
- Download continues for remaining tiles
- User can retry failed tiles
- Partial downloads are usable

### Download Cancellation
- User can cancel active downloads
- Partial progress is saved
- Tiles already downloaded remain cached
- Can resume by downloading same region again

## Performance Considerations

### Download Speed
- Tiles downloaded in parallel
- Progress updated every 10 tiles
- Typical download: 50KB per tile
- Example: 1000 tiles ≈ 50MB ≈ 2-5 minutes

### Storage Limits
- Browser quota varies by device
- Typical: 10-50% of available disk space
- Service Worker cache: 5000 tiles max
- IndexedDB: Limited by browser quota

### Memory Usage
- Tiles stored as Blobs
- Minimal memory overhead
- LRU eviction prevents unbounded growth
- Periodic cleanup of old tiles

## Browser Compatibility

### Full Support
- Chrome 89+
- Edge 89+
- Safari 15.4+

### Features
- IndexedDB: All browsers
- Service Worker: All browsers
- Cache API: All browsers
- Storage API: Chrome, Edge, Safari

## Future Enhancements

- [ ] Resume interrupted downloads
- [ ] Background download with Web Workers
- [ ] Automatic region suggestions based on routes
- [ ] Tile compression for smaller storage
- [ ] Differential updates for chart changes
- [ ] Export/import cached regions
- [ ] Sync cached regions across devices
