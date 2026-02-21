import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text } from 'react-native';
import { Provider } from 'react-redux';
import { store } from '../store';
import ChartDisplay from '../components/ChartDisplay';
import { RoutePlanner, RouteList } from '../components';
import { RouteServiceImpl } from '../services/RouteService';
import { Route, Position } from '../types';

/**
 * Example showing integration of Route Planner with Chart Display.
 * 
 * Features demonstrated:
 * - Chart display with route overlay
 * - Modal route planner
 * - Tap-to-add waypoints on chart
 * - Route list sidebar
 * - Active route visualization
 */

type ModalView = 'none' | 'planner' | 'list';

const ChartWithRoutePlannerExample: React.FC = () => {
  const [modalView, setModalView] = useState<ModalView>('none');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [routeService] = useState(() => {
    const service = new RouteServiceImpl();
    service.setStore(store);
    return service;
  });

  // Handle map tap for adding waypoints
  const handleMapInteraction = useCallback((event: any) => {
    if (event.type === 'longPress') {
      // Long press on map to add waypoint at that location
      const position: Position = {
        latitude: event.coordinates.latitude,
        longitude: event.coordinates.longitude,
        accuracy: 10,
        timestamp: Date.now(),
      };
      setSelectedPosition(position);
      setModalView('planner');
    }
  }, []);

  const handleRouteCreated = (route: Route) => {
    console.log('Route created:', route);
    setModalView('none');
    setSelectedPosition(null);
  };

  const handleRouteSelect = async (route: Route) => {
    console.log('Route selected:', route);
    // Activate the route for navigation
    await routeService.setActiveRoute(route.id);
    setModalView('none');
  };

  const handleCloseModal = () => {
    setModalView('none');
    setSelectedPosition(null);
  };

  return (
    <Provider store={store}>
      <View style={styles.container}>
        {/* Main Chart Display */}
        <ChartDisplay
          showVesselMarker={true}
          onMapInteraction={handleMapInteraction}
        />

        {/* Floating Action Buttons */}
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setModalView('list')}
          >
            <Text style={styles.fabText}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setModalView('planner')}
          >
            <Text style={styles.fabText}>➕</Text>
          </TouchableOpacity>
        </View>

        {/* Route Planner Modal */}
        <Modal
          visible={modalView === 'planner'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCloseModal}
        >
          <RoutePlanner
            routeService={routeService}
            onRouteCreated={handleRouteCreated}
            onClose={handleCloseModal}
            initialPosition={selectedPosition || undefined}
          />
        </Modal>

        {/* Route List Modal */}
        <Modal
          visible={modalView === 'list'}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCloseModal}
        >
          <RouteList
            routeService={routeService}
            onRouteSelect={handleRouteSelect}
            onCreateNew={() => setModalView('planner')}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleCloseModal}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </Modal>
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 24,
  },
  closeButton: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default ChartWithRoutePlannerExample;

/**
 * Usage Patterns:
 * 
 * 1. Quick Route Creation:
 *    - Long press on chart to start route at that position
 *    - Opens planner with first waypoint pre-filled
 *    - Add more waypoints and save
 * 
 * 2. Route Management:
 *    - Tap list button (📋) to view all routes
 *    - Select route to activate for navigation
 *    - Route appears on chart with RouteLayer
 * 
 * 3. New Route:
 *    - Tap add button (➕) to create new route
 *    - Opens planner with current position
 *    - Build route from scratch
 * 
 * 4. Chart Integration:
 *    - Active route displayed on chart
 *    - Waypoints shown as markers
 *    - Route line connects waypoints
 *    - Tap waypoint to edit
 * 
 * 5. Navigation Mode:
 *    - Activate route from list
 *    - Chart centers on current position
 *    - Shows bearing to next waypoint
 *    - Updates ETA in real-time
 * 
 * 6. Offline Support:
 *    - All routes stored locally
 *    - Works without internet
 *    - Syncs when online
 */
