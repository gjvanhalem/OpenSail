import {
  WeatherService,
  WeatherForecast,
  WeatherData,
  Position,
  WeatherAlert,
  GeoBounds,
  WeatherLayer,
  WeatherPoint
} from '../types';

interface CachedWeather {
  forecast?: WeatherForecast;
  overlay?: WeatherData;
  alerts?: WeatherAlert[];
  timestamp: number;
}

interface GRIBRecord {
  parameter: string;
  level: string;
  timestamp: Date;
  data: number[][];
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  latStep: number;
  lonStep: number;
}

interface WeatherAPIConfig {
  apiKey?: string;
  baseUrl?: string;
  useMockData?: boolean;
}

export class WeatherServiceImpl implements WeatherService {
  private cache = new Map<string, CachedWeather>();
  private readonly CACHE_DURATION = 48 * 60 * 60 * 1000;
  private config: WeatherAPIConfig;
  private gribCache = new Map<string, GRIBRecord[]>();

  constructor(config: WeatherAPIConfig = {}) {
    this.config = {
      useMockData: true,
      ...config
    };
  }

  async getForecast(position: Position, days: number): Promise<WeatherForecast> {
    const cacheKey = `forecast_${position.latitude.toFixed(2)},${position.longitude.toFixed(2)}_${days}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.forecast && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.forecast;
    }

    let forecast: WeatherForecast;

    if (this.config.useMockData || !this.config.apiKey) {
      forecast = this.generateMockForecast(position, days);
    } else {
      forecast = await this.fetchForecastFromAPI(position, days);
    }

    this.cache.set(cacheKey, {
      ...this.cache.get(cacheKey),
      forecast,
      timestamp: Date.now()
    });

    return forecast;
  }

  async getWeatherOverlay(bounds: GeoBounds, layer: WeatherLayer): Promise<WeatherData> {
    const cacheKey = `overlay_${bounds.north}_${bounds.south}_${bounds.east}_${bounds.west}_${layer}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.overlay && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.overlay;
    }

    let overlay: WeatherData;

    if (this.config.useMockData || !this.config.apiKey) {
      overlay = {
        layer,
        bounds,
        data: this.generateWeatherGrid(bounds, layer),
        timestamp: new Date()
      };
    } else {
      overlay = await this.fetchOverlayFromAPI(bounds, layer);
    }

    this.cache.set(cacheKey, {
      ...this.cache.get(cacheKey),
      overlay,
      timestamp: Date.now()
    });

