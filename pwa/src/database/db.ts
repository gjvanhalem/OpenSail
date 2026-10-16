import Dexie, { type Table } from 'dexie';
import type { Route as ModelRoute, Waypoint as ModelWaypoint } from '@/models';

// Re-export model types for database use
export type Route = ModelRoute;
export type Waypoint = ModelWaypoint;

export interface Track {
  id?: string;
  name: string;
  points: CompressedTrackPoints;
  startTime: Date;
  endTime: Date;
  distance: number;
  maxSpeed: number;
  avgSpeed: number;
  /** Line colour on the chart (R9.3); a palette colour by id when unset */
  color?: string;
}

export interface TrackPoint {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: Date;
}

// Compressed format for efficient storage
export interface CompressedTrackPoints {
  compressed: boolean;
  data: string; // JSON stringified array of TrackPoint
}

export interface AISTarget {
  mmsi: string;
  name: string;
  callSign: string;
  latitude: number;
  longitude: number;
  course: number;
  speed: number;
  heading: number;
  vesselType: number;
  length: number;
  width: number;
  lastUpdate: Date;
  history: string; // JSON stringified Position[]
  cpaDistance?: number;
  cpaTime?: number;
}

export interface LogbookEntry {
  id?: string;
  voyageId: string;
  timestamp: Date;
  latitude: number | null;
  longitude: number | null;
  type: 'voyage_start' | 'voyage_end' | 'waypoint' | 'note' | 'event';
  distance?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  notes?: string;
}

/** What happened, for the safety event log (R8.4, R12) */
export type SafetyEventType =
  | 'mob_activated'
  | 'mob_position'
  | 'mob_cleared'
  | 'anchor_dropped'
  | 'anchor_radius_changed'
  | 'anchor_drag_alarm'
  | 'anchor_back_inside'
  | 'anchor_gps_lost'
  | 'anchor_gps_restored'
  | 'anchor_raised'
  | 'alarm_silenced';

/**
 * A man-overboard or anchor-watch event. Kept for the logbook (Phase 6), and
 * read back on start-up to restore a MOB or anchor watch that was active
 * when the app closed.
 */
export interface SafetyEvent {
  id?: string;
  timestamp: Date;
  type: SafetyEventType;
  /** The MOB or anchor watch this event belongs to */
  sessionId: string;
  /** Where the vessel was, when known */
  latitude: number | null;
  longitude: number | null;
  /** The MOB spot or the anchor */
  targetLatitude?: number;
  targetLongitude?: number;
  /** Anchor watch radius, metres */
  radius?: number;
  /** Vessel distance from the MOB spot or anchor, metres */
  distance?: number;
  notes?: string;
}

export interface ChartTile {
  /** `${source}/${z}/${x}/${y}` for tiles; `glyphs/${fontstack}/${range}` for label fonts */
  key: string;
  /** Tile source: 'base', 'seamarks', 'enc-<region>' or 'glyphs' */
  source: string;
  z: number;
  x: number;
  y: number;
  data: Blob;
  format: 'vector' | 'raster' | 'glyphs';
  timestamp: Date;
  /** Downloaded regions that include this tile; it's deleted with the last of them */
  regions: string[];
}

/** A chart region downloaded for offline use (R15) */
export interface ChartRegionRecord {
  id: string;
  name: string;
  bounds: { north: number; south: number; east: number; west: number };
  zoomLevels: number[];
  /** Tile sources downloaded: 'base', 'seamarks', 'enc-<region>' */
  sources: string[];
  /** Manifests of the ENC regions included, so they can be drawn offline (ChartRegionManifest) */
  encRegions: unknown[];
  tileCount: number;
  sizeBytes: number;
  downloadedAt: Date;
  /** Newest edition date of the ENC data included (YYYY-MM-DD), or null without ENC data */
  editionDate: string | null;
}

export interface Setting {
  key: string;
  value: string; // JSON stringified value
}

// Dexie database class
export class NavigationDatabase extends Dexie {
  routes!: Table<Route, string>;
  waypoints!: Table<Waypoint, string>;
  tracks!: Table<Track, string>;
  aisTargets!: Table<AISTarget, string>;
  logbook!: Table<LogbookEntry, string>;
  chartTiles!: Table<ChartTile, string>;
  chartRegions!: Table<ChartRegionRecord, string>;
  settings!: Table<Setting, string>;
  safetyEvents!: Table<SafetyEvent, string>;

  constructor() {
    super('NavigationDB');
    
    // Define database schema
    this.version(1).stores({
      routes: 'id, name, createdAt, updatedAt',
      waypoints: 'id, routeId, name',
      tracks: 'id, name, startTime, endTime',
      aisTargets: 'mmsi, lastUpdate',
      logbook: 'id, voyageId, timestamp, type',
      chartTiles: 'key, [z+x+y], timestamp, region',
      settings: 'key'
    });

    // Phase 4: man overboard and anchor watch events
    this.version(2).stores({
      safetyEvents: 'id, timestamp, type, sessionId'
    });

    // Phase 3 (offline charts): tiles get a source and the regions that hold
    // them; downloaded regions get their own table. The old tiles were Mapbox
    // tiles keyed by z-x-y only, which the map can't use any more.
    this.version(3).stores({
      chartTiles: 'key, source, timestamp, *regions',
      chartRegions: 'id, downloadedAt',
    }).upgrade(tx => tx.table('chartTiles').clear());
  }
}

// Create and export database instance
export const db = new NavigationDatabase();

// Database initialization
export async function initializeDatabase(): Promise<void> {
  try {
    // Open the database
    await db.open();
    console.log('Database initialized successfully');
    
    // Optionally set default settings
    const existingSettings = await db.settings.count();
    if (existingSettings === 0) {
      await setDefaultSettings();
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Set default settings
async function setDefaultSettings(): Promise<void> {
  const defaultSettings = {
    units: 'nautical',
    chartRotation: 'north-up',
    defaultZoom: 12,
    theme: 'light',
    showNavigationAids: true,
    showDepthContours: true,
    anchorWatchRadius: 50,
    enableAnchorAlarm: false,
    enableCollisionAlarm: true,
    collisionWarningDistance: 2,
    enableWeatherAlerts: true,
    autoSync: false,
    instrumentProtocol: 'nmea0183',
    instrumentConnectionType: 'serial',
    serialPort: '',
    networkHost: '',
    networkPort: 10110,
    baudRate: 4800,
    autoReconnect: true
  };

  await db.settings.bulkAdd(
    Object.entries(defaultSettings).map(([key, value]) => ({
      key,
      value: JSON.stringify(value)
    }))
  );
}

// Database version migrations
export function setupMigrations(): void {
  // Future migrations will be added here
  // Example:
  // db.version(2).stores({
  //   routes: 'id, name, createdAt, updatedAt, archived',
  // }).upgrade(tx => {
  //   return tx.table('routes').toCollection().modify(route => {
  //     route.archived = false;
  //   });
  // });
}
