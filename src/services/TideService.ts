import { TideService, TideStation, TidePrediction, CurrentPrediction, Position } from '../types';

interface CachedTideData {
  predictions: TidePrediction[];
  timestamp: number;
}

export class TideServiceImpl implements TideService {
  private tideStations = new Map<string, TideStation>();
  private cache = new Map<string, CachedTideData>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;

  async initialize(): Promise<void> {
    this.tideStations.set('NL-HVN', {
      id: 'NL-HVN',
      name: 'Hoorn',
      position: {
        latitude: 52.6425,
        longitude: 5.0594,
        accuracy: 0,
        timestamp: 0
      },
      timezone: 'Europe/Amsterdam'
    });

    this.tideStations.set('NL-RTM', {
      id: 'NL-RTM',
      name: 'Rotterdam',
      position: {
        latitude: 51.9036,
        longitude: 4.4994,
        accuracy: 0,
        timestamp: 0
      },
      timezone: 'Europe/Amsterdam'
    });

    this.tideStations.set('NL-DENH', {
      id: 'NL-DENH',
      name: 'Den Helder',
      position: {
        latitude: 52.9569,
        longitude: 4.7472,
        accuracy: 0,
        timestamp: 0
      },
      timezone: 'Europe/Amsterdam'
    });
  }

  async getTideStation(stationId: string): Promise<TideStation | null> {
    return this.tideStations.get(stationId) || null;
  }

  async getNearbyStation(position: Position): Promise<TideStation | null> {
    let nearest: TideStation | null = null;
    let minDistance = Infinity;

    for (const station of this.tideStations.values()) {
      const distance = this.calculateDistance(position, station.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = station;
      }
    }

    return nearest;
  }

  async getTidePredictions(stationId: string, days: number): Promise<TidePrediction[]> {
    const cacheKey = `${stationId}-${days}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.predictions;
    }

    const station = this.tideStations.get(stationId);
    if (!station) return [];

    const predictions = this.generatePredictions(stationId, days);

    this.cache.set(cacheKey, {
      predictions,
      timestamp: Date.now()
    });

    return predictions;
  }

  async getCurrentPredictions(stationId: string, days: number): Promise<CurrentPrediction[]> {
    return this.generateCurrentPredictions(stationId, days);
  }

  async cacheTideData(stationId: string): Promise<void> {
    await this.getTidePredictions(stationId, 7);
  }

  private generatePredictions(stationId: string, days: number): TidePrediction[] {
    const predictions: TidePrediction[] = [];
    const now = new Date();
    const cycleHours = 12.42;

    for (let day = 0; day < days; day++) {
      for (let tide = 0; tide < 4; tide++) {
        const hours = day * 24 + (tide * cycleHours) / 2;
        const timestamp = new Date(now.getTime() + hours * 60 * 60 * 1000);

        const phase = (hours % cycleHours) / cycleHours;
        const height = 1.5 + Math.sin(phase * Math.PI * 2) * 1.0;

        predictions.push({
          stationId,
          timestamp,
          height: Math.round(height * 10) / 10,
          type: height > 1.5 ? 'high' : 'low'
        });
      }
    }

    return predictions;
  }

  private generateCurrentPredictions(stationId: string, days: number): CurrentPrediction[] {
    const predictions: CurrentPrediction[] = [];
    const now = new Date();

    for (let day = 0; day < days; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(
          now.getTime() + day * 24 * 60 * 60 * 1000 + hour * 60 * 60 * 1000
        );

        const phase = (hour % 12) / 12;
        const direction = Math.sin(phase * Math.PI * 2) * 180;
        const speed = 0.5 + Math.abs(Math.cos(phase * Math.PI * 2)) * 1.5;

        predictions.push({
          stationId,
          timestamp,
          direction: Math.round(direction),
          speed: Math.round(speed * 10) / 10
        });
      }
    }

    return predictions;
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    const R = 3440.065;
    const dLat = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
    const dLon = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;
    const lat1 = (pos1.latitude * Math.PI) / 180;
    const lat2 = (pos2.latitude * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const createTideService = (): TideService => {
  return new TideServiceImpl();
};
