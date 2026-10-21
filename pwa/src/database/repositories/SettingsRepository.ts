import { db, type Setting } from '../db';
import type { NavigationSourceChoice } from '@/store/slices/navigationSlice';
import { DEFAULT_ALERT_THRESHOLDS, type AlertThresholds } from '@/store/slices/alertsSlice';
import { DEFAULT_PANEL_LAYOUT, type PanelLayout } from '@/components/instruments/panelLayout';
import { DEFAULT_SPEED_GAUGE_MAX } from '@/components/instruments/dial';
import { DEFAULT_ARRIVAL_RADIUS_NM } from '@/utils/routeGuidance';

export type GpsMode = 'off' | 'real' | 'simulator';

// Settings type definitions
export interface AppSettings {
  // Map preferences
  units: 'nautical' | 'metric' | 'imperial';
  chartRotation: 'north-up' | 'heading-up';
  defaultZoom: number;
  /** Chart layers (the Layers panel): OpenSeaMap seamarks, and the inland ENC charts */
  showNavigationAids: boolean;
  showDepthContours: boolean;

  // Navigation data sources: GPS, instruments, or auto (instruments while they report)
  positionSource: NavigationSourceChoice;
  cogSogSource: NavigationSourceChoice;
  headingSource: NavigationSourceChoice;

  /** Route navigation: advance to the next waypoint within this distance, nautical miles */
  arrivalRadius: number;

  /** Position source to start with the app: resumed after a reload so the boat never silently loses GPS */
  gpsMode: GpsMode;
  /** Simulator track to run when gpsMode is 'simulator' (track name) */
  gpsSimulatorTrack: string;

  /**
   * Magnetic variation, degrees, east positive. Turns a magnetic heading
   * (HDM, or HDG without variation) into a true heading when no instrument
   * sends the variation.
   */
  magneticVariation: number;
  /** Wi-Fi instruments: the WebSocket address of the gateway or the OpenSail bridge */
  instrumentWebSocketUrl: string;
  /** Wi-Fi instruments in the native apps: the TCP NMEA server, by default the Pcnautic / pypilot autopilot */
  instrumentTcpHost: string;
  instrumentTcpPort: number;
  
  // Alarms
  anchorWatchRadius: number;
  enableAnchorAlarm: boolean;
  enableCollisionAlarm: boolean;
  /** Min / max alerts per instrument value (depth in m, speeds in knots) */
  alertThresholds: AlertThresholds;

  /** Which instrument gauges show, in what order and size */
  instrumentPanelLayout: PanelLayout;
  /** Top of the speed gauge's scale, knots (one of SPEED_GAUGE_RANGES) */
  speedGaugeMax: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  // Map preferences
  units: 'nautical',
  chartRotation: 'north-up',
  defaultZoom: 12,
  showNavigationAids: true,
  showDepthContours: true,

  // Navigation data sources
  positionSource: 'auto',
  cogSogSource: 'auto',
  headingSource: 'auto',

  arrivalRadius: DEFAULT_ARRIVAL_RADIUS_NM,

  gpsMode: 'off',
  gpsSimulatorTrack: 'Harbor Navigation',
  magneticVariation: 0,
  instrumentWebSocketUrl: 'ws://localhost:10110',
  instrumentTcpHost: '192.168.14.1',
  instrumentTcpPort: 20220,
  
  // Alarms
  anchorWatchRadius: 50,
  enableAnchorAlarm: false,
  enableCollisionAlarm: true,
  alertThresholds: DEFAULT_ALERT_THRESHOLDS,
  instrumentPanelLayout: DEFAULT_PANEL_LAYOUT,
  speedGaugeMax: DEFAULT_SPEED_GAUGE_MAX,
};

export class SettingsRepository {
  // Get a single setting by key
  async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const setting = await db.settings.get(key);
    if (!setting) {
      return DEFAULT_SETTINGS[key];
    }
    return JSON.parse(setting.value) as AppSettings[K];
  }

  // Get all settings
  async getAll(): Promise<AppSettings> {
    const settings = await db.settings.toArray();
    const settingsMap: Partial<AppSettings> = {};
    
    settings.forEach((setting) => {
      settingsMap[setting.key as keyof AppSettings] = JSON.parse(setting.value);
    });
    
    // Merge with defaults to ensure all keys exist
    return { ...DEFAULT_SETTINGS, ...settingsMap };
  }

  // Set a single setting
  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    await db.settings.put({
      key,
      value: JSON.stringify(value),
    });
  }

  // Set multiple settings at once
  async setMany(settings: Partial<AppSettings>): Promise<void> {
    const settingsArray: Setting[] = Object.entries(settings).map(([key, value]) => ({
      key,
      value: JSON.stringify(value),
    }));
    
    await db.settings.bulkPut(settingsArray);
  }

  // Reset a setting to default
  async reset<K extends keyof AppSettings>(key: K): Promise<void> {
    await this.set(key, DEFAULT_SETTINGS[key]);
  }

  // Reset all settings to defaults
  async resetAll(): Promise<void> {
    await db.settings.clear();
    await this.setMany(DEFAULT_SETTINGS);
  }

  // Initialize settings with defaults if not present
  async initialize(): Promise<void> {
    // One transaction, so a setting saved in between can't be overwritten by the defaults
    await db.transaction('rw', db.settings, async () => {
      const count = await db.settings.count();
      if (count === 0) {
        await this.setMany(DEFAULT_SETTINGS);
      }
    });
  }
}

export const settingsRepository = new SettingsRepository();
