# Design Document: PWA Migration

## Overview

This design document outlines the architecture for migrating OpenSail from React Native to a Progressive Web App (PWA). The new architecture leverages modern web technologies to provide a cross-platform solution that works seamlessly on Windows, Android, and iOS without native build toolchains.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Environment                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   React UI   │  │ Service      │  │  Web APIs    │     │
│  │  Components  │  │ Worker       │  │ (Bluetooth,  │     │
│  │              │  │              │  │  Serial, GPS)│     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │           Application State (Redux)                 │    │
│  └──────┬──────────────────┬──────────────────┬───────┘    │
│         │                  │                  │              │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐     │
│  │  IndexedDB   │  │  Mapbox GL   │  │  Protocol    │     │
│  │  Storage     │  │  JS          │  │  Parsers     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Core Framework:**
- React 18.x with TypeScript
- Vite for build tooling (fast, modern, Windows-friendly)
- Redux Toolkit for state management
- React Router for navigation

**PWA Features:**
- Workbox for Service Worker management
- Web App Manifest for installability
- IndexedDB (via Dexie.js) for local storage

**Mapping:**
- Mapbox GL JS for vector charts
- Custom tile layer for nautical charts

**Device Integration:**
- Web Serial API for USB instruments
- Web Bluetooth API for Bluetooth instruments
- Geolocation API for GPS

**UI Framework:**
- Tailwind CSS for responsive design
- Headless UI for accessible components
- React Spring for animations

**Testing:**
- Vitest for unit tests
- Playwright for E2E tests
- Testing Library for component tests

## Components and Interfaces

### 1. Application Shell

**Purpose:** Main application container with PWA setup

**Key Components:**
- `App.tsx`: Root component with routing
- `Layout.tsx`: Responsive layout wrapper
- `Navigation.tsx`: Top navigation bar
- `Sidebar.tsx`: Collapsible side panel for tools

**Interfaces:**
```typescript
interface AppConfig {
  version: string;
  apiEndpoint?: string;
  mapboxToken: string;
  offlineMode: boolean;
}

interface LayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  fullscreen?: boolean;
}
```

### 2. Chart Display Module

**Purpose:** Render nautical charts with vessel position

**Key Components:**
- `ChartView.tsx`: Main map container
- `VesselMarker.tsx`: Current position indicator
- `RouteLayer.tsx`: Display planned routes
- `TrackLayer.tsx`: Display recorded tracks
- `AISLayer.tsx`: Display other vessels

**Interfaces:**
```typescript
interface ChartViewProps {
  center: [number, number];
  zoom: number;
  bearing: number;
  onMove: (viewport: Viewport) => void;
}

interface Viewport {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

interface VesselPosition {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  timestamp: Date;
}
```

### 3. Instrument Integration Module

**Purpose:** Connect to and parse data from marine instruments

**Key Components:**
- `InstrumentManager.tsx`: Connection UI
- `SerialConnection.ts`: Web Serial API wrapper
- `BluetoothConnection.ts`: Web Bluetooth API wrapper
- `ProtocolParser.ts`: NMEA/SeaTalk parser (reuse existing)

**Interfaces:**
```typescript
interface InstrumentConnection {
  id: string;
  type: 'serial' | 'bluetooth';
  protocol: 'NMEA0183' | 'NMEA2000' | 'SeaTalk';
  status: 'connected' | 'disconnected' | 'error';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onData(callback: (data: InstrumentData) => void): void;
}

interface InstrumentData {
  type: string;
  timestamp: Date;
  values: Record<string, any>;
}
```

### 4. Data Storage Module

**Purpose:** Persist navigation data locally

**Key Components:**
- `DatabaseService.ts`: IndexedDB wrapper using Dexie
- `RouteRepository.ts`: Route CRUD operations
- `TrackRepository.ts`: Track recording and retrieval
- `ChartCacheService.ts`: Tile caching

**Interfaces:**
```typescript
interface StorageService {
  routes: Repository<Route>;
  waypoints: Repository<Waypoint>;
  tracks: Repository<Track>;
  aisTargets: Repository<AISTarget>;
  chartTiles: TileCache;
}

interface Repository<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

interface TileCache {
  getTile(z: number, x: number, y: number): Promise<Blob | null>;
  putTile(z: number, x: number, y: number, data: Blob): Promise<void>;
  clearRegion(bounds: Bounds): Promise<void>;
}
```

### 5. Service Worker Module

**Purpose:** Enable offline functionality and caching

**Key Components:**
- `service-worker.ts`: Main service worker
- `cache-strategies.ts`: Caching strategies for different resources
- `sync-manager.ts`: Background sync for data

**Caching Strategy:**
- **App Shell:** Cache-first (HTML, CSS, JS)
- **Chart Tiles:** Cache-first with network fallback
- **API Data:** Network-first with cache fallback
- **Instrument Data:** Network-only (real-time)

### 6. Route Planning Module

**Purpose:** Create and manage navigation routes

**Key Components:**
- `RoutePlanner.tsx`: Route creation UI
- `WaypointEditor.tsx`: Add/edit waypoints
- `RouteCalculator.ts`: Distance and bearing calculations
- `RouteValidator.ts`: Check for hazards

**Interfaces:**
```typescript
interface Route {
  id: string;
  name: string;
  waypoints: Waypoint[];
  totalDistance: number;
  estimatedTime: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  notes?: string;
}
```

