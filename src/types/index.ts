export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  altitude?: number;
}

export enum ChartRotation {
  NorthUp = 'north-up',
  HeadingUp = 'heading-up'
}

export interface ChartLayer {
  id: string;
  type: 'vector' | 'raster' | 'weather' | 'tide';
  visible: boolean;
  opacity: number;
  source: string;
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

export interface RouteWarning {
  type: 'shallow_water' | 'hazard' | 'restricted_area';
  position: Position;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RouteValidation {
  isValid: boolean;
  warnings: RouteWarning[];
}

export enum InstrumentDataType {
  GPS = 'gps',
  Depth = 'depth',
  Wind = 'wind',
  Speed = 'speed',
  Heading = 'heading',
  Temperature = 'temperature',
  AIS = 'ais'
}

export interface InstrumentData {
  type: InstrumentDataType;
  value: unknown;
  unit: string;
  timestamp: number;
  source: string;
}

export interface SerialConnection {
  type: 'serial';
  port: string;
}

export interface NetworkConnection {
  type: 'network';
  host: string;
  port: number;
}

export type ConnectionConfig = SerialConnection | NetworkConnection;

export interface InstrumentConfig {
  protocol: 'nmea0183' | 'nmea2000' | 'seatalk';
  connection: ConnectionConfig;
  baudRate?: number;
  useStub?: boolean;
}

export type DataCallback = (data: InstrumentData) => void;

export interface Subscription {
  unsubscribe(): void;
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
  data: Buffer;
  timestamp: number;
}

export interface SeaTalkMessage {
  command: number;
  data: Buffer;
  interpretation: Record<string, unknown>;
  timestamp: number;
}

export interface StubConfig {
  protocols: ('nmea0183' | 'nmea2000' | 'seatalk')[];
  updateRate: number;
  outputMode: 'serial' | 'network' | 'callback';
  connection?: ConnectionConfig;
}

export interface DepthProfile {
  values: number[];
  interval: number;
}

export interface WindProfile {
  speed: number;
  direction: number;
  variation: number;
}

export interface SpeedProfile {
  speed: number;
  variation: number;
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
  data: Buffer;
  format: 'vector' | 'raster';
  cached: boolean;
}

export interface ChartCoverage {
  id: string;
  name: string;
  bounds: GeoBounds;
  edition: string;
  issueDate: Date;
  scale: number;
  format: 'enc' | 'raster';
}

export interface ChartUpdate {
  id: string;
  chartId: string;
  version: string;
  releaseDate: Date;
  size: number;
  description: string;
}

export enum WeatherLayer {
  Wind = 'wind',
  Waves = 'waves',
  Precipitation = 'precipitation',
  Pressure = 'pressure'
}

export interface WeatherPoint {
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
  forecasts: WeatherPoint[];
}

export interface WeatherData {
  layer: WeatherLayer;
  bounds: GeoBounds;
  data: number[][][];
  timestamp: Date;
}

export interface WeatherAlert {
  id: string;
  type: string;
  severity: 'warning' | 'watch' | 'advisory';
  area: GeoBounds;
  message: string;
  validFrom: Date;
  validTo: Date;
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

export interface TrackFilter {
  startDate?: Date;
  endDate?: Date;
  minDistance?: number;
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

export interface LogbookFilter {
  startDate?: Date;
  endDate?: Date;
  voyageId?: string;
}

export enum ErrorCode {
  GPS_SIGNAL_LOST = 'GPS_SIGNAL_LOST',
  INSTRUMENT_DISCONNECTED = 'INSTRUMENT_DISCONNECTED',
  CHART_LOAD_FAILED = 'CHART_LOAD_FAILED',
  STORAGE_FULL = 'STORAGE_FULL',
  INVALID_ROUTE = 'INVALID_ROUTE',
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE'
}

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export class NavigationError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public severity: ErrorSeverity,
    public recoverable: boolean
  ) {
    super(message);
    this.name = 'NavigationError';
  }
}

export interface NavigationAid {
  id: string;
  type: 'buoy' | 'beacon' | 'lighthouse';
  position: Position;
  name: string;
  attributes: Record<string, unknown>;
}

export interface TideStation {
  id: string;
  name: string;
  position: Position;
  timezone: string;
}

export interface TidePrediction {
  stationId: string;
  timestamp: Date;
  height: number;
  type: 'high' | 'low';
}

export interface CurrentPrediction {
  stationId: string;
  timestamp: Date;
  direction: number;
  speed: number;
}

export type UnitSystem = 'metric' | 'imperial' | 'nautical';

export interface AppSettings {
  // Display settings
  units: UnitSystem;
  chartRotation: ChartRotation;
  defaultZoom: number;
  theme: 'light' | 'dark';
  showNavigationAids: boolean;
  showDepthContours: boolean;
  
