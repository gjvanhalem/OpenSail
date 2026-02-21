/**
 * Responsive utilities tests
 */

import { Dimensions } from 'react-native';
import {
  getScreenDimensions,
  getScreenSizeInches,
  getScreenSize,
  getOrientation,
  isTablet,
  scaleSize,
  getFontSize,
  getMinTouchTarget,
  getTouchTargetSize,
  getSpacing,
  getGridColumns,
  getResponsiveLayout,
  ScreenSize,
  Orientation,
} from './responsive';

// Mock Dimensions
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(),
    addEventListener: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('Responsive Utilities', () => {
  beforeEach(() => {
    // Reset mock
    (Dimensions.get as jest.Mock).mockReturnValue({
      width: 768,
      height: 1024,
      scale: 2,
      fontScale: 1,
    });
  });

  describe('getScreenDimensions', () => {
    it('should return current screen dimensions', () => {
      const dimensions = getScreenDimensions();

      expect(dimensions.width).toBe(768);
      expect(dimensions.height).toBe(1024);
      expect(dimensions.scale).toBe(2);
      expect(dimensions.fontScale).toBe(1);
    });
  });

  describe('getScreenSizeInches', () => {
    it('should calculate screen size in inches', () => {
      const inches = getScreenSizeInches();
      expect(inches).toBeGreaterThan(0);
    });
  });

  describe('getScreenSize', () => {
    it('should return a valid screen size category', () => {
      const size = getScreenSize();
      expect([ScreenSize.Small, ScreenSize.Medium, ScreenSize.Large]).toContain(size);
    });
  });

  describe('getOrientation', () => {
    it('should return portrait when height > width', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 768,
        height: 1024,
        scale: 2,
        fontScale: 1,
      });

      expect(getOrientation()).toBe(Orientation.Portrait);
    });

    it('should return landscape when width > height', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 1024,
        height: 768,
        scale: 2,
        fontScale: 1,
      });

      expect(getOrientation()).toBe(Orientation.Landscape);
    });
  });

  describe('isTablet', () => {
    it('should return a boolean value', () => {
      const result = isTablet();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('scaleSize', () => {
    it('should return a positive scaled value', () => {
      const scaled = scaleSize(100);
      expect(scaled).toBeGreaterThan(0);
    });

    it('should scale proportionally', () => {
      const scaled1 = scaleSize(50);
      const scaled2 = scaleSize(100);
      expect(scaled2).toBeGreaterThan(scaled1);
    });
  });

  describe('getFontSize', () => {
    it('should return scaled font size', () => {
      const fontSize = getFontSize(16);
      expect(fontSize).toBeGreaterThan(0);
    });
  });

  describe('getMinTouchTarget', () => {
    it('should return 44 for iOS', () => {
      expect(getMinTouchTarget()).toBe(44);
    });
  });

  describe('getTouchTargetSize', () => {
    it('should return a touch target size at least as large as minimum', () => {
      const size = getTouchTargetSize();
      expect(size).toBeGreaterThanOrEqual(getMinTouchTarget());
    });
  });

  describe('getSpacing', () => {
    it('should return scaled spacing', () => {
      const spacing = getSpacing(16);
      expect(spacing).toBeGreaterThan(0);
    });
  });

  describe('getGridColumns', () => {
    it('should return more columns in landscape', () => {
      // Portrait
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 768,
        height: 1024,
        scale: 2,
        fontScale: 1,
      });
      const portraitColumns = getGridColumns();

      // Landscape
      (Dimensions.get as jest.Mock).mockReturnValue({
        width: 1024,
        height: 768,
        scale: 2,
        fontScale: 1,
      });
      const landscapeColumns = getGridColumns();

      expect(landscapeColumns).toBeGreaterThan(portraitColumns);
    });

    it('should return appropriate columns for screen size', () => {
      const columns = getGridColumns();
      expect(columns).toBeGreaterThan(0);
      expect(columns).toBeLessThanOrEqual(5);
    });
  });

  describe('getResponsiveLayout', () => {
    it('should return complete layout configuration', () => {
      const layout = getResponsiveLayout();

      expect(layout.columns).toBeGreaterThan(0);
      expect(layout.spacing).toBeGreaterThan(0);
      expect(layout.padding).toBeGreaterThan(0);
      expect(layout.fontSize.small).toBeGreaterThan(0);
      expect(layout.fontSize.medium).toBeGreaterThan(0);
      expect(layout.fontSize.large).toBeGreaterThan(0);
      expect(layout.fontSize.xlarge).toBeGreaterThan(0);
      expect(layout.touchTarget).toBeGreaterThan(0);
      expect(layout.iconSize.small).toBeGreaterThan(0);
      expect(layout.iconSize.medium).toBeGreaterThan(0);
      expect(layout.iconSize.large).toBeGreaterThan(0);
    });

    it('should provide consistent layout scaling', () => {
      const layout = getResponsiveLayout();

      // Verify all values are positive
      expect(layout.columns).toBeGreaterThan(0);
      expect(layout.spacing).toBeGreaterThan(0);
      expect(layout.padding).toBeGreaterThan(0);
      expect(layout.fontSize.small).toBeGreaterThan(0);
      expect(layout.fontSize.medium).toBeGreaterThan(layout.fontSize.small);
      expect(layout.fontSize.large).toBeGreaterThan(layout.fontSize.medium);
      expect(layout.fontSize.xlarge).toBeGreaterThan(layout.fontSize.large);
      expect(layout.touchTarget).toBeGreaterThanOrEqual(getMinTouchTarget());
      expect(layout.iconSize.medium).toBeGreaterThan(layout.iconSize.small);
      expect(layout.iconSize.large).toBeGreaterThan(layout.iconSize.medium);
    });
  });
});
