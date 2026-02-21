/**
 * React hooks for responsive tablet layouts
 */

import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import {
  getScreenSize,
  getOrientation,
  getResponsiveLayout,
  isTablet,
  ScreenSize,
  Orientation,
  ResponsiveLayout,
} from '../utils/responsive';

/**
 * Hook to track screen size changes
 */
export const useScreenSize = (): ScreenSize => {
  const [screenSize, setScreenSize] = useState<ScreenSize>(getScreenSize());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setScreenSize(getScreenSize());
    });

    return () => subscription?.remove();
  }, []);

  return screenSize;
};

/**
 * Hook to track orientation changes
 */
export const useOrientation = (): Orientation => {
  const [orientation, setOrientation] = useState<Orientation>(getOrientation());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setOrientation(getOrientation());
    });

    return () => subscription?.remove();
  }, []);

  return orientation;
};

/**
 * Hook to get responsive layout configuration
 */
export const useResponsiveLayout = (): ResponsiveLayout => {
  const [layout, setLayout] = useState<ResponsiveLayout>(getResponsiveLayout());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setLayout(getResponsiveLayout());
    });

    return () => subscription?.remove();
  }, []);

  return layout;
};

/**
 * Hook to check if device is a tablet
 */
export const useIsTablet = (): boolean => {
  const [tablet, setTablet] = useState<boolean>(isTablet());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setTablet(isTablet());
    });

    return () => subscription?.remove();
  }, []);

  return tablet;
};

/**
 * Hook to get window dimensions
 */
export const useWindowDimensions = (): ScaledSize => {
  const [dimensions, setDimensions] = useState<ScaledSize>(
    Dimensions.get('window')
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};
