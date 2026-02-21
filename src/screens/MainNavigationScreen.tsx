import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import ChartDisplay from '../components/ChartDisplay';
import { InstrumentPanelGrid } from '../components/InstrumentPanelGrid';
import { RoutePlanner } from '../components/RoutePlanner';
import { RouteList } from '../components/RouteList';
import { SettingsScreen } from '../components/SettingsScreen';
import { LogbookView } from '../components/LogbookView';
import { RouteServiceImpl } from '../services/RouteService';
import { store } from '../store';
import { Route, Position } from '../types';

type Screen = 'chart' | 'instruments' | 'routes' | 'logbook' | 'settings';

/**
 * Main navigation screen that integrates all major components
 */
const MainNavigationScreen: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('chart');
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [routeService] = useState(() => {
    const service = new RouteServiceImpl();
    service.setStore(store);
    return service;
  });

  const handleMapInteraction = (event: any) => {
    if (event.type === 'longPress') {
      const position: Position = {
        latitude: event.coordinates.latitude,
        longitude: event.coordinates.longitude,
        accuracy: 10,
        timestamp: Date.now(),
      };
      setSelectedPosition(position);
      setShowRoutePlanner(true);
    }
  };

  const handleRouteCreated = (route: Route) => {
    setShowRoutePlanner(false);
    setSelectedPosition(null);
  };

  const handleRouteSelect = async (route: Route) => {
    await routeService.setActiveRoute(route.id);
    setCurrentScreen('chart');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'chart':
        return (
          <ChartDisplay
            showVesselMarker={true}
            onMapInteraction={handleMapInteraction}
          />
        );
      case 'instruments':
        return <InstrumentPanelGrid configs={[]} />;
      case 'routes':
        return showRoutePlanner ? (
          <RoutePlanner
            routeService={routeService}
            onRouteCreated={handleRouteCreated}
            onClose={() => setShowRoutePlanner(false)}
            initialPosition={selectedPosition || undefined}
          />
        ) : (
          <View style={styles.screenContainer}>
            <RouteList
              routeService={routeService}
              onRouteSelect={handleRouteSelect}
              onCreateNew={() => setShowRoutePlanner(true)}
            />
          </View>
        );
      case 'logbook':
        return <LogbookView />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>{renderScreen()}</View>

      {/* Bottom Navigation Bar */}
      <View style={styles.navbar}>
        <TouchableOpacity
          style={[styles.navButton, currentScreen === 'chart' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('chart')}
        >
          <Text style={styles.navIcon}>🗺️</Text>
          <Text style={styles.navLabel}>Chart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentScreen === 'instruments' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('instruments')}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navLabel}>Instruments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentScreen === 'routes' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('routes')}
        >
          <Text style={styles.navIcon}>🧭</Text>
          <Text style={styles.navLabel}>Routes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentScreen === 'logbook' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('logbook')}
        >
          <Text style={styles.navIcon}>📖</Text>
          <Text style={styles.navLabel}>Logbook</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentScreen === 'settings' && styles.navButtonActive]}
          onPress={() => setCurrentScreen('settings')}
        >
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    padding: 16,
  },
  navbar: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 8,
    paddingTop: 8,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navButtonActive: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
  },
});

export default MainNavigationScreen;
