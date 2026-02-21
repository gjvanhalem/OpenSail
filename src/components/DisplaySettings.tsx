import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity
} from 'react-native';
import { SettingsService, UnitSystem, ChartRotation } from '../types';

interface DisplaySettingsProps {
  service: SettingsService;
}

export const DisplaySettings: React.FC<DisplaySettingsProps> = ({ service }) => {
  const [units, setUnits] = useState<UnitSystem>('nautical');
  const [chartRotation, setChartRotation] = useState<ChartRotation>(ChartRotation.NorthUp);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showNavigationAids, setShowNavigationAids] = useState(true);
  const [showDepthContours, setShowDepthContours] = useState(true);
  const [defaultZoom, setDefaultZoom] = useState(12);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await service.getDisplaySettings();
    setUnits(settings.units);
    setChartRotation(settings.chartRotation);
    setTheme(settings.theme);
    setShowNavigationAids(settings.showNavigationAids);
    setShowDepthContours(settings.showDepthContours);
    setDefaultZoom(settings.defaultZoom);
  };

  const handleUnitsChange = async (newUnits: UnitSystem) => {
    setUnits(newUnits);
    await service.setSetting('units', newUnits);
  };

  const handleRotationChange = async (newRotation: ChartRotation) => {
    setChartRotation(newRotation);
    await service.setSetting('chartRotation', newRotation);
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    await service.setSetting('theme', newTheme);
  };

  const handleNavigationAidsToggle = async (value: boolean) => {
    setShowNavigationAids(value);
    await service.setSetting('showNavigationAids', value);
  };

  const handleDepthContoursToggle = async (value: boolean) => {
    setShowDepthContours(value);
    await service.setSetting('showDepthContours', value);
  };

  const renderUnitButton = (unit: UnitSystem, label: string) => (
    <TouchableOpacity
      style={[styles.optionButton, units === unit && styles.selectedOption]}
      onPress={() => handleUnitsChange(unit)}
    >
      <Text style={[styles.optionText, units === unit && styles.selectedOptionText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderRotationButton = (rotation: ChartRotation, label: string) => (
    <TouchableOpacity
      style={[styles.optionButton, chartRotation === rotation && styles.selectedOption]}
      onPress={() => handleRotationChange(rotation)}
    >
      <Text style={[styles.optionText, chartRotation === rotation && styles.selectedOptionText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderThemeButton = (themeValue: 'light' | 'dark', label: string) => (
    <TouchableOpacity
      style={[styles.optionButton, theme === themeValue && styles.selectedOption]}
      onPress={() => handleThemeChange(themeValue)}
    >
      <Text style={[styles.optionText, theme === themeValue && styles.selectedOptionText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Units</Text>
        <View style={styles.optionGroup}>
          {renderUnitButton('metric', 'Metric')}
          {renderUnitButton('imperial', 'Imperial')}
          {renderUnitButton('nautical', 'Nautical')}
        </View>
        <Text style={styles.helpText}>
          Metric: meters, km/h • Imperial: feet, mph • Nautical: meters, knots
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chart Rotation</Text>
        <View style={styles.optionGroup}>
          {renderRotationButton(ChartRotation.NorthUp, 'North Up')}
          {renderRotationButton(ChartRotation.HeadingUp, 'Heading Up')}
        </View>
        <Text style={styles.helpText}>
          North Up: Chart stays fixed • Heading Up: Chart rotates with vessel
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Theme</Text>
        <View style={styles.optionGroup}>
          {renderThemeButton('light', 'Light')}
          {renderThemeButton('dark', 'Dark')}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chart Layers</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Show Navigation Aids</Text>
          <Switch
            value={showNavigationAids}
            onValueChange={handleNavigationAidsToggle}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Show Depth Contours</Text>
          <Switch
            value={showDepthContours}
            onValueChange={handleDepthContoursToggle}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Default Zoom Level</Text>
        <Text style={styles.valueText}>{defaultZoom}</Text>
        <Text style={styles.helpText}>
          Default zoom level when opening charts (1-20)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333'
  },
  optionGroup: {
    flexDirection: 'row',
    gap: 8
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center'
  },
  selectedOption: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3'
  },
  optionText: {
    fontSize: 14,
    color: '#666'
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  settingLabel: {
    fontSize: 16,
    color: '#333'
  },
  valueText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
    marginVertical: 8
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8
  }
});
