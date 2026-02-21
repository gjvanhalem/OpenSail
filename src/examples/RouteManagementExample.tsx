import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { store } from '../store';
import { RoutePlanner, RouteList } from '../components';
import { RouteServiceImpl } from '../services/RouteService';
import { Route, Position } from '../types';

/**
 * Example component demonstrating how to integrate the Route Planner UI
 * into the marine navigation application.
 * 
 * This example shows:
 * - Switching between route list and route planner views
 * - Passing the route service to components
 * - Handling route creation and selection
 * - Using current GPS position for new waypoints
 */

const RouteManagementExample: React.FC = () => {
  const [view, setView] = useState<'list' | 'planner'>('list');
  const [routeService] = useState(() => {
    const service = new RouteServiceImpl();
    service.setStore(store);
    return service;
  });

  // In a real app, this would come from GPS/InstrumentService
  const currentPosition: Position = {
    latitude: 52.3676,
    longitude: 4.9041,
    accuracy: 10,
    timestamp: Date.now(),
  };

  const handleRouteCreated = (route: Route) => {
    console.log('Route created:', route);
    // Switch back to list view after creating route
    setView('list');
  };

  const handleRouteSelect = (route: Route) => {
    console.log('Route selected:', route);
    // In a real app, this might:
    // - Display the route on the chart
    // - Show route details in a modal
    // - Navigate to a route detail screen
  };

  const handleCreateNew = () => {
    setView('planner');
  };

  const handleClosePlanner = () => {
    setView('list');
  };

  return (
    <Provider store={store}>
      <View style={styles.container}>
        {view === 'list' ? (
          <RouteList
            routeService={routeService}
            onRouteSelect={handleRouteSelect}
            onCreateNew={handleCreateNew}
          />
        ) : (
          <RoutePlanner
            routeService={routeService}
            onRouteCreated={handleRouteCreated}
            onClose={handleClosePlanner}
            initialPosition={currentPosition}
          />
        )}
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default RouteManagementExample;

/**
 * Integration Notes:
 * 
 * 1. Route Service Setup:
 *    - Create a single RouteServiceImpl instance
 *    - Set the Redux store on the service
 *    - Pass the service to both components
 * 
 * 2. Current Position:
 *    - Get from InstrumentService GPS data
 *    - Subscribe to position updates
 *    - Use for initial waypoint placement
 * 
 * 3. Navigation Flow:
 *    - List view shows all saved routes
 *    - Tap "New Route" to open planner
 *    - Create route and return to list
 *    - Select route to activate for navigation
 * 
 * 4. Chart Integration:
 *    - When route is selected, display on ChartDisplay
 *    - Use RouteLayer component to render route
 *    - Allow tapping waypoints on chart to edit
 * 
 * 5. Active Route:
 *    - Activate route for navigation
 *    - Display in NavigationPanel
 *    - Show distance/bearing to next waypoint
 *    - Calculate ETA based on current speed
 * 
 * 6. Persistence:
 *    - Routes automatically saved to SQLite
 *    - Load routes on app startup
 *    - Sync with Redux store
 * 
 * 7. Export/Import:
 *    - Export routes as GPX/KML
 *    - Share via email or file system
 *    - Import routes from other apps
 */
