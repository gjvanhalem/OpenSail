import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setRotation } from '../store/slices/chartSlice';
import { ChartRotation } from '../types';

export interface ChartRotationControlProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  style?: object;
}

/**
 * ChartRotationControl provides UI for switching between north-up and heading-up modes.
 * Satisfies requirement 1.5 for chart rotation support.
 */
const ChartRotationControl: React.FC<ChartRotationControlProps> = ({
  position = 'top-right',
  style,
}) => {
  const dispatch = useDispatch();
  const rotation = useSelector((state: RootState) => state.chart.rotation);
  const currentHeading = useSelector(
    (state: RootState) => state.navigation.currentHeading
  );

  const toggleRotation = () => {
    const newRotation =
      rotation === ChartRotation.NorthUp
        ? ChartRotation.HeadingUp
        : ChartRotation.NorthUp;
    dispatch(setRotation(newRotation));
  };

  const isNorthUp = rotation === ChartRotation.NorthUp;
  const isHeadingAvailable = currentHeading !== null;

  // Position styles
  const positionStyles = {
    'top-left': styles.topLeft,
    'top-right': styles.topRight,
    'bottom-left': styles.bottomLeft,
    'bottom-right': styles.bottomRight,
  };

  return (
    <View style={[styles.container, positionStyles[position], style]}>
      <TouchableOpacity
        style={[
          styles.button,
          isNorthUp ? styles.buttonActive : styles.buttonInactive,
        ]}
        onPress={toggleRotation}
        disabled={!isHeadingAvailable && !isNorthUp}
      >
        <Text style={styles.icon}>{isNorthUp ? '↑' : '⊙'}</Text>
        <Text style={styles.label}>
          {isNorthUp ? 'North Up' : 'Heading Up'}
        </Text>
        {!isHeadingAvailable && !isNorthUp && (
          <Text style={styles.warning}>No heading data</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  topLeft: {
    top: 16,
    left: 16,
  },
  topRight: {
    top: 16,
    right: 16,
  },
  bottomLeft: {
    bottom: 16,
    left: 16,
  },
  bottomRight: {
    bottom: 16,
    right: 16,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonActive: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  buttonInactive: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  icon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  warning: {
    fontSize: 10,
    color: '#FF3B30',
    marginTop: 4,
  },
});

export default ChartRotationControl;
