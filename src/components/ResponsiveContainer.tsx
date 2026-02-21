/**
 * Responsive container component for tablet layouts
 * Automatically adjusts padding, spacing, and layout based on screen size
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsiveLayout, useOrientation } from '../hooks/useResponsive';
import { Orientation } from '../utils/responsive';

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: boolean;
  horizontal?: boolean;
  centered?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  padding = true,
  horizontal = false,
  centered = false,
}) => {
  const layout = useResponsiveLayout();
  const orientation = useOrientation();

  const containerStyle: ViewStyle = {
    ...(padding && { padding: layout.padding }),
    ...(horizontal && { flexDirection: 'row' }),
    ...(centered && { 
      justifyContent: 'center', 
      alignItems: 'center' 
    }),
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
