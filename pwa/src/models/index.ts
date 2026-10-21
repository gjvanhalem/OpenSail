// Core navigation data models for PWA

export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  altitude?: number;
}

export interface Waypoint {
  id: string;
  position: Position;
  name: string;
  description?: string;
  arrivalRadius: number;
}

export interface Route {
  id: string;
  name: string;
  waypoints: Waypoint[];
  totalDistance: number;
  estimatedDuration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackPoint {
  position: Position;
  speed: number;
  heading: number;
  timestamp: Date;
}

export interface Track {
  id: string;
  name: string;
  points: TrackPoint[];
  startTime: Date;
  endTime: Date;
  distance: number;
  maxSpeed: number;
  avgSpeed: number;
}

export interface AISTarget {
  mmsi: string;
  name: string;
  callSign: string;
  position: Position;
  course: number;
  speed: number;
  heading: number;
  vesselType: number;
  length: number;
  width: number;
  lastUpdate: Date;
  history: Position[];
  cpa?: CPAInfo;
}

export interface CPAInfo {
  distance: number;
  time: number;
  position: Position;
}

export interface LogbookEntry {
  id: string;
  voyageId: string;
  timestamp: Date;
  position: Position | null;
  type: 'voyage_start' | 'voyage_end' | 'waypoint' | 'note' | 'event';
  distance?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  notes?: string;
}

export interface Voyage {
  id: string;
  startTime: Date;
  endTime?: Date;
  startPosition?: Position;
  endPosition?: Position;
  distance?: number;
  avgSpeed?: number;
  maxSpeed?: number;
}

export interface WeatherData {
  timestamp: Date;
  windSpeed: number;
  windDirection: number;
  waveHeight: number;
  wavePeriod: number;
  temperature: number;
  pressure: number;
  precipitation: number;
}

export interface WeatherForecast {
  position: Position;
  forecasts: WeatherData[];
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ChartTile {
  x: number;
  y: number;
  z: number;
  data: Blob; // Changed from Buffer to Blob for browser compatibility
  format: 'vector' | 'raster';
  cached: boolean;
}

export interface RouteWarning {
  type: 'shallow_water' | 'hazard' | 'restricted_area' | 'no_depth_data';
  position: Position;
  message: string;
  severity: 'low' | 'medium' | 'high';
  /** From survey or model data, not an official chart (R2.5: coastal depths are advisory) */
  advisory?: boolean;
  /** Leg the warning is on: 0 is the leg from waypoint 1 to waypoint 2 */
  legIndex?: number;
  /** Chart region the warning comes from */
  source?: string;
}

export interface RouteValidation {
  isValid: boolean;
  warnings: RouteWarning[];
}

export interface MOBMarker {
  id: string;
  position: Position;
  timestamp: Date;
  active: boolean;
}

export interface AnchorWatch {
  id: string;
  centerPosition: Position;
  radius: number;
  active: boolean;
  alarmTriggered: boolean;
}

export const InstrumentDataType = {
  GPS: 'gps',
  Depth: 'depth',
  Wind: 'wind',
  Speed: 'speed',
  Heading: 'heading',
  Temperature: 'temperature',
  AIS: 'ais',
  /** Rudder angle, degrees, starboard positive */
  Rudder: 'rudder',
  /** Heel (roll, starboard down positive) and pitch (bow up positive), degrees */
  Attitude: 'attitude'
} as const;

export type InstrumentDataType = typeof InstrumentDataType[keyof typeof InstrumentDataType];

export interface InstrumentData {
  type: InstrumentDataType;
  value: unknown;
  unit: string;
  timestamp: number;
  source: string;
}

export interface NMEA0183Message {
  sentenceId: string;
  fields: string[];
  checksum: string;
  raw: string;
}

export interface NMEA2000Message {
  pgn: number;
  priority: number;
  source: number;
  destination: number;
  data: Uint8Array; // Changed from Buffer to Uint8Array for browser compatibility
  timestamp: number;
}

export interface SeaTalkMessage {
  command: number;
  /** The datagram after the command byte: attribute byte and data */
  data: Uint8Array;
  timestamp: number;
}

export const ChartRotation = {
  NorthUp: 'north-up',
  HeadingUp: 'heading-up'
} as const;

export type ChartRotation = typeof ChartRotation[keyof typeof ChartRotation];

export type UnitSystem = 'metric' | 'imperial' | 'nautical';

export const ErrorCode = {
  GPS_SIGNAL_LOST: 'GPS_SIGNAL_LOST',
  INSTRUMENT_DISCONNECTED: 'INSTRUMENT_DISCONNECTED',
  CHART_LOAD_FAILED: 'CHART_LOAD_FAILED',
  STORAGE_FULL: 'STORAGE_FULL',
  INVALID_ROUTE: 'INVALID_ROUTE',
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE'
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

export const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const;

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity];

export class NavigationError extends Error {
  public code: ErrorCode;
  public severity: ErrorSeverity;
  public recoverable: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    severity: ErrorSeverity,
    recoverable: boolean
  ) {
    super(message);
    this.name = 'NavigationError';
    this.code = code;
    this.severity = severity;
    this.recoverable = recoverable;
  }
}

export interface TrackFilter {
  startDate?: Date;
  endDate?: Date;
  minDistance?: number;
}

export interface LogbookFilter {
  startDate?: Date;
  endDate?: Date;
  voyageId?: string;
}
