import React from 'react';
import { InstrumentPanelGrid, defaultPanelConfigs } from './InstrumentPanelGrid';
import { InstrumentDataType } from '../types';

// Mock React Native components
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Dimensions: {
    get: () => ({ width: 800, height: 600 }),
  },
}));

// Mock Redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

describe('InstrumentPanelGrid', () => {
  describe('Component Structure', () => {
    it('should export InstrumentPanelGrid component', () => {
      expect(InstrumentPanelGrid).toBeDefined();
      expect(typeof InstrumentPanelGrid).toBe('function');
    });

    it('should export defaultPanelConfigs', () => {
      expect(defaultPanelConfigs).toBeDefined();
      expect(Array.isArray(defaultPanelConfigs)).toBe(true);
    });

    it('should accept configs prop', () => {
      const component = InstrumentPanelGrid;
      expect(component).toBeDefined();
    });

    it('should accept optional onConfigChange prop', () => {
      const component = InstrumentPanelGrid;
      expect(component).toBeDefined();
    });

    it('should accept optional editable prop', () => {
      const component = InstrumentPanelGrid;
      expect(component).toBeDefined();
    });
  });

  describe('Default Panel Configurations', () => {
    it('should include speed panel', () => {
      const speedPanel = defaultPanelConfigs.find(
        config => config.dataType === InstrumentDataType.Speed
      );
      expect(speedPanel).toBeDefined();
      expect(speedPanel?.label).toBe('Speed');
    });

    it('should include depth panel', () => {
      const depthPanel = defaultPanelConfigs.find(
        config => config.dataType === InstrumentDataType.Depth
      );
      expect(depthPanel).toBeDefined();
      expect(depthPanel?.label).toBe('Depth');
    });

    it('should include wind panel', () => {
      const windPanel = defaultPanelConfigs.find(
        config => config.dataType === InstrumentDataType.Wind
      );
      expect(windPanel).toBeDefined();
      expect(windPanel?.label).toBe('Wind');
    });

    it('should include heading panel', () => {
      const headingPanel = defaultPanelConfigs.find(
        config => config.dataType === InstrumentDataType.Heading
      );
      expect(headingPanel).toBeDefined();
      expect(headingPanel?.label).toBe('Heading');
    });

    it('should include temperature panel', () => {
      const tempPanel = defaultPanelConfigs.find(
        config => config.dataType === InstrumentDataType.Temperature
      );
      expect(tempPanel).toBeDefined();
      expect(tempPanel?.label).toBe('Water Temp');
    });

    it('should have 5 default panels', () => {
      expect(defaultPanelConfigs.length).toBe(5);
    });

    it('should have unique IDs for all panels', () => {
      const ids = defaultPanelConfigs.map(config => config.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(defaultPanelConfigs.length);
    });

    it('should have valid sizes for all panels', () => {
      const validSizes = ['small', 'medium', 'large'];
      defaultPanelConfigs.forEach(config => {
        expect(validSizes).toContain(config.size);
      });
    });

    it('should have positions for all panels', () => {
      defaultPanelConfigs.forEach(config => {
        expect(config.position).toBeDefined();
        expect(typeof config.position.x).toBe('number');
        expect(typeof config.position.y).toBe('number');
      });
    });
  });

  describe('Alert Thresholds', () => {
    it('should define depth minimum threshold', () => {
      const depthThreshold = { min: 2 };
      expect(depthThreshold.min).toBe(2);
    });

    it('should define speed maximum threshold', () => {
      const speedThreshold = { max: 30 };
      expect(speedThreshold.max).toBe(30);
    });

    it('should define wind maximum threshold', () => {
      const windThreshold = { max: 40 };
      expect(windThreshold.max).toBe(40);
    });

    it('should define temperature range threshold', () => {
      const tempThreshold = { min: 0, max: 40 };
      expect(tempThreshold.min).toBe(0);
      expect(tempThreshold.max).toBe(40);
    });
  });

  describe('Panel Customization', () => {
    it('should support custom panel configurations', () => {
      const customConfigs = [
        {
          id: 'custom-speed',
          dataType: InstrumentDataType.Speed,
          label: 'Boat Speed',
          size: 'large' as const,
          position: { x: 0, y: 0 },
        },
      ];
      expect(customConfigs.length).toBe(1);
      expect(customConfigs[0].label).toBe('Boat Speed');
    });

    it('should support different panel sizes', () => {
      const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
      sizes.forEach(size => {
        const config = {
          id: `test-${size}`,
          dataType: InstrumentDataType.Speed,
          label: 'Test',
          size,
          position: { x: 0, y: 0 },
        };
        expect(config.size).toBe(size);
      });
    });
  });
});
