import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import {
  toggleLayerVisibility,
  setLayerOpacity,
} from '../store/slices/chartSlice';
import { ChartLayer } from '../types';

export interface LayerControlProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  style?: object;
}

/**
 * LayerControl provides UI for managing chart layer visibility and opacity.
 * Satisfies requirement 1.4 for layer visibility controls.
 */
const LayerControl: React.FC<LayerControlProps> = ({
  position = 'bottom-left',
  style,
}) => {
  const dispatch = useDispatch();
  const layers = useSelector((state: RootState) => state.chart.layers);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleLayer = (layerId: string) => {
    dispatch(toggleLayerVisibility(layerId));
  };

  const handleOpacityChange = (layerId: string, opacity: number) => {
    dispatch(setLayerOpacity({ layerId, opacity }));
  };

  // Position styles
  const positionStyles = {
    'top-left': styles.topLeft,
    'top-right': styles.topRight,
    'bottom-left': styles.bottomLeft,
    'bottom-right': styles.bottomRight,
  };

  // Layer type icons
  const getLayerIcon = (type: ChartLayer['type']): string => {
    switch (type) {
      case 'vector':
        return '🗺️';
      case 'raster':
        return '📷';
      case 'weather':
        return '🌤️';
      case 'tide':
        return '🌊';
      default:
        return '📍';
    }
  };

  return (
    <View style={[styles.container, positionStyles[position], style]}>
      {/* Toggle button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.toggleIcon}>📋</Text>
        <Text style={styles.toggleLabel}>Layers</Text>
      </TouchableOpacity>

      {/* Layer list modal */}
      <Modal
        visible={isExpanded}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsExpanded(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsExpanded(false)}
        >
          <View
            style={styles.layerList}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.layerListHeader}>
              <Text style={styles.layerListTitle}>Chart Layers</Text>
              <TouchableOpacity onPress={() => setIsExpanded(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.layerListScroll}>
              {layers.map((layer) => (
                <View key={layer.id} style={styles.layerItem}>
                  <TouchableOpacity
                    style={styles.layerToggle}
                    onPress={() => handleToggleLayer(layer.id)}
                  >
                    <Text style={styles.layerIcon}>
                      {getLayerIcon(layer.type)}
                    </Text>
                    <View style={styles.layerInfo}>
                      <Text style={styles.layerName}>{layer.id}</Text>
                      <Text style={styles.layerType}>{layer.type}</Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        layer.visible && styles.checkboxChecked,
                      ]}
                    >
                      {layer.visible && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Opacity slider (simplified) */}
                  {layer.visible && (
                    <View style={styles.opacityControl}>
                      <Text style={styles.opacityLabel}>
                        Opacity: {Math.round(layer.opacity * 100)}%
                      </Text>
                      <View style={styles.opacityButtons}>
                        <TouchableOpacity
                          style={styles.opacityButton}
                          onPress={() =>
                            handleOpacityChange(
                              layer.id,
                              Math.max(0, layer.opacity - 0.1)
                            )
                          }
                        >
                          <Text>−</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.opacityButton}
                          onPress={() =>
                            handleOpacityChange(
                              layer.id,
                              Math.min(1, layer.opacity + 0.1)
                            )
                          }
                        >
                          <Text>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}

              {layers.length === 0 && (
                <Text style={styles.emptyMessage}>No layers available</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  toggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toggleIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  layerList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '80%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  layerListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  layerListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeButton: {
    fontSize: 24,
    color: '#666666',
  },
  layerListScroll: {
    padding: 8,
  },
  layerItem: {
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    overflow: 'hidden',
  },
  layerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  layerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  layerInfo: {
    flex: 1,
  },
  layerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  layerType: {
    fontSize: 12,
    color: '#666666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  opacityControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  opacityLabel: {
    fontSize: 12,
    color: '#666666',
  },
  opacityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  opacityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#999999',
    padding: 24,
    fontSize: 14,
  },
});

export default LayerControl;