  // Alert settings
  anchorWatchRadius: number;
  enableAnchorAlarm: boolean;
  enableCollisionAlarm: boolean;
  collisionWarningDistance: number; // nautical miles
  enableShallowWaterAlarm: boolean;
  shallowWaterDepth: number; // meters
  enableWeatherAlerts: boolean;
  
  // Connection settings
  autoSync: boolean;
  instrumentProtocol: 'nmea0183' | 'nmea2000' | 'seatalk' | 'stub';
  instrumentConnectionType: 'serial' | 'network';
  serialPort: string;
  networkHost: string;
  networkPort: number;
  baudRate: number;
  autoReconnect: boolean;
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

export interface RouteService {
  createRoute(waypoints: Waypoint[]): Promise<Route>;
  updateRoute(routeId: string, waypoints: Waypoint[]): Promise<Route>;
  deleteRoute(routeId: string): Promise<void>;
  calculateRoute(start: Position, end: Position): Promise<Route>;
  validateRoute(route: Route): Promise<RouteValidation>;
  getActiveRoute(): Promise<Route | null>;
  setActiveRoute(routeId: string): Promise<void>;
  exportRoute(routeId: string, format: 'gpx' | 'kml'): Promise<string>;
}

export interface TideService {
  initialize(): Promise<void>;
  getTideStation(stationId: string): Promise<TideStation | null>;
  getNearbyStation(position: Position): Promise<TideStation | null>;
  getTidePredictions(stationId: string, days: number): Promise<TidePrediction[]>;
  getCurrentPredictions(stationId: string, days: number): Promise<CurrentPrediction[]>;
  cacheTideData(stationId: string): Promise<void>;
}

export interface SafetyService {
  activateMOB(position: Position): MOBMarker;
  getMOBMarker(): MOBMarker | null;
  clearMOB(): void;
  calculateBearingToMOB(): number | null;
  calculateDistanceToMOB(): number | null;
  startAnchorWatch(radius: number, position: Position): AnchorWatch;
  stopAnchorWatch(): void;
  getAnchorWatch(): AnchorWatch | null;
  updateAnchorWatchRadius(radius: number): void;
  setCurrentPosition(position: Position): void;
}

export interface ErrorHandler {
  handle(error: NavigationError): void;
  subscribe(callback: (error: NavigationError) => void): { unsubscribe: () => void };
}

export interface ProtocolStub {
  start(config: StubConfig): void;
  stop(): void;
  setScenario(scenario: SimulationScenario): void;
  updateValue(dataType: InstrumentDataType, value: unknown): void;
}

export interface StubConfig {
  protocols: ('nmea0183' | 'nmea2000' | 'seatalk')[];
  updateRate: number;
  outputMode: 'serial' | 'network' | 'callback';
  connection?: ConnectionConfig;
}

export interface SimulationScenario {
  name: string;
  gpsTrack?: Position[];
  depth?: DepthProfile;
  wind?: WindProfile;
  speed?: SpeedProfile;
  aisTargets?: AISTarget[];
}

export interface DepthProfile {
  values: number[];
  interval: number;
}

export interface WindProfile {
  speed: number;
  direction: number;
  variation: number;
}

export interface SpeedProfile {
  speed: number;
  variation: number;
}

export interface InstrumentService {
  connect(config: InstrumentConfig): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(dataType: InstrumentDataType | null, callback: DataCallback): Subscription;
  getLatestData(dataType: InstrumentDataType): InstrumentData | null;
  setStubMode(enabled: boolean): void;
}

export interface ChartManager {
  loadChart(region: GeoBounds, zoomLevels: number[]): Promise<void>;
  getChartTile(x: number, y: number, z: number): Promise<ChartTile | null>;
  getCoverage(): Promise<ChartCoverage[]>;
  checkUpdates(): Promise<ChartUpdate[]>;
  downloadUpdate(updateId: string): Promise<void>;
  clearCache(region?: GeoBounds): Promise<void>;
}

export interface ChartTile {
  x: number;
  y: number;
  z: number;
  data: Buffer;
  format: 'vector' | 'raster';
  cached: boolean;
}

export interface ChartCoverage {
  id: string;
  name: string;
  bounds: GeoBounds;
  edition: string;
  issueDate: Date;
  scale: number;
  format: 'enc' | 'raster';
}

export interface ChartUpdate {
  id: string;
  chartId: string;
  version: string;
  releaseDate: Date;
  size: number;
  description: string;
}

export interface TrackService {
  startRecording(name: string): Promise<string>;
  stopRecording(): Promise<void>;
  getTrack(trackId: string): Promise<Track | null>;
  getTracks(filter?: TrackFilter): Promise<Track[]>;
  exportTrack(trackId: string, format: 'gpx' | 'kml'): Promise<string>;
  convertToRoute(trackId: string): Promise<Route>;
  deleteTrack(trackId: string): Promise<void>;
}

export interface LogbookService {
  startVoyage(): Promise<string>;
  endVoyage(): Promise<void>;
  addEntry(entry: Omit<LogbookEntry, 'id' | 'voyageId' | 'timestamp'>): Promise<void>;
  getEntries(filter?: LogbookFilter): Promise<LogbookEntry[]>;
  exportLogbook(format: 'csv' | 'pdf'): Promise<string>;
  setCurrentPosition(position: Position): void;
  updateSpeed(speed: number): void;
  addWaypointEntry(waypointName: string): Promise<void>;
  addNoteEntry(note: string): Promise<void>;
  addEventEntry(event: string): Promise<void>;
  getCurrentVoyage(): Promise<Voyage | null>;
  getVoyages(filter?: { startDate?: Date; endDate?: Date }): Promise<Voyage[]>;
  isVoyageInProgress(): boolean;
}

export interface AISService {
  processMessage(message: InstrumentData | unknown): void;
  getTargets(bounds?: GeoBounds): Promise<AISTarget[]>;
  getTarget(mmsi: string): Promise<AISTarget | null>;
  subscribe(callback: (target: AISTarget) => void): Subscription;
}

export interface SettingsService {
  initialize(): Promise<void>;
  getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]>;
  setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
  getAllSettings(): Promise<AppSettings>;
  resetToDefaults(): Promise<void>;
  
