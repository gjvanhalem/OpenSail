import { db, type Setting } from '../db';
import type { NavigationSourceChoice } from '@/store/slices/navigationSlice';

// Settings type definitions
export interface AppSettings {
  // Map preferences
  units: 'nautical' | 'metric' | 'imperial';
  chartRotation: 'north-up' | 'heading-up';
  defaultZoom: number;
  theme: 'light' | 'dark' | 'auto';
  showNavigationAids: boolean;
  showDepthContours: boolean;
  
  // Instrument preferences
  instrumentProtocol: 'nmea0183' | 'nmea2000' | 'seatalk';
  instrumentConnectionType: 'serial' | 'bluetooth' | 'network';
  serialPort: string;
  networkHost: string;
  networkPort: number;
  baudRate: number;
  autoReconnect: boolean;

  // Navigation data sources: GPS, instruments, or auto (instruments while they report)
  positionSource: NavigationSourceChoice;
  cogSogSource: NavigationSourceChoice;
  headingSource: NavigationSourceChoice;
  
  // Alarms
  anchorWatchRadius: number;
  enableAnchorAlarm: boolean;
  enableCollisionAlarm: boolean;
  collisionWarningDistance: number;
  enableShallowWaterAlarm: boolean;
  shallowWaterDepth: number;
  enableWeatherAlerts: boolean;
  
  // Offline mode
  offlineMode: boolean;
  autoSync: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  // Map preferences
  units: 'nautical',
  chartRotation: 'north-up',
  defaultZoom: 12,
  theme: 'light',
  showNavigationAids: true,
  showDepthContours: true,
  
  // Instrument preferences
  instrumentProtocol: 'nmea0183',
  instrumentConnectionType: 'serial',
  serialPort: '',
  networkHost: '',
  networkPort: 10110,
  baudRate: 4800,
  autoReconnect: true,

  // Navigation data sources
  positionSource: 'auto',
  cogSogSource: 'auto',
  headingSource: 'auto',
  
  // Alarms
  anchorWatchRadius: 50,
  enableAnchorAlarm: false,
  enableCollisionAlarm: true,
  collisionWarningDistance: 2,
  enableShallowWaterAlarm: true,
  shallowWaterDepth: 5,
  enableWeatherAlerts: true,
  
  // Offline mode
  offlineMode: false,
  autoSync: false,
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
    const count = await db.settings.count();
    if (count === 0) {
      await this.setMany(DEFAULT_SETTINGS);
    }
  }
}

export const settingsRepository = new SettingsRepository();
