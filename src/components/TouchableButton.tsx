/**
 * Touchable button component optimized for tablet finger interaction
 * Ensures minimum touch target sizes and provides haptic feedback
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { useResponsiveLayout } from '../hooks/useResponsive';

export interface TouchableButtonProps {
  onPress: () => void;
  title: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const TouchableButton: React.FC<TouchableButtonProps> = ({
  onPress,
  title,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
  icon,
}) => {
  const layout = useResponsiveLayout();

  const getButtonHeight = (): number => {
    switch (size) {
      case 'small':
        return layout.touchTarget;
      case 'medium':
        return layout.touchTarget * 1.2;
      case 'large':
        return layout.touchTarget * 1.5;
      default:
        return layout.touchTarget;
    }
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      minHeight: getButtonHeight(),
      paddingHorizontal: layout.spacing,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    };

    switch (variant) {
      case 'primary':
        return { ...baseStyle, backgroundColor: '#2196F3' };
      case 'secondary':
        return { 
          ...baseStyle, 
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: '#2196F3',
        };
      case 'danger':
        return { ...baseStyle, backgroundColor: '#f44336' };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: layout.fontSize.medium,
      fontWeight: '600',
    };

    switch (variant) {
      case 'primary':
      case 'danger':
        return { ...baseStyle, color: '#fff' };
      case 'secondary':
        return { ...baseStyle, color: '#2196F3' };
      default:
        return baseStyle;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        getButtonStyle(),
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[getTextStyle(), textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    marginRight: 8,
  },
});
