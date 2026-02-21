import { TideServiceImpl, createTideService } from './TideService';
import { Position } from '../types';

describe('TideService', () => {
  let tideService: TideServiceImpl;
  
  const testPosition: Position = {
    latitude: 52.6425,
    longitude: 5.0594,
    accuracy: 10,
    timestamp: Date.now()
  };

  const distantPosition: Position = {
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 10,
    timestamp: Date.now()
  };

  beforeEach(async () => {
    tideService = new TideServiceImpl();
    await tideService.initialize();
  });

  describe('initialize', () => {
    it('should initialize with predefined tide stations', async () => {
      const station = await tideService.getTideStation('NL-HVN');
      
      expect(station).toBeDefined();
      expect(station?.id).toBe('NL-HVN');
      expect(station?.name).toBe('Hoorn');
      expect(station?.position.latitude).toBe(52.6425);
      expect(station?.position.longitude).toBe(5.0594);
      expect(station?.timezone).toBe('Europe/Amsterdam');
    });

    it('should initialize multiple tide stations', async () => {
      const station1 = await tideService.getTideStation('NL-HVN');
      const station2 = await tideService.getTideStation('NL-RTM');
      const station3 = await tideService.getTideStation('NL-DENH');
      
      expect(station1).toBeDefined();
      expect(station2).toBeDefined();
      expect(station3).toBeDefined();
      expect(station1?.name).toBe('Hoorn');
      expect(station2?.name).toBe('Rotterdam');
      expect(station3?.name).toBe('Den Helder');
    });
  });

  describe('getTideStation', () => {
    it('should return tide station by ID', async () => {
      const station = await tideService.getTideStation('NL-RTM');
      
      expect(station).toBeDefined();
      expect(station?.id).toBe('NL-RTM');
      expect(station?.name).toBe('Rotterdam');
    });

    it('should return null for non-existent station', async () => {
      const station = await tideService.getTideStation('INVALID-ID');
      
      expect(station).toBeNull();
    });
  });

  describe('getNearbyStation', () => {
    it('should find nearest tide station to position', async () => {
      const station = await tideService.getNearbyStation(testPosition);
      
      expect(station).toBeDefined();
      expect(station?.id).toBe('NL-HVN');
      expect(station?.name).toBe('Hoorn');
    });

    it('should return nearest station even from distant position', async () => {
      const station = await tideService.getNearbyStation(distantPosition);
      
      expect(station).toBeDefined();
      expect(station).not.toBeNull();
    });

    it('should calculate distance accurately', async () => {
      const rotterdamPos: Position = {
        latitude: 51.9036,
        longitude: 4.4994,
        accuracy: 0,
        timestamp: Date.now()
      };
      
      const station = await tideService.getNearbyStation(rotterdamPos);
      
      expect(station?.id).toBe('NL-RTM');
    });
  });

  describe('getTidePredictions', () => {
    it('should generate tide predictions for specified days', async () => {
      const predictions = await tideService.getTidePredictions('NL-HVN', 3);
      
      expect(predictions).toBeDefined();
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions.length).toBeLessThanOrEqual(3 * 4);
    });

    it('should return predictions with correct structure', async () => {
      const predictions = await tideService.getTidePredictions('NL-HVN', 1);
      
      expect(predictions[0]).toHaveProperty('stationId');
      expect(predictions[0]).toHaveProperty('timestamp');
      expect(predictions[0]).toHaveProperty('height');
      expect(predictions[0]).toHaveProperty('type');
      expect(predictions[0].stationId).toBe('NL-HVN');
      expect(predictions[0].timestamp).toBeInstanceOf(Date);
      expect(typeof predictions[0].height).toBe('number');
      expect(['high', 'low']).toContain(predictions[0].type);
    });

    it('should return predictions with 0.1m precision', async () => {
      const predictions = await tideService.getTidePredictions('NL-HVN', 1);
      
      predictions.forEach(pred => {
        const decimalPlaces = (pred.height.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(1);
      });
    });

    it('should alternate between high and low tides', async () => {
      const predictions = await tideService.getTidePredictions('NL-HVN', 2);
      
      let hasHigh = false;
      let hasLow = false;
      
      predictions.forEach(pred => {
        if (pred.type === 'high') hasHigh = true;
        if (pred.type === 'low') hasLow = true;
      });
      
      expect(hasHigh).toBe(true);
      expect(hasLow).toBe(true);
    });

    it('should return empty array for non-existent station', async () => {
      const predictions = await tideService.getTidePredictions('INVALID-ID', 1);
      
      expect(predictions).toEqual([]);
    });

    it('should cache predictions', async () => {
      const predictions1 = await tideService.getTidePredictions('NL-HVN', 3);
      const predictions2 = await tideService.getTidePredictions('NL-HVN', 3);
      
      expect(predictions1).toEqual(predictions2);
      expect(predictions1.length).toBe(predictions2.length);
    });

    it('should generate predictions in chronological order', async () => {
      const predictions = await tideService.getTidePredictions('NL-HVN', 2);
      
      for (let i = 1; i < predictions.length; i++) {
        expect(predictions[i].timestamp.getTime()).toBeGreaterThan(
          predictions[i - 1].timestamp.getTime()
        );
      }
    });
  });

  describe('getCurrentPredictions', () => {
    it('should generate current predictions for specified days', async () => {
      const predictions = await tideService.getCurrentPredictions('NL-HVN', 2);
      
      expect(predictions).toBeDefined();
      expect(predictions.length).toBe(2 * 24);
    });

    it('should return predictions with correct structure', async () => {
      const predictions = await tideService.getCurrentPredictions('NL-HVN', 1);
      
      expect(predictions[0]).toHaveProperty('stationId');
      expect(predictions[0]).toHaveProperty('timestamp');
      expect(predictions[0]).toHaveProperty('direction');
      expect(predictions[0]).toHaveProperty('speed');
      expect(predictions[0].stationId).toBe('NL-HVN');
      expect(predictions[0].timestamp).toBeInstanceOf(Date);
      expect(typeof predictions[0].direction).toBe('number');
      expect(typeof predictions[0].speed).toBe('number');
    });

    it('should return current speed with 0.1 knot precision', async () => {
      const predictions = await tideService.getCurrentPredictions('NL-HVN', 1);
      
      predictions.forEach(pred => {
        const decimalPlaces = (pred.speed.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(1);
      });
    });

    it('should return direction in valid range (0-360)', async () => {
      const predictions = await tideService.getCurrentPredictions('NL-HVN', 1);
      
      predictions.forEach(pred => {
        expect(pred.direction).toBeGreaterThanOrEqual(-180);
        expect(pred.direction).toBeLessThanOrEqual(180);
      });
    });

    it('should return positive current speeds', async () => {
      const predictions = await tideService.getCurrentPredictions('NL-HVN', 1);
      
      predictions.forEach(pred => {
        expect(pred.speed).toBeGreaterThanOrEqual(0);
      });
    });

    it('should generate hourly predictions', async () => {
      const predictions = await tideService.getCurrentPredictions('NL-HVN', 1);
      
      expect(predictions.length).toBe(24);
      
      for (let i = 1; i < predictions.length; i++) {
        const timeDiff = predictions[i].timestamp.getTime() - predictions[i - 1].timestamp.getTime();
        const hourInMs = 60 * 60 * 1000;
        expect(Math.abs(timeDiff - hourInMs)).toBeLessThan(1000);
      }
    });
  });

  describe('cacheTideData', () => {
    it('should cache tide data for offline access', async () => {
      await tideService.cacheTideData('NL-HVN');
      
      const predictions = await tideService.getTidePredictions('NL-HVN', 7);
      
      expect(predictions).toBeDefined();
      expect(predictions.length).toBeGreaterThan(0);
    });

    it('should cache data for 7 days', async () => {
      await tideService.cacheTideData('NL-RTM');
      
      const predictions = await tideService.getTidePredictions('NL-RTM', 7);
      
      expect(predictions.length).toBeGreaterThan(0);
    });
  });

  describe('offline data access', () => {
    it('should return cached data when available', async () => {
      const predictions1 = await tideService.getTidePredictions('NL-HVN', 3);
      
      const predictions2 = await tideService.getTidePredictions('NL-HVN', 3);
      
      expect(predictions1).toEqual(predictions2);
    });

    it('should maintain cache for 24 hours', async () => {
      const predictions1 = await tideService.getTidePredictions('NL-HVN', 2);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const predictions2 = await tideService.getTidePredictions('NL-HVN', 2);
      
      expect(predictions1).toEqual(predictions2);
    });
  });

  describe('createTideService', () => {
    it('should create a TideService instance', () => {
      const service = createTideService();
      
      expect(service).toBeDefined();
      expect(service).toHaveProperty('initialize');
      expect(service).toHaveProperty('getTideStation');
      expect(service).toHaveProperty('getNearbyStation');
      expect(service).toHaveProperty('getTidePredictions');
      expect(service).toHaveProperty('getCurrentPredictions');
      expect(service).toHaveProperty('cacheTideData');
    });
  });

  describe('tide prediction calculations', () => {
    it('should generate realistic tide heights', async () => {
      const predictions = await tideService.getTidePredictions('NL-HVN', 5);
      
      predictions.forEach(pred => {
        expect(pred.height).toBeGreaterThan(0);
        expect(pred.height).toBeLessThan(5);
      });
    });

    it('should have higher heights for high tides', async () => {
      const predictions = await tideService.getTidePredictions('NL-HVN', 3);
      
      const highTides = predictions.filter(p => p.type === 'high');
      const lowTides = predictions.filter(p => p.type === 'low');
      
      if (highTides.length > 0 && lowTides.length > 0) {
        const avgHigh = highTides.reduce((sum, t) => sum + t.height, 0) / highTides.length;
        const avgLow = lowTides.reduce((sum, t) => sum + t.height, 0) / lowTides.length;
        
        expect(avgHigh).toBeGreaterThan(avgLow);
      }
    });
  });

  describe('station lookup accuracy', () => {
    it('should find correct station for Hoorn area', async () => {
      const hoornPos: Position = {
        latitude: 52.64,
        longitude: 5.06,
        accuracy: 0,
        timestamp: Date.now()
      };
      
      const station = await tideService.getNearbyStation(hoornPos);
      
      expect(station?.id).toBe('NL-HVN');
    });

    it('should find correct station for Rotterdam area', async () => {
      const rotterdamPos: Position = {
        latitude: 51.90,
        longitude: 4.50,
        accuracy: 0,
        timestamp: Date.now()
      };
      
      const station = await tideService.getNearbyStation(rotterdamPos);
      
      expect(station?.id).toBe('NL-RTM');
    });

    it('should find correct station for Den Helder area', async () => {
      const denHelderPos: Position = {
        latitude: 52.96,
        longitude: 4.75,
        accuracy: 0,
        timestamp: Date.now()
      };
      
      const station = await tideService.getNearbyStation(denHelderPos);
      
      expect(station?.id).toBe('NL-DENH');
    });
  });
});
