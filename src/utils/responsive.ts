/**
 * Responsive utilities for tablet optimization
 * Handles screen size detection, orientation, and responsive scaling
 */

import { Dimensions, Platform, ScaledSize } from 'react-native';

export interface ScreenDimensions {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}

export enum ScreenSize {
  Small = 'small', // 7-8 inches
  Medium = 'medium', // 9-10 inches
  Large = 'large', // 11-13 inches
}

export enum Orientation {
  Portrait = 'portrait',
  Landscape = 'landscape',
}

/**
 * Get current screen dimensions
 */
export const getScreenDimensions = (): ScreenDimensions => {
  const { width, height, scale, fontScale } = Dimensions.get('window');
  return { width, height, scale, fontScale };
};

/**
 * Calculate diagonal screen size in inches
 */
export const getScreenSizeInches = (): number => {
  const { width, height, scale } = getScreenDimensions();
  const widthInches = width / (scale * 160); // 160 DPI baseline
  const heightInches = height / (scale * 160);
  return Math.sqrt(widthInches ** 2 + heightInches ** 2);
};

/**
 * Determine screen size category
 */
export const getScreenSize = (): ScreenSize => {
  const inches = getScreenSizeInches();
  if (inches < 9) return ScreenSize.Small;
  if (inches < 11) return ScreenSize.Medium;
  return ScreenSize.Large;
};

/**
 * Get current orientation
 */
export const getOrientation = (): Orientation => {
  const { width, height } = getScreenDimensions();
  return width > height ? Orientation.Landscape : Orientation.Portrait;
};

/**
 * Check if device is a tablet (7+ inches)
 */
export const isTablet = (): boolean => {
  return getScreenSizeInches() >= 7;
};

/**
 * Scale value based on screen size
 * Base values are for 10-inch tablet
 */
export const scaleSize = (size: number): number => {
  const screenSize = getScreenSize();
  switch (screenSize) {
    case ScreenSize.Small:
      return size * 0.85;
    case ScreenSize.Medium:
      return size;
    case ScreenSize.Large:
      return size * 1.15;
    default:
      return size;
  }
};

/**
 * Get responsive font size
 */
export const getFontSize = (baseSize: number): number => {
  return scaleSize(baseSize);
};

/**
 * Get minimum touch target size (44x44 for iOS, 48x48 for Android)
 */
export const getMinTouchTarget = (): number => {
  return Platform.OS === 'ios' ? 44 : 48;
};

/**
 * Get optimal touch target size for tablets (larger than minimum)
 */
export const getTouchTargetSize = (): number => {
  const minSize = getMinTouchTarget();
  const screenSize = getScreenSize();
  
  switch (screenSize) {
    case ScreenSize.Small:
      return minSize;
    case ScreenSize.Medium:
      return minSize * 1.2;
    case ScreenSize.Large:
      return minSize * 1.4;
    default:
      return minSize;
  }
};

/**
 * Get responsive spacing
 */
export const getSpacing = (base: number): number => {
  return scaleSize(base);
};

/**
 * Get grid columns based on screen size and orientation
 */
export const getGridColumns = (): number => {
  const orientation = getOrientation();
  const screenSize = getScreenSize();
  
  if (orientation === Orientation.Portrait) {
    switch (screenSize) {
      case ScreenSize.Small:
        return 2;
      case ScreenSize.Medium:
        return 3;
      case ScreenSize.Large:
        return 3;
      default:
        return 2;
    }
  } else {
    // Landscape
    switch (screenSize) {
      case ScreenSize.Small:
        return 3;
      case ScreenSize.Medium:
        return 4;
      case ScreenSize.Large:
        return 5;
      default:
        return 3;
    }
  }
};

/**
 * Get responsive layout configuration
 */
export interface ResponsiveLayout {
  columns: number;
  spacing: number;
  padding: number;
  fontSize: {
    small: number;
    medium: number;
    large: number;
    xlarge: number;
  };
  touchTarget: number;
  iconSize: {
    small: number;
    medium: number;
    large: number;
  };
}

export const getResponsiveLayout = (): ResponsiveLayout => {
  return {
    columns: getGridColumns(),
    spacing: getSpacing(16),
    padding: getSpacing(16),
    fontSize: {
      small: getFontSize(12),
      medium: getFontSize(16),
      large: getFontSize(20),
      xlarge: getFontSize(28),
    },
    touchTarget: getTouchTargetSize(),
    iconSize: {
      small: scaleSize(20),
      medium: scaleSize(28),
      large: scaleSize(36),
    },
  };
};

/**
 * Hook for responsive dimensions (React Native hook)
 */
export const useResponsiveDimensions = (
  callback: (dimensions: ScreenDimensions) => void
): void => {
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    callback({
      width: window.width,
      height: window.height,
      scale: window.scale,
      fontScale: window.fontScale,
    });
  });
};
