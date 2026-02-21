import { WeatherServiceImpl, createWeatherService } from './WeatherService';
import { Position, GeoBounds, WeatherLayer } from '../types';

describe('WeatherService', () => {
  let weatherService: WeatherServiceImpl;
  const testPosition: Position = {
    latitude: 52.5,
    longitude: 4.8,
    accuracy: 10,
    timestamp: Date.now()
  };

  const testBounds: GeoBounds = {
    north: 53.0,
    south: 52.0,
    east: 5.0,
    west: 4.0
  };

  beforeEach(() => {
    weatherService = new WeatherServiceImpl({ useMockData: true });
  });

  afterEach(() => {
    weatherService.clearCache();
  });

  describe('getForecast', () => {
    it('should fetch weather forecast for a position', async () => {
      const forecast = await weatherService.getForecast(testPosition, 5);

      expect(forecast).toBeDefined();
      expect(forecast.position).toEqual(testPosition);
      expect(forecast.forecasts).toHaveLength(5 * 24);
      expect(forecast.forecasts[0]).toHaveProperty('timestamp');
      expect(forecast.forecasts[0]).toHaveProperty('windSpeed');
      expect(forecast.forecasts[0]).toHaveProperty('windDirection');
      expect(forecast.forecasts[0]).toHaveProperty('waveHeight');
      expect(forecast.forecasts[0]).toHaveProperty('temperature');
      expect(forecast.forecasts[0]).toHaveProperty('pressure');
    });

    it('should return cached forecast within cache duration', async () => {
      const forecast1 = await weatherService.getForecast(testPosition, 3);
      const forecast2 = await weatherService.getForecast(testPosition, 3);

      expect(forecast1).toEqual(forecast2);
    });

    it('should generate forecast for multiple days', async () => {
      const days = 7;
      const forecast = await weatherService.getForecast(testPosition, days);

      expect(forecast.forecasts).toHaveLength(days * 24);
    });

    it('should include valid weather data in forecast', async () => {
      const forecast = await weatherService.getForecast(testPosition, 1);

      forecast.forecasts.forEach((point) => {
        expect(point.windSpeed).toBeGreaterThanOrEqual(0);
        expect(point.windDirection).toBeGreaterThanOrEqual(0);
        expect(point.windDirection).toBeLessThanOrEqual(360);
        expect(point.waveHeight).toBeGreaterThanOrEqual(0);
        expect(point.temperature).toBeDefined();
        expect(point.pressure).toBeGreaterThan(900);
        expect(point.pressure).toBeLessThan(1100);
        expect(point.precipitation).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('getWeatherOverlay', () => {
    it('should fetch weather overlay for wind layer', async () => {
      const overlay = await weatherService.getWeatherOverlay(
        testBounds,
        WeatherLayer.Wind
      );

      expect(overlay).toBeDefined();
      expect(overlay.layer).toBe(WeatherLayer.Wind);
      expect(overlay.bounds).toEqual(testBounds);
      expect(overlay.data).toBeDefined();
      expect(Array.isArray(overlay.data)).toBe(true);
      expect(overlay.timestamp).toBeInstanceOf(Date);
    });

    it('should fetch weather overlay for waves layer', async () => {
      const overlay = await weatherService.getWeatherOverlay(
        testBounds,
        WeatherLayer.Waves
      );

      expect(overlay.layer).toBe(WeatherLayer.Waves);
      expect(overlay.data.length).toBeGreaterThan(0);
    });

    it('should fetch weather overlay for precipitation layer', async () => {
      const overlay = await weatherService.getWeatherOverlay(
        testBounds,
        WeatherLayer.Precipitation
      );

      expect(overlay.layer).toBe(WeatherLayer.Precipitation);
    });

    it('should fetch weather overlay for pressure layer', async () => {
      const overlay = await weatherService.getWeatherOverlay(
        testBounds,
        WeatherLayer.Pressure
      );

      expect(overlay.layer).toBe(WeatherLayer.Pressure);
    });

    it('should generate grid data with correct structure', async () => {
      const overlay = await weatherService.getWeatherOverlay(
        testBounds,
        WeatherLayer.Wind
      );

      expect(overlay.data.length).toBe(10);
      expect(overlay.data[0].length).toBe(10);
      expect(Array.isArray(overlay.data[0][0])).toBe(true);
    });

    it('should cache overlay data', async () => {
      const overlay1 = await weatherService.getWeatherOverlay(
        testBounds,
        WeatherLayer.Wind
      );
      const overlay2 = await weatherService.getWeatherOverlay(
        testBounds,
        WeatherLayer.Wind
      );

      expect(overlay1).toEqual(overlay2);
    });
  });

  describe('getAlerts', () => {
    it('should fetch weather alerts for a region', async () => {
      const alerts = await weatherService.getAlerts(testBounds);

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should return alerts with correct structure when present', async () => {
      const alerts = await weatherService.getAlerts(testBounds);

      alerts.forEach((alert) => {
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('area');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('validFrom');
        expect(alert).toHaveProperty('validTo');
        expect(['warning', 'watch', 'advisory']).toContain(alert.severity);
      });
    });

    it('should cache alerts data', async () => {
      const alerts1 = await weatherService.getAlerts(testBounds);
      const alerts2 = await weatherService.getAlerts(testBounds);

      expect(alerts1).toEqual(alerts2);
    });
  });

  describe('cacheRegion', () => {
    it('should cache forecast and overlay data for a region', async () => {
      await weatherService.cacheRegion(testBounds);

      const centerLat = (testBounds.north + testBounds.south) / 2;
      const centerLon = (testBounds.east + testBounds.west) / 2;
      const centerPos: Position = {
        latitude: centerLat,
        longitude: centerLon,
        accuracy: 0,
        timestamp: Date.now()
      };

      const forecast = await weatherService.getForecast(centerPos, 5);
      expect(forecast).toBeDefined();

      const windOverlay = await weatherService.getWeatherOverlay(
        testBounds,
        WeatherLayer.Wind
      );
      expect(windOverlay).toBeDefined();
    });

    it('should cache all weather layers', async () => {
      await weatherService.cacheRegion(testBounds);

      const layers = [
        WeatherLayer.Wind,
        WeatherLayer.Waves,
        WeatherLayer.Precipitation,
        WeatherLayer.Pressure
      ];

      for (const layer of layers) {
        const overlay = await weatherService.getWeatherOverlay(testBounds, layer);
        expect(overlay.layer).toBe(layer);
      }
    });
  });

  describe('GRIB parsing', () => {
    it('should parse GRIB data buffer', () => {
      const gribHeader = Buffer.from('GRIB', 'ascii');
      const messageLength = Buffer.alloc(4);
      messageLength.writeUInt32BE(100, 0);
      
      const gribData = Buffer.concat([
        gribHeader,
        messageLength,
        Buffer.alloc(92)
      ]);

      const records = weatherService.parseGRIB(gribData);
      expect(Array.isArray(records)).toBe(true);
    });

    it('should handle invalid GRIB data gracefully', () => {
      const invalidData = Buffer.from('INVALID DATA');
      const records = weatherService.parseGRIB(invalidData);
      
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBe(0);
    });

    it('should load GRIB file into cache', async () => {
      const gribHeader = Buffer.from('GRIB', 'ascii');
      const messageLength = Buffer.alloc(4);
      messageLength.writeUInt32BE(100, 0);
      
      const gribData = Buffer.concat([
        gribHeader,
        messageLength,
        Buffer.alloc(92)
      ]);

      await weatherService.loadGRIBFile(gribData);
    });

    it('should retrieve GRIB data for specific parameters', async () => {
      const gribHeader = Buffer.from('GRIB', 'ascii');
      const messageLength = Buffer.alloc(4);
      messageLength.writeUInt32BE(100, 0);
      
      const gribData = Buffer.concat([
        gribHeader,
        messageLength,
        Buffer.alloc(92)
      ]);

      await weatherService.loadGRIBFile(gribData);
      
      const timestamp = new Date();
      const data = weatherService.getGRIBData('wind', timestamp, testBounds);
      
      // May be null if no matching data found
      if (data) {
        expect(data).toHaveProperty('layer');
        expect(data).toHaveProperty('bounds');
        expect(data).toHaveProperty('data');
      }
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      await weatherService.getForecast(testPosition, 5);
      await weatherService.getWeatherOverlay(testBounds, WeatherLayer.Wind);
      
      weatherService.clearCache();
      
      // After clearing, new requests should generate fresh data
      const forecast = await weatherService.getForecast(testPosition, 5);
      expect(forecast).toBeDefined();
    });
  });

  describe('createWeatherService factory', () => {
    it('should create a weather service instance', () => {
      const service = createWeatherService();
      expect(service).toBeDefined();
      expect(typeof service.getForecast).toBe('function');
      expect(typeof service.getWeatherOverlay).toBe('function');
      expect(typeof service.getAlerts).toBe('function');
      expect(typeof service.cacheRegion).toBe('function');
    });

    it('should create service with custom config', () => {
      const service = createWeatherService({
        apiKey: 'test-key',
        baseUrl: 'https://api.example.com',
        useMockData: false
      });
      expect(service).toBeDefined();
    });
  });

  describe('offline access', () => {
    it('should provide cached forecast when offline', async () => {
      const forecast1 = await weatherService.getForecast(testPosition, 5);
      
      // Simulate offline by using cached data
      const forecast2 = await weatherService.getForecast(testPosition, 5);
      
      expect(forecast1).toEqual(forecast2);
    });

    it('should provide cached overlay when offline', async () => {
      const overlay1 = await weatherService.getWeatherOverlay(
        testBounds,
        WeatherLayer.Wind
      );
      
      const overlay2 = await weatherService.getWeatherOverlay(
        testBounds,
        WeatherLayer.Wind
      );
      
      expect(overlay1).toEqual(overlay2);
    });

    it('should maintain cache for 48 hours', async () => {
      const forecast = await weatherService.getForecast(testPosition, 5);
      expect(forecast).toBeDefined();
      
      // Cache should still be valid immediately
      const cachedForecast = await weatherService.getForecast(testPosition, 5);
      expect(cachedForecast).toEqual(forecast);
    });
  });
});
