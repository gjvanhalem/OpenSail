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

export interface ChartTile {
  key: string; // Composite key: `${z}-${x}-${y}`
  z: number;
  x: number;
  y: number;
  data: Blob;
  format: 'vector' | 'raster';
  timestamp: Date;
  region?: string; // Optional region identifier for bulk operations
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
  settings!: Table<Setting, string>;

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
