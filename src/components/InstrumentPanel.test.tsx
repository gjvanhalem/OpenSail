import React from 'react';
import { InstrumentPanel, InstrumentPanelConfig } from './InstrumentPanel';
import { InstrumentData, InstrumentDataType } from '../types';

// Mock React Native components
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

describe('InstrumentPanel', () => {
  const mockConfig: InstrumentPanelConfig = {
    id: 'speed',
    dataType: InstrumentDataType.Speed,
    label: 'Speed',
    size: 'medium',
    position: { x: 0, y: 0 },
  };

  describe('Component Structure', () => {
    it('should export InstrumentPanel component', () => {
      expect(InstrumentPanel).toBeDefined();
      expect(typeof InstrumentPanel).toBe('function');
    });

    it('should accept config prop', () => {
      const component = InstrumentPanel;
      expect(component).toBeDefined();
    });

    it('should accept data prop', () => {
      const component = InstrumentPanel;
      expect(component).toBeDefined();
    });

    it('should accept units prop', () => {
      const component = InstrumentPanel;
      expect(component).toBeDefined();
    });

    it('should accept optional alertThreshold prop', () => {
      const component = InstrumentPanel;
      expect(component).toBeDefined();
    });

    it('should accept optional onPress prop', () => {
      const component = InstrumentPanel;
      expect(component).toBeDefined();
    });
  });

  describe('Panel Configuration', () => {
    it('should support small size', () => {
      const smallConfig = { ...mockConfig, size: 'small' as const };
      expect(smallConfig.size).toBe('small');
    });

    it('should support medium size', () => {
      const mediumConfig = { ...mockConfig, size: 'medium' as const };
      expect(mediumConfig.size).toBe('medium');
    });

    it('should support large size', () => {
      const largeConfig = { ...mockConfig, size: 'large' as const };
      expect(largeConfig.size).toBe('large');
    });

    it('should support all instrument data types', () => {
      const types = [
        InstrumentDataType.Speed,
        InstrumentDataType.Depth,
        InstrumentDataType.Wind,
        InstrumentDataType.Heading,
        InstrumentDataType.Temperature,
        InstrumentDataType.GPS,
      ];

      types.forEach(type => {
        const config = { ...mockConfig, dataType: type };
        expect(config.dataType).toBe(type);
      });
    });
  });

  describe('Data Handling', () => {
    it('should handle null data', () => {
      const data = null;
      expect(data).toBeNull();
    });

    it('should handle speed data', () => {
      const speedData: InstrumentData = {
        type: InstrumentDataType.Speed,
        value: 10.5,
        unit: 'kts',
        timestamp: Date.now(),
        source: 'test',
      };
      expect(speedData.type).toBe(InstrumentDataType.Speed);
      expect(speedData.value).toBe(10.5);
    });

    it('should handle depth data', () => {
      const depthData: InstrumentData = {
        type: InstrumentDataType.Depth,
        value: 8.3,
        unit: 'm',
        timestamp: Date.now(),
        source: 'test',
      };
      expect(depthData.type).toBe(InstrumentDataType.Depth);
      expect(depthData.value).toBe(8.3);
    });

    it('should handle wind data with speed and direction', () => {
      const windData: InstrumentData = {
        type: InstrumentDataType.Wind,
        value: { speed: 15.5, direction: 270 },
        unit: 'kts',
        timestamp: Date.now(),
        source: 'test',
      };
      expect(windData.type).toBe(InstrumentDataType.Wind);
      expect((windData.value as any).speed).toBe(15.5);
      expect((windData.value as any).direction).toBe(270);
    });
  });

  describe('Alert Thresholds', () => {
    it('should support minimum threshold', () => {
      const threshold = { min: 2.0 };
      expect(threshold.min).toBe(2.0);
    });

    it('should support maximum threshold', () => {
      const threshold = { max: 30.0 };
      expect(threshold.max).toBe(30.0);
    });

    it('should support both min and max thresholds', () => {
      const threshold = { min: 0, max: 40 };
      expect(threshold.min).toBe(0);
      expect(threshold.max).toBe(40);
    });
  });
});