  // Convenience methods
  getUnits(): Promise<UnitSystem>;
  setUnits(units: UnitSystem): Promise<void>;
  getChartRotation(): Promise<ChartRotation>;
  setChartRotation(rotation: ChartRotation): Promise<void>;
  getTheme(): Promise<'light' | 'dark'>;
  setTheme(theme: 'light' | 'dark'): Promise<void>;
  
  // Category getters
  getDisplaySettings(): Promise<{
    units: UnitSystem;
    chartRotation: ChartRotation;
    defaultZoom: number;
    theme: 'light' | 'dark';
    showNavigationAids: boolean;
    showDepthContours: boolean;
  }>;
  
  getAlertSettings(): Promise<{
    anchorWatchRadius: number;
    enableAnchorAlarm: boolean;
    enableCollisionAlarm: boolean;
    collisionWarningDistance: number;
    enableShallowWaterAlarm: boolean;
    shallowWaterDepth: number;
    enableWeatherAlerts: boolean;
  }>;
  
  getConnectionSettings(): Promise<{
    autoSync: boolean;
    instrumentProtocol: 'nmea0183' | 'nmea2000' | 'seatalk' | 'stub';
    instrumentConnectionType: 'serial' | 'network';
    serialPort: string;
    networkHost: string;
    networkPort: number;
    baudRate: number;
    autoReconnect: boolean;
  }>;
}

export interface WeatherService {
  getForecast(position: Position, days: number): Promise<WeatherForecast>;
  getWeatherOverlay(bounds: GeoBounds, layer: WeatherLayer): Promise<WeatherData>;
  getAlerts(bounds: GeoBounds): Promise<WeatherAlert[]>;
  cacheRegion(bounds: GeoBounds): Promise<void>;
}