## Data Models

### Core Navigation Models

```typescript
// Position data
interface Position {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp: Date;
}

// Track recording
interface Track {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  points: TrackPoint[];
  distance: number;
  averageSpeed: number;
}

interface TrackPoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
}

// AIS targets
interface AISTarget {
  mmsi: string;
  name?: string;
  position: Position;
  heading: number;
  speed: number;
  cpa: number; // Closest Point of Approach
  tcpa: number; // Time to CPA
  lastUpdate: Date;
}

// Logbook
interface LogbookEntry {
  id: string;
  timestamp: Date;
  position: Position;
  weather: WeatherData;
  notes: string;
  engineHours?: number;
}
```

### Storage Schema (IndexedDB)

```typescript
// Dexie database schema
class NavigationDatabase extends Dexie {
  routes!: Table<Route>;
  waypoints!: Table<Waypoint>;
  tracks!: Table<Track>;
  aisTargets!: Table<AISTarget>;
  logbook!: Table<LogbookEntry>;
  chartTiles!: Table<ChartTile>;
  settings!: Table<Setting>;

  constructor() {
    super('NavigationDB');
    this.version(1).stores({
      routes: 'id, name, createdAt',
      waypoints: 'id, routeId, name',
      tracks: 'id, name, startTime, endTime',
      aisTargets: 'mmsi, lastUpdate',
      logbook: 'id, timestamp',
      chartTiles: '[z+x+y], timestamp',
      settings: 'key'
    });
  }
}
```

## Error Handling

### Error Categories

1. **Network Errors:** Handle gracefully with offline mode
2. **Storage Errors:** Notify user if quota exceeded
3. **Device Errors:** Clear messages for unsupported APIs
4. **Parse Errors:** Log and skip invalid instrument data

### Error Handling Strategy

```typescript
interface AppError {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  recoverable: boolean;
  timestamp: Date;
}

class ErrorHandler {
  static handle(error: Error, context: string): void {
    // Log to console in development
    // Send to error tracking in production
    // Show user-friendly message
    // Attempt recovery if possible
  }
}
```

## Testing Strategy

### Unit Tests
- Protocol parsers with known NMEA sentences
- Route calculations and validations
- Data transformations
- Storage operations (mocked IndexedDB)

### Integration Tests
- Service Worker caching behavior
- IndexedDB operations
- Map interactions
- Instrument connections (mocked)

### E2E Tests
- Complete user workflows
- Offline functionality
- PWA installation
- Cross-browser compatibility

### Performance Tests
- Chart rendering at 60 FPS
- Large track file loading
- IndexedDB query performance
- Memory usage over time

## Migration Strategy

### Phase 1: Core Infrastructure
1. Set up Vite + React + TypeScript project
2. Configure PWA with Workbox
3. Set up IndexedDB with Dexie
4. Implement basic routing

### Phase 2: Data Layer
1. Port existing TypeScript models
2. Implement IndexedDB repositories
3. Port protocol parsers (NMEA, SeaTalk)
4. Set up state management with Redux

### Phase 3: UI Components
1. Create responsive layout
2. Integrate Mapbox GL JS
3. Build instrument display components
4. Implement route planning UI

### Phase 4: Device Integration
1. Implement Web Serial API wrapper
2. Implement Web Bluetooth API wrapper
3. Connect protocol parsers to device APIs
4. Add connection management UI

### Phase 5: Offline & PWA
1. Configure Service Worker caching
2. Implement chart tile caching
3. Add offline data sync
4. Test PWA installation

### Phase 6: Testing & Polish
1. Write comprehensive tests
2. Performance optimization
3. Cross-browser testing
4. Documentation

## Browser Compatibility

### Required Features
- **Chrome/Edge 89+:** Full support (Web Serial, Web Bluetooth)
- **Safari 15.4+:** Partial support (no Web Serial, limited Bluetooth)
- **Firefox 90+:** Partial support (no Web Serial/Bluetooth)

### Fallback Strategy
- Detect API availability at runtime
- Show clear messages for unsupported features
- Provide alternative input methods (manual data entry)
- Recommend Chrome/Edge for full functionality

## Performance Considerations

### Optimization Techniques
1. **Code Splitting:** Lazy load routes and heavy components
2. **Virtual Scrolling:** For large lists (tracks, logbook)
3. **Web Workers:** Offload heavy computations (track processing)
4. **Debouncing:** Throttle map updates and data processing
5. **Memoization:** Cache expensive calculations
6. **Asset Optimization:** Compress images, minify code

### Performance Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse PWA Score: > 90
- Chart FPS: 60 (stable)
- Memory Usage: < 200MB

## Security Considerations

1. **HTTPS Required:** PWA features require secure context
2. **Content Security Policy:** Restrict script sources
3. **Data Encryption:** Encrypt sensitive data in IndexedDB
4. **API Key Protection:** Use environment variables
5. **User Permissions:** Request device access explicitly

## Deployment

### Build Process
```bash
npm run build  # Vite production build
npm run preview  # Test production build locally
```

### Hosting Options
- **Static Hosting:** Netlify, Vercel, GitHub Pages
- **CDN:** CloudFlare for global distribution
- **Self-Hosted:** Nginx or Apache with HTTPS

### Update Strategy
- Service Worker updates automatically
- Show update notification to user
- Reload app to apply updates
- Version tracking in manifest
