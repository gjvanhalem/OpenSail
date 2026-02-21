import { SettingsServiceImpl, createSettingsService } from './SettingsService';
import { getDatabase } from '../database';
import { ChartRotation, UnitSystem } from '../types';

// Mock the database
jest.mock('../database');

describe('SettingsService', () => {
  let service: SettingsServiceImpl;
  let mockDb: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock database
    mockDb = {
      all: jest.fn(),
      run: jest.fn(),
      get: jest.fn()
    };

    (getDatabase as jest.Mock).mockResolvedValue(mockDb);

    // Create service instance
    service = new SettingsServiceImpl();
  });

  describe('initialize', () => {
    it('should initialize with default settings when database is empty', async () => {
      mockDb.all.mockResolvedValue([]);

      await service.initialize();

      const settings = await service.getAllSettings();
      expect(settings.units).toBe('nautical');
      expect(settings.chartRotation).toBe(ChartRotation.NorthUp);
      expect(settings.defaultZoom).toBe(12);
      expect(settings.theme).toBe('light');
      expect(settings.autoSync).toBe(true);
    });

    it('should load existing settings from database', async () => {
      mockDb.all.mockResolvedValue([
        { key: 'units', value: '"metric"' },
        { key: 'chartRotation', value: '"heading-up"' },
        { key: 'theme', value: '"dark"' }
      ]);

      await service.initialize();

      const units = await service.getSetting('units');
      const rotation = await service.getSetting('chartRotation');
      const theme = await service.getSetting('theme');

      expect(units).toBe('metric');
      expect(rotation).toBe(ChartRotation.HeadingUp);
      expect(theme).toBe('dark');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.all.mockRejectedValue(new Error('Database error'));

      await service.initialize();

      // Should fall back to defaults
      const settings = await service.getAllSettings();
      expect(settings.units).toBe('nautical');
    });

    it('should only initialize once', async () => {
      mockDb.all.mockResolvedValue([]);

      await service.initialize();
      await service.initialize();

      // Should only call database once
      expect(mockDb.all).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSetting', () => {
    beforeEach(async () => {
      mockDb.all.mockResolvedValue([]);
      await service.initialize();
    });

    it('should return setting value', async () => {
      const units = await service.getSetting('units');
      expect(units).toBe('nautical');
    });

    it('should return default value for unset settings', async () => {
      const zoom = await service.getSetting('defaultZoom');
      expect(zoom).toBe(12);
    });

    it('should initialize if not already initialized', async () => {
      const newService = new SettingsServiceImpl();
      mockDb.all.mockResolvedValue([]);

      const units = await newService.getSetting('units');
      expect(units).toBe('nautical');
      expect(mockDb.all).toHaveBeenCalled();
    });
  });

  describe('setSetting', () => {
    beforeEach(async () => {
      mockDb.all.mockResolvedValue([]);
      await service.initialize();
    });

    it('should update setting in memory and database', async () => {
      mockDb.run.mockResolvedValue({});

      await service.setSetting('units', 'metric');

      const units = await service.getSetting('units');
      expect(units).toBe('metric');
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE'),
        expect.arrayContaining(['units', '"metric"', expect.any(Number)])
      );
    });

    it('should handle complex setting values', async () => {
      mockDb.run.mockResolvedValue({});

      await service.setSetting('anchorWatchRadius', 100);

      const radius = await service.getSetting('anchorWatchRadius');
      expect(radius).toBe(100);
    });

    it('should throw error if database write fails', async () => {
      mockDb.run.mockRejectedValue(new Error('Write failed'));

      await expect(service.setSetting('units', 'metric')).rejects.toThrow('Write failed');
    });
  });

  describe('getAllSettings', () => {
    it('should return all settings', async () => {
      mockDb.all.mockResolvedValue([]);
      await service.initialize();

      const settings = await service.getAllSettings();

      expect(settings).toHaveProperty('units');
      expect(settings).toHaveProperty('chartRotation');
      expect(settings).toHaveProperty('defaultZoom');
      expect(settings).toHaveProperty('theme');
      expect(settings).toHaveProperty('autoSync');
      expect(settings).toHaveProperty('anchorWatchRadius');
      expect(settings).toHaveProperty('enableAnchorAlarm');
      expect(settings).toHaveProperty('instrumentProtocol');
    });
  });

  describe('resetToDefaults', () => {
    beforeEach(async () => {
      mockDb.all.mockResolvedValue([]);
      await service.initialize();
    });

    it('should reset all settings to defaults', async () => {
      mockDb.run.mockResolvedValue({});

      // Change some settings
      await service.setSetting('units', 'metric');
      await service.setSetting('theme', 'dark');

      // Reset to defaults
      await service.resetToDefaults();

      const settings = await service.getAllSettings();
      expect(settings.units).toBe('nautical');
      expect(settings.theme).toBe('light');
    });

    it('should clear database and insert defaults', async () => {
      mockDb.run.mockResolvedValue({});

      await service.resetToDefaults();

      // Should delete existing settings
      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM settings');

      // Should insert default settings
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO settings'),
        expect.any(Array)
      );
    });
  });

  describe('convenience methods', () => {
    beforeEach(async () => {
      mockDb.all.mockResolvedValue([]);
      await service.initialize();
    });

    it('should get and set units', async () => {
      mockDb.run.mockResolvedValue({});

      await service.setUnits('imperial');
      const units = await service.getUnits();

      expect(units).toBe('imperial');
    });

    it('should get and set chart rotation', async () => {
      mockDb.run.mockResolvedValue({});

      await service.setChartRotation(ChartRotation.HeadingUp);
      const rotation = await service.getChartRotation();

      expect(rotation).toBe(ChartRotation.HeadingUp);
    });

    it('should get and set theme', async () => {
      mockDb.run.mockResolvedValue({});

      await service.setTheme('dark');
      const theme = await service.getTheme();

      expect(theme).toBe('dark');
    });
  });

  describe('category getters', () => {
    beforeEach(async () => {
      mockDb.all.mockResolvedValue([]);
      await service.initialize();
    });

    it('should get display settings', async () => {
      const displaySettings = await service.getDisplaySettings();

      expect(displaySettings).toHaveProperty('units');
      expect(displaySettings).toHaveProperty('chartRotation');
      expect(displaySettings).toHaveProperty('defaultZoom');
      expect(displaySettings).toHaveProperty('theme');
      expect(displaySettings).toHaveProperty('showNavigationAids');
      expect(displaySettings).toHaveProperty('showDepthContours');
    });

    it('should get alert settings', async () => {
      const alertSettings = await service.getAlertSettings();

      expect(alertSettings).toHaveProperty('anchorWatchRadius');
      expect(alertSettings).toHaveProperty('enableAnchorAlarm');
      expect(alertSettings).toHaveProperty('enableCollisionAlarm');
      expect(alertSettings).toHaveProperty('collisionWarningDistance');
      expect(alertSettings).toHaveProperty('enableShallowWaterAlarm');
      expect(alertSettings).toHaveProperty('shallowWaterDepth');
      expect(alertSettings).toHaveProperty('enableWeatherAlerts');
    });

    it('should get connection settings', async () => {
      const connectionSettings = await service.getConnectionSettings();

      expect(connectionSettings).toHaveProperty('autoSync');
      expect(connectionSettings).toHaveProperty('instrumentProtocol');
      expect(connectionSettings).toHaveProperty('instrumentConnectionType');
      expect(connectionSettings).toHaveProperty('serialPort');
      expect(connectionSettings).toHaveProperty('networkHost');
      expect(connectionSettings).toHaveProperty('networkPort');
      expect(connectionSettings).toHaveProperty('baudRate');
      expect(connectionSettings).toHaveProperty('autoReconnect');
    });
  });

  describe('createSettingsService', () => {
    it('should create a new settings service instance', () => {
      const service = createSettingsService();
      expect(service).toBeDefined();
      expect(service.initialize).toBeDefined();
      expect(service.getSetting).toBeDefined();
      expect(service.setSetting).toBeDefined();
    });
  });
});