    return overlay;
  }

  async getAlerts(bounds: GeoBounds): Promise<WeatherAlert[]> {
    const cacheKey = `alerts_${bounds.north}_${bounds.south}_${bounds.east}_${bounds.west}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.alerts && Date.now() - cached.timestamp < 15 * 60 * 1000) {
      return cached.alerts;
    }

    let alerts: WeatherAlert[];

    if (this.config.useMockData || !this.config.apiKey) {
      alerts = this.generateMockAlerts(bounds);
    } else {
      alerts = await this.fetchAlertsFromAPI(bounds);
    }

    this.cache.set(cacheKey, {
      ...this.cache.get(cacheKey),
      alerts,
      timestamp: Date.now()
    });

    return alerts;
  }

  async cacheRegion(bounds: GeoBounds): Promise<void> {
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLon = (bounds.east + bounds.west) / 2;

    await this.getForecast(
      { latitude: centerLat, longitude: centerLon, accuracy: 0, timestamp: Date.now() },
      5
    );

    await Promise.all([
      this.getWeatherOverlay(bounds, WeatherLayer.Wind),
      this.getWeatherOverlay(bounds, WeatherLayer.Waves),
      this.getWeatherOverlay(bounds, WeatherLayer.Precipitation),
      this.getWeatherOverlay(bounds, WeatherLayer.Pressure)
    ]);

    await this.getAlerts(bounds);
  }

  parseGRIB(gribData: Buffer): GRIBRecord[] {
    const records: GRIBRecord[] = [];
    
    try {
      let offset = 0;
      
      while (offset < gribData.length) {
        if (gribData.length - offset < 8) break;
        
        const gribMagic = gribData.toString('ascii', offset, offset + 4);
        if (gribMagic !== 'GRIB') {
          offset++;
          continue;
        }

        const messageLength = gribData.readUInt32BE(offset + 4);
        if (offset + messageLength > gribData.length) break;

        const record = this.parseGRIBMessage(gribData.slice(offset, offset + messageLength));
        if (record) {
          records.push(record);
        }

        offset += messageLength;
      }
    } catch (error) {
      console.error('GRIB parsing error:', error);
    }

    return records;
  }

  async loadGRIBFile(gribData: Buffer): Promise<void> {
    const records = this.parseGRIB(gribData);
    
    for (const record of records) {
      const key = `${record.parameter}_${record.level}_${record.timestamp.getTime()}`;
      const existing = this.gribCache.get(key) || [];
      existing.push(record);
      this.gribCache.set(key, existing);
    }
  }

  getGRIBData(parameter: string, timestamp: Date, bounds: GeoBounds): WeatherData | null {
    const key = `${parameter}_surface_${timestamp.getTime()}`;
    const records = this.gribCache.get(key);
    
    if (!records || records.length === 0) {
      return null;
    }

    const record = records[0];
    const data = this.interpolateGRIBData(record, bounds);

    let layer: WeatherLayer;
    switch (parameter.toLowerCase()) {
      case 'wind':
      case 'ugrd':
      case 'vgrd':
        layer = WeatherLayer.Wind;
        break;
      case 'waves':
      case 'htsgw':
        layer = WeatherLayer.Waves;
        break;
      case 'prate':
      case 'apcp':
        layer = WeatherLayer.Precipitation;
        break;
      case 'prmsl':
      case 'mslp':
        layer = WeatherLayer.Pressure;
        break;
      default:
        return null;
    }

    return {
      layer,
      bounds,
      data,
      timestamp: record.timestamp
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.gribCache.clear();
  }

  private async fetchForecastFromAPI(position: Position, days: number): Promise<WeatherForecast> {
    if (!this.config.apiKey || !this.config.baseUrl) {
      return this.generateMockForecast(position, days);
    }

    try {
      const url = `${this.config.baseUrl}/forecast?lat=${position.latitude}&lon=${position.longitude}&days=${days}&appid=${this.config.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseAPIForecast(data, position);
    } catch (error) {
      console.error('Failed to fetch weather forecast:', error);
      return this.generateMockForecast(position, days);
    }
  }

  private async fetchOverlayFromAPI(bounds: GeoBounds, layer: WeatherLayer): Promise<WeatherData> {
    if (!this.config.apiKey || !this.config.baseUrl) {
      return {
        layer,
        bounds,
        data: this.generateWeatherGrid(bounds, layer),
        timestamp: new Date()
      };
    }

    try {
      const url = `${this.config.baseUrl}/overlay?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}&layer=${layer}&appid=${this.config.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseAPIOverlay(data, bounds, layer);
    } catch (error) {
      console.error('Failed to fetch weather overlay:', error);
      return {
        layer,
        bounds,
        data: this.generateWeatherGrid(bounds, layer),
        timestamp: new Date()
      };
    }
  }

  private async fetchAlertsFromAPI(bounds: GeoBounds): Promise<WeatherAlert[]> {
    if (!this.config.apiKey || !this.config.baseUrl) {
      return this.generateMockAlerts(bounds);
    }

    try {
      const url = `${this.config.baseUrl}/alerts?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}&appid=${this.config.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseAPIAlerts(data);
    } catch (error) {
      console.error('Failed to fetch weather alerts:', error);
      return this.generateMockAlerts(bounds);
    }
  }

  private parseAPIForecast(data: any, position: Position): WeatherForecast {
    const forecasts: WeatherPoint[] = [];

    if (data.list && Array.isArray(data.list)) {
      for (const item of data.list) {
        forecasts.push({
          timestamp: new Date(item.dt * 1000),
          windSpeed: item.wind?.speed || 0,
          windDirection: item.wind?.deg || 0,
          waveHeight: item.waves?.height || 0,
          wavePeriod: item.waves?.period || 0,
          temperature: item.main?.temp || 0,
          pressure: item.main?.pressure || 1013,
          precipitation: item.rain?.['3h'] || item.snow?.['3h'] || 0
        });
      }
    }

    return { position, forecasts };
  }

  private parseAPIOverlay(data: any, bounds: GeoBounds, layer: WeatherLayer): WeatherData {
    if (data.grid && Array.isArray(data.grid)) {
      return {
        layer,
        bounds,
        data: data.grid,
        timestamp: new Date(data.timestamp)
      };
    }

    return {
      layer,
      bounds,
      data: this.generateWeatherGrid(bounds, layer),
      timestamp: new Date()
    };
  }

  private parseAPIAlerts(data: any): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];

    if (data.alerts && Array.isArray(data.alerts)) {
      for (const alert of data.alerts) {
        alerts.push({
          id: alert.id || `alert_${Date.now()}`,
          type: alert.event || 'Unknown',
          severity: this.mapSeverity(alert.severity),
          area: alert.area || { north: 0, south: 0, east: 0, west: 0 },
          message: alert.description || '',
          validFrom: new Date(alert.start * 1000),
          validTo: new Date(alert.end * 1000)
        });
      }
    }

    return alerts;
  }

  private mapSeverity(severity: string): 'warning' | 'watch' | 'advisory' {
    const s = severity?.toLowerCase() || '';
    if (s.includes('warning')) return 'warning';
    if (s.includes('watch')) return 'watch';
    return 'advisory';
  }

  private parseGRIBMessage(messageData: Buffer): GRIBRecord | null {
    try {
      const edition = messageData.readUInt8(7);
      
      if (edition !== 1 && edition !== 2) {
        return null;
      }

      const parameter = this.extractGRIBParameter(messageData);
      const level = this.extractGRIBLevel(messageData);
      const timestamp = this.extractGRIBTimestamp(messageData);
      const gridInfo = this.extractGRIBGrid(messageData);
      const data = this.extractGRIBData(messageData, gridInfo);

      return {
        parameter,
        level,
        timestamp,
        data,
        latMin: gridInfo.latMin,
        latMax: gridInfo.latMax,
        lonMin: gridInfo.lonMin,
        lonMax: gridInfo.lonMax,
        latStep: gridInfo.latStep,
        lonStep: gridInfo.lonStep
      };
    } catch (error) {
      console.error('GRIB message parsing error:', error);
      return null;
    }
  }

  private extractGRIBParameter(data: Buffer): string {
    const paramTable = data.readUInt8(8);
    const paramNumber = data.readUInt8(9);
    
    const paramMap: Record<number, string> = {
      2: 'UGRD',
      3: 'VGRD',
      11: 'TMP',
      33: 'UGRD',
      34: 'VGRD',
      1: 'PRES',
      7: 'HGT'
    };

    return paramMap[paramNumber] || `PARAM_${paramNumber}`;
  }

  private extractGRIBLevel(data: Buffer): string {
    const levelType = data.readUInt8(10);
    
    const levelMap: Record<number, string> = {
      1: 'surface',
      100: 'isobaric',
      102: 'mean_sea_level',
      103: 'height_above_ground'
    };

    return levelMap[levelType] || `level_${levelType}`;
  }

  private extractGRIBTimestamp(data: Buffer): Date {
    const year = data.readUInt8(12);
    const month = data.readUInt8(13);
    const day = data.readUInt8(14);
    const hour = data.readUInt8(15);
    const minute = data.readUInt8(16);

    const fullYear = year > 50 ? 1900 + year : 2000 + year;
    return new Date(fullYear, month - 1, day, hour, minute);
  }

  private extractGRIBGrid(data: Buffer): {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    latStep: number;
    lonStep: number;
    ni: number;
    nj: number;
  } {
    return {
      latMin: -90,
      latMax: 90,
      lonMin: -180,
      lonMax: 180,
      latStep: 1,
      lonStep: 1,
      ni: 360,
      nj: 180
    };
  }

  private extractGRIBData(data: Buffer, gridInfo: any): number[][] {
    const grid: number[][] = [];
    
    for (let j = 0; j < gridInfo.nj; j++) {
      grid[j] = [];
      for (let i = 0; i < gridInfo.ni; i++) {
        grid[j][i] = 0;
      }
    }

    return grid;
  }

  private interpolateGRIBData(record: GRIBRecord, bounds: GeoBounds): number[][][] {
    const latSteps = 10;
    const lonSteps = 10;
    const data: number[][][] = [];

    const latStep = (bounds.north - bounds.south) / latSteps;
    const lonStep = (bounds.east - bounds.west) / lonSteps;

    for (let lat = 0; lat < latSteps; lat++) {
      data[lat] = [];
      const currentLat = bounds.south + lat * latStep;
      
      for (let lon = 0; lon < lonSteps; lon++) {
        const currentLon = bounds.west + lon * lonStep;
        
        const value = this.bilinearInterpolation(
          record,
          currentLat,
          currentLon
        );
        
        data[lat][lon] = [value];
      }
    }

    return data;
  }

  private bilinearInterpolation(record: GRIBRecord, lat: number, lon: number): number {
    const latIndex = (lat - record.latMin) / record.latStep;
    const lonIndex = (lon - record.lonMin) / record.lonStep;

    const lat1 = Math.floor(latIndex);
    const lat2 = Math.ceil(latIndex);
    const lon1 = Math.floor(lonIndex);
    const lon2 = Math.ceil(lonIndex);

    if (lat1 < 0 || lat2 >= record.data.length || lon1 < 0 || lon2 >= record.data[0].length) {
      return 0;
    }

    const q11 = record.data[lat1][lon1];
    const q12 = record.data[lat1][lon2];
    const q21 = record.data[lat2][lon1];
    const q22 = record.data[lat2][lon2];

    const latFrac = latIndex - lat1;
    const lonFrac = lonIndex - lon1;

    const r1 = q11 * (1 - lonFrac) + q12 * lonFrac;
    const r2 = q21 * (1 - lonFrac) + q22 * lonFrac;

    return r1 * (1 - latFrac) + r2 * latFrac;
  }

  private generateMockForecast(position: Position, days: number): WeatherForecast {
    const forecasts = [];
    const now = Date.now();

    for (let i = 0; i < days * 24; i++) {
      const hour = new Date(now + i * 60 * 60 * 1000);
      const variation = Math.sin((hour.getHours() * Math.PI) / 12) * 5;

      forecasts.push({
        timestamp: hour,
        windSpeed: 15 + variation,
        windDirection: 180 + Math.random() * 30,
        waveHeight: 1 + Math.random() * 0.5,
        wavePeriod: 8 + Math.random() * 2,
        temperature: 15 + variation,
        pressure: 1013 + Math.random() * 10,
        precipitation: Math.random() > 0.7 ? Math.random() * 5 : 0
      });
    }

    return {
      position,
      forecasts
    };
  }

  private generateWeatherGrid(bounds: GeoBounds, layer: WeatherLayer): number[][][] {
    const latSteps = 10;
    const lonSteps = 10;
    const data: number[][][] = [];

    for (let lat = 0; lat < latSteps; lat++) {
      data[lat] = [];
      for (let lon = 0; lon < lonSteps; lon++) {
        data[lat][lon] = [];

        switch (layer) {
          case WeatherLayer.Wind:
            data[lat][lon] = [10 + Math.random() * 10, Math.random() * 360];
            break;
          case WeatherLayer.Waves:
            data[lat][lon] = [1 + Math.random() * 2];
            break;
          case WeatherLayer.Precipitation:
            data[lat][lon] = [Math.random() > 0.8 ? Math.random() * 10 : 0];
            break;
          case WeatherLayer.Pressure:
            data[lat][lon] = [1010 + Math.random() * 20];
            break;
        }
      }
    }

    return data;
  }

  private generateMockAlerts(bounds: GeoBounds): WeatherAlert[] {
    if (Math.random() > 0.7) {
      return [
        {
          id: `alert_${Date.now()}`,
          type: 'Small Craft Advisory',
          severity: 'advisory',
          area: bounds,
          message: 'Winds 15-25 knots and seas 4-7 feet expected',
          validFrom: new Date(),
          validTo: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      ];
    }
    return [];
  }
}

export const createWeatherService = (config?: WeatherAPIConfig): WeatherService => {
  return new WeatherServiceImpl(config);
};
