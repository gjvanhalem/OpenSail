import { SettingsService, AppSettings, UnitSystem, ChartRotation } from '../types';
import { getDatabase } from '../database';

const DEFAULT_SETTINGS: AppSettings = {
  // Display settings
  units: 'nautical',
  chartRotation: ChartRotation.NorthUp,
  defaultZoom: 12,
  theme: 'light',
  showNavigationAids: true,
  showDepthContours: true,
  
  // Alert settings
  anchorWatchRadius: 50,
  enableAnchorAlarm: true,
  enableCollisionAlarm: true,
  collisionWarningDistance: 2, // nautical miles
  enableShallowWaterAlarm: true,
  shallowWaterDepth: 5, // meters
  enableWeatherAlerts: true,
  
  // Connection settings
  autoSync: true,
  instrumentProtocol: 'stub',
  instrumentConnectionType: 'network',
  serialPort: '/dev/ttyUSB0',
  networkHost: 'localhost',
  networkPort: 10110,
  baudRate: 4800,
  autoReconnect: true
};

export class SettingsServiceImpl implements SettingsService {
  private settings: AppSettings | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const db = await getDatabase();

      // Load all settings from database
      const rows = await db.all<{ key: string; value: string }>(
        'SELECT key, value FROM settings'
      );

      if (rows.length === 0) {
        // No settings in database, use defaults
        await this.resetToDefaults();
      } else {
        // Parse settings from database
        this.settings = { ...DEFAULT_SETTINGS };
        for (const row of rows) {
          const key = row.key as keyof AppSettings;
          try {
            (this.settings as any)[key] = JSON.parse(row.value);
          } catch {
            // If parsing fails, use the value as-is
            (this.settings as any)[key] = row.value;
          }
        }
      }

      this.initialized = true;
      console.log('Settings service initialized');
    } catch (error) {
      console.error('Failed to initialize settings:', error);
      // Fall back to defaults
      this.settings = { ...DEFAULT_SETTINGS };
      this.initialized = true;
    }
  }

  async getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.settings) {
      return DEFAULT_SETTINGS[key];
    }

    return this.settings[key];
  }

  async setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.settings) {
      this.settings = { ...DEFAULT_SETTINGS };
    }

    // Update in-memory settings
    this.settings[key] = value;

    // Persist to database
    try {
      const db = await getDatabase();
      const valueStr = JSON.stringify(value);
      const timestamp = Date.now();

      await db.run(
        `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
        [key, valueStr, timestamp]
      );

      console.log(`Setting updated: ${key} = ${valueStr}`);
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
      throw error;
    }
  }

  async getAllSettings(): Promise<AppSettings> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.settings || { ...DEFAULT_SETTINGS };
  }

  async resetToDefaults(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS };

    try {
      const db = await getDatabase();
      const timestamp = Date.now();

      // Clear existing settings
      await db.run('DELETE FROM settings');

      // Insert default settings
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        const valueStr = JSON.stringify(value);
        await db.run(
          `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
          [key, valueStr, timestamp]
        );
      }

      console.log('Settings reset to defaults');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  }

  // Convenience methods for common settings
  async getUnits(): Promise<UnitSystem> {
    return this.getSetting('units');
  }

  async setUnits(units: UnitSystem): Promise<void> {
    return this.setSetting('units', units);
  }

  async getChartRotation(): Promise<ChartRotation> {
    return this.getSetting('chartRotation');
  }

  async setChartRotation(rotation: ChartRotation): Promise<void> {
    return this.setSetting('chartRotation', rotation);
  }

  async getTheme(): Promise<'light' | 'dark'> {
    return this.getSetting('theme');
  }

  async setTheme(theme: 'light' | 'dark'): Promise<void> {
    return this.setSetting('theme', theme);
  }

  // Display settings
  async getDisplaySettings(): Promise<{
    units: UnitSystem;
    chartRotation: ChartRotation;
    defaultZoom: number;
    theme: 'light' | 'dark';
    showNavigationAids: boolean;
    showDepthContours: boolean;
  }> {
    const settings = await this.getAllSettings();
    return {
      units: settings.units,
      chartRotation: settings.chartRotation,
      defaultZoom: settings.defaultZoom,
      theme: settings.theme,
      showNavigationAids: settings.showNavigationAids,
      showDepthContours: settings.showDepthContours
    };
  }

  // Alert settings
  async getAlertSettings(): Promise<{
    anchorWatchRadius: number;
    enableAnchorAlarm: boolean;
    enableCollisionAlarm: boolean;
    collisionWarningDistance: number;
    enableShallowWaterAlarm: boolean;
    shallowWaterDepth: number;
    enableWeatherAlerts: boolean;
  }> {
    const settings = await this.getAllSettings();
    return {
      anchorWatchRadius: settings.anchorWatchRadius,
      enableAnchorAlarm: settings.enableAnchorAlarm,
      enableCollisionAlarm: settings.enableCollisionAlarm,
      collisionWarningDistance: settings.collisionWarningDistance,
      enableShallowWaterAlarm: settings.enableShallowWaterAlarm,
      shallowWaterDepth: settings.shallowWaterDepth,
      enableWeatherAlerts: settings.enableWeatherAlerts
    };
  }

  // Connection settings
  async getConnectionSettings(): Promise<{
    autoSync: boolean;
    instrumentProtocol: 'nmea0183' | 'nmea2000' | 'seatalk' | 'stub';
    instrumentConnectionType: 'serial' | 'network';
    serialPort: string;
    networkHost: string;
    networkPort: number;
    baudRate: number;
    autoReconnect: boolean;
  }> {
    const settings = await this.getAllSettings();
    return {
      autoSync: settings.autoSync,
      instrumentProtocol: settings.instrumentProtocol,
      instrumentConnectionType: settings.instrumentConnectionType,
      serialPort: settings.serialPort,
      networkHost: settings.networkHost,
      networkPort: settings.networkPort,
      baudRate: settings.baudRate,
      autoReconnect: settings.autoReconnect
    };
  }
}

export const createSettingsService = (): SettingsService => {
  return new SettingsServiceImpl();
};
