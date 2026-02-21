import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WeatherLayer } from '../types';

export interface WeatherLayerControlProps {
  activeLayer: WeatherLayer | null;
  onLayerChange: (layer: WeatherLayer | null) => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
}

export const WeatherLayerControl: React.FC<WeatherLayerControlProps> = ({
  activeLayer,
  onLayerChange,
  opacity = 0.6,
  onOpacityChange
}) => {
  const layers = [
    { id: WeatherLayer.Wind, label: 'Wind', icon: '💨' },
    { id: WeatherLayer.Waves, label: 'Waves', icon: '🌊' },
    { id: WeatherLayer.Precipitation, label: 'Rain', icon: '🌧️' },
    { id: WeatherLayer.Pressure, label: 'Pressure', icon: '🌡️' }
  ];

  const handleLayerPress = (layer: WeatherLayer) => {
    if (activeLayer === layer) {
      onLayerChange(null);
    } else {
      onLayerChange(layer);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weather Layers</Text>
      
      <View style={styles.layerButtons}>
        {layers.map((layer) => (
          <TouchableOpacity
            key={layer.id}
            style={[
              styles.layerButton,
              activeLayer === layer.id && styles.layerButtonActive
            ]}
            onPress={() => handleLayerPress(layer.id)}
          >
            <Text style={styles.layerIcon}>{layer.icon}</Text>
            <Text
              style={[
                styles.layerLabel,
                activeLayer === layer.id && styles.layerLabelActive
              ]}
            >
              {layer.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeLayer && onOpacityChange && (
        <View style={styles.opacityControl}>
          <Text style={styles.opacityLabel}>Opacity</Text>
          <View style={styles.opacityButtons}>
            {[0.3, 0.5, 0.7, 0.9].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.opacityButton,
                  Math.abs(opacity - value) < 0.1 && styles.opacityButtonActive
                ]}
                onPress={() => onOpacityChange(value)}
              >
                <Text style={styles.opacityButtonText}>
                  {Math.round(value * 100)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  layerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  layerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  layerButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3'
  },
  layerIcon: {
    fontSize: 18,
    marginRight: 6
  },
  layerLabel: {
    fontSize: 12,
    color: '#666'
  },
  layerLabelActive: {
    color: '#2196f3',
    fontWeight: 'bold'
  },
  opacityControl: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  opacityLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6
  },
  opacityButtons: {
    flexDirection: 'row',
    gap: 6
  },
  opacityButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent'
  },
  opacityButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3'
  },
  opacityButtonText: {
    fontSize: 11,
    color: '#666'
  }
});
