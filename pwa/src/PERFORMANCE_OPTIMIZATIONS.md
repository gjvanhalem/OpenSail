# Performance Optimizations

This document describes the performance optimizations in the app. How they are tested is in [PERFORMANCE_TESTING.md](../PERFORMANCE_TESTING.md).

## Code Splitting

### Route-Based Splitting
All page components are lazy-loaded with React's `lazy()` and `Suspense` (`src/App.tsx`):
- ChartPage
- RoutesPage
- TracksPage
- LogbookPage
- SettingsPage
- InstrumentsPage

This keeps the initial bundle small and improves Time to Interactive.

### Vendor Chunking
Large dependencies are split into separate chunks in `vite.config.ts`:
- `vendor-react`: React, React DOM, React Router
- `vendor-redux`: Redux Toolkit, React Redux
- `vendor-map`: MapLibre GL
- `vendor-db`: Dexie
- `protocols`: NMEA 0183, NMEA 2000 and SeaTalk parsers
- `connections`: Serial and Bluetooth connections

## Rendering Performance

### React.memo
Components that update often or are expensive to draw are wrapped in `React.memo`:
- Chart layers: `VesselMarker`, `RouteLayer`, `RouteHazardLayer`, `EncLayers`, `AISLayer`
- Gauges: `SpeedGauge`, `DepthGauge`, `WindGauge`, `HeadingCompass`, `PositionDisplay`
- `TrackList` and its `TrackItem` rows

### Debouncing
The chart page debounces the map viewport (`useDebounce`, 100ms) before passing it to the chart, so panning and zooming don't re-render everything on every frame.

## Chart Tiles

- **Offline tiles in IndexedDB:** the map loads tiles through the `opensail://` protocol (`src/components/chart/tileProtocol.ts`), which serves downloaded regions from IndexedDB and fetches the rest from the network.
- **No double caching:** chart tiles and glyphs are deliberately left out of the service worker cache, because the protocol already stores downloaded regions.
- **PMTiles:** ENC charts are single PMTiles archives, read with range requests. In the Windows and Android apps these go through native HTTP (`src/platform/FetchRangeSource.ts`).

## Storage Optimizations

### Batch Writes
`TrackRepository` batches new tracks that are still being recorded and writes them together: after 10 writes or a 1 second delay. Completed tracks are written straight away.

### Track Point Thinning
Before a track is stored, `TrackRepository` drops points that are closer than a small distance to the previous kept point. This is a simple distance filter, not a full Douglas-Peucker simplification.

### Indexes
Database queries use indexes (`src/database/db.ts`):
- `tracks`: `startTime`, `endTime`
- `routes`: `createdAt`, `updatedAt`
- `waypoints`: `routeId`
- `chartTiles`: `source`, `timestamp`, and a multi-entry index on `regions`
- `safetyEvents`: `timestamp`, `type`, `sessionId`

## Best Practices

### Component Optimization
1. Use `React.memo` for components that get frequent updates
2. Use `useMemo` for expensive calculations
3. Use `useCallback` for handlers passed to memoized children
4. Avoid creating new objects and arrays in render for memoized props

### State Management
1. Select only the slice of state a component needs
2. Avoid unnecessary state updates, especially at instrument data rates
3. Batch related state updates

### Database Operations
1. Use batch operations for multiple writes
2. Query by indexed fields
3. Clean up old data, such as chart regions that are no longer needed

### Map Performance
1. Debounce viewport updates
2. Keep layer counts and visible features low
3. Let people turn layers off (Layers panel)

## Troubleshooting

### Low FPS
- Turn layers off to find an expensive one
- Check for re-renders with the React DevTools Profiler
- Profile with Chrome DevTools

### High Memory Usage
- Delete old tracks or chart regions
- Check for leaked listeners and timers

### Large Bundle Size
- Check the `npm run build` output
- Check that the pages are still lazy loaded
- Remove unused dependencies
