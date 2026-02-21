import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TextInput
} from 'react-native';
import { SettingsService } from '../types';

interface AlertSettingsProps {
  service: SettingsService;
}

export const AlertSettings: React.FC<AlertSettingsProps> = ({ service }) => {
  const [anchorWatchRadius, setAnchorWatchRadius] = useState(50);
  const [enableAnchorAlarm, setEnableAnchorAlarm] = useState(true);
  const [enableCollisionAlarm, setEnableCollisionAlarm] = useState(true);
  const [collisionWarningDistance, setCollisionWarningDistance] = useState(2);
  const [enableShallowWaterAlarm, setEnableShallowWaterAlarm] = useState(true);
  const [shallowWaterDepth, setShallowWaterDepth] = useState(5);
  const [enableWeatherAlerts, setEnableWeatherAlerts] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await service.getAlertSettings();
    setAnchorWatchRadius(settings.anchorWatchRadius);
    setEnableAnchorAlarm(settings.enableAnchorAlarm);
    setEnableCollisionAlarm(settings.enableCollisionAlarm);
    setCollisionWarningDistance(settings.collisionWarningDistance);
    setEnableShallowWaterAlarm(settings.enableShallowWaterAlarm);
    setShallowWaterDepth(settings.shallowWaterDepth);
    setEnableWeatherAlerts(settings.enableWeatherAlerts);
  };

  const handleAnchorAlarmToggle = async (value: boolean) => {
    setEnableAnchorAlarm(value);
    await service.setSetting('enableAnchorAlarm', value);
  };

  const handleAnchorRadiusChange = async (text: string) => {
    const value = parseInt(text, 10);
    if (!isNaN(value) && value >= 10 && value <= 500) {
      setAnchorWatchRadius(value);
      await service.setSetting('anchorWatchRadius', value);
    }
  };

  const handleCollisionAlarmToggle = async (value: boolean) => {
    setEnableCollisionAlarm(value);
    await service.setSetting('enableCollisionAlarm', value);
  };

  const handleCollisionDistanceChange = async (text: string) => {
    const value = parseFloat(text);
    if (!isNaN(value) && value >= 0.5 && value <= 10) {
      setCollisionWarningDistance(value);
      await service.setSetting('collisionWarningDistance', value);
    }
  };

  const handleShallowWaterAlarmToggle = async (value: boolean) => {
    setEnableShallowWaterAlarm(value);
    await service.setSetting('enableShallowWaterAlarm', value);
  };

  const handleShallowWaterDepthChange = async (text: string) => {
    const value = parseFloat(text);
    if (!isNaN(value) && value >= 1 && value <= 50) {
      setShallowWaterDepth(value);
      await service.setSetting('shallowWaterDepth', value);
    }
  };

  const handleWeatherAlertsToggle = async (value: boolean) => {
    setEnableWeatherAlerts(value);
    await service.setSetting('enableWeatherAlerts', value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Anchor Watch</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Anchor Alarm</Text>
          <Switch
            value={enableAnchorAlarm}
            onValueChange={handleAnchorAlarmToggle}
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Anchor Watch Radius (meters)</Text>
          <TextInput
            style={styles.input}
            value={anchorWatchRadius.toString()}
            onChangeText={handleAnchorRadiusChange}
            keyboardType="numeric"
            editable={enableAnchorAlarm}
          />
        </View>
        <Text style={styles.helpText}>
          Alarm triggers when vessel moves outside this radius (10-500m)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Collision Warning</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Collision Alarm</Text>
          <Switch
            value={enableCollisionAlarm}
            onValueChange={handleCollisionAlarmToggle}
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Warning Distance (nautical miles)</Text>
          <TextInput
            style={styles.input}
            value={collisionWarningDistance.toString()}
            onChangeText={handleCollisionDistanceChange}
            keyboardType="numeric"
            editable={enableCollisionAlarm}
          />
        </View>
        <Text style={styles.helpText}>
          Warn when AIS targets come within this distance (0.5-10 NM)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shallow Water</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Shallow Water Alarm</Text>
          <Switch
            value={enableShallowWaterAlarm}
            onValueChange={handleShallowWaterAlarmToggle}
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Shallow Water Depth (meters)</Text>
          <TextInput
            style={styles.input}
            value={shallowWaterDepth.toString()}
            onChangeText={handleShallowWaterDepthChange}
            keyboardType="numeric"
            editable={enableShallowWaterAlarm}
          />
        </View>
        <Text style={styles.helpText}>
          Warn when depth is less than this value (1-50m)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weather Alerts</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Weather Alerts</Text>
          <Switch
            value={enableWeatherAlerts}
            onValueChange={handleWeatherAlertsToggle}
          />
        </View>
        <Text style={styles.helpText}>
          Show weather warnings and alerts for your navigation area
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
    color: '#333',
    flex: 1
  },
  inputRow: {
    marginTop: 12
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9'
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8
  }
});
