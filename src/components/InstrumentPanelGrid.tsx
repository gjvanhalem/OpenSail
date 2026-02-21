import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { InstrumentPanel, InstrumentPanelConfig } from './InstrumentPanel';
import { InstrumentDataType } from '../types';
import { RootState } from '../store';
import { useResponsiveLayout, useOrientation } from '../hooks/useResponsive';
import { Orientation } from '../utils/responsive';

export interface InstrumentPanelGridProps {
  configs: InstrumentPanelConfig[];
  onConfigChange?: (configs: InstrumentPanelConfig[]) => void;
  editable?: boolean;
}

export const InstrumentPanelGrid: React.FC<InstrumentPanelGridProps> = ({
  configs,
  onConfigChange,
  editable = false,
}) => {
  const [panelConfigs, setPanelConfigs] = useState<InstrumentPanelConfig[]>(configs);
  const layout = useResponsiveLayout();
  const orientation = useOrientation();

  // Get instrument data from Redux store
  const instrumentData = useSelector((state: RootState) => state.instrument.latestData);
  const units = useSelector((state: RootState) => state.settings.units);

  // Get alert thresholds from settings (could be expanded)
  const alertThresholds: Record<InstrumentDataType, { min?: number; max?: number } | undefined> = {
    [InstrumentDataType.Depth]: { min: 2 }, // Alert if depth < 2m
    [InstrumentDataType.Speed]: { max: 30 }, // Alert if speed > 30 knots
    [InstrumentDataType.Wind]: { max: 40 }, // Alert if wind > 40 knots
    [InstrumentDataType.Heading]: undefined,
    [InstrumentDataType.Temperature]: { min: 0, max: 40 },
    [InstrumentDataType.GPS]: undefined,
    [InstrumentDataType.AIS]: undefined,
  };

  const handlePanelPress = (config: InstrumentPanelConfig) => {
    if (editable) {
      // Could open edit dialog here
      console.log('Edit panel:', config.id);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[
      styles.contentContainer,
      { padding: layout.padding }
    ]}>
      <View style={[
        styles.grid,
        { gap: layout.spacing }
      ]}>
        {panelConfigs.map(config => (
          <View 
            key={config.id} 
            style={[
              styles.panelWrapper,
              { 
                minWidth: layout.touchTarget * 2,
                minHeight: layout.touchTarget * 2
              }
            ]}
          >
            <InstrumentPanel
              config={config}
              data={instrumentData[config.dataType]}
              units={units}
              alertThreshold={alertThresholds[config.dataType]}
              onPress={() => handlePanelPress(config)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// Default panel configurations
export const defaultPanelConfigs: InstrumentPanelConfig[] = [
  {
    id: 'speed',
    dataType: InstrumentDataType.Speed,
    label: 'Speed',
    size: 'medium',
    position: { x: 0, y: 0 },
  },
  {
    id: 'depth',
    dataType: InstrumentDataType.Depth,
    label: 'Depth',
    size: 'medium',
    position: { x: 1, y: 0 },
  },
  {
    id: 'wind',
    dataType: InstrumentDataType.Wind,
    label: 'Wind',
    size: 'large',
    position: { x: 0, y: 1 },
  },
  {
    id: 'heading',
    dataType: InstrumentDataType.Heading,
    label: 'Heading',
    size: 'medium',
    position: { x: 2, y: 0 },
  },
  {
    id: 'temperature',
    dataType: InstrumentDataType.Temperature,
    label: 'Water Temp',
    size: 'small',
    position: { x: 2, y: 1 },
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  contentContainer: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  panelWrapper: {
    marginBottom: 12,
  },
});
