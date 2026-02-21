import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch
} from 'react-native';
import { createSettingsService } from '../services/SettingsService';
import { UnitSystem, ChartRotation } from '../types';
import { DisplaySettings } from './DisplaySettings';
import { AlertSettings } from './AlertSettings';
import { ConnectionSettings } from './ConnectionSettings';
import { useResponsiveLayout, useOrientation } from '../hooks/useResponsive';
import { Orientation } from '../utils/responsive';

type SettingsTab = 'display' | 'alerts' | 'connections';

export const SettingsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('display');
  const settingsService = createSettingsService();
  const layout = useResponsiveLayout();
  const orientation = useOrientation();

  useEffect(() => {
    settingsService.initialize();
  }, []);

  const renderTabButton = (tab: SettingsTab, label: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton, 
        activeTab === tab && styles.activeTab,
        { minHeight: layout.touchTarget }
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[
        styles.tabText, 
        activeTab === tab && styles.activeTabText,
        { fontSize: layout.fontSize.medium }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { padding: layout.padding }]}>
        <Text style={[styles.title, { fontSize: layout.fontSize.xlarge }]}>Settings</Text>
      </View>

      <View style={styles.tabs}>
        {renderTabButton('display', 'Display')}
        {renderTabButton('alerts', 'Alerts')}
        {renderTabButton('connections', 'Connections')}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: layout.padding }}>
        {activeTab === 'display' && <DisplaySettings service={settingsService} />}
        {activeTab === 'alerts' && <AlertSettings service={settingsService} />}
        {activeTab === 'connections' && <ConnectionSettings service={settingsService} />}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 16,
    paddingTop: 40
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center'
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3'
  },
  tabText: {
    fontSize: 16,
    color: '#666'
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold'
  },
  content: {
    flex: 1
  }
});
