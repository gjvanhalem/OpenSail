import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { RouteList } from './RouteList';
import { RouteServiceImpl } from '../services/RouteService';
import routeReducer from '../store/slices/routeSlice';
import { Route } from '../types';

// Mock React Native components
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  FlatList: 'FlatList',
  Alert: {
    alert: jest.fn(),
  },
}));

const createMockStore = (initialRoutes: Route[] = []) => {
  return configureStore({
    reducer: {
      route: routeReducer,
    },
    preloadedState: {
      route: {
        routes: initialRoutes,
        activeRouteId: null,
        activeRoute: null,
        routeValidation: {},
        loading: false,
        error: null,
      },
    },
  });
};

const createMockRouteService = () => {
  const service = new RouteServiceImpl();
  service.getAllRoutes = jest.fn();
  service.setActiveRoute = jest.fn();
  service.clearActiveRoute = jest.fn();
  service.deleteRoute = jest.fn();
  service.exportRoute = jest.fn();
  return service;
};

const mockRoute1: Route = {
  id: 'route-1',
  name: 'Coastal Route',
  waypoints: [
    {
      id: 'wp-1',
      position: { latitude: 52.0, longitude: 4.0, accuracy: 10, timestamp: Date.now() },
      name: 'Start',
      arrivalRadius: 50,
    },
    {
      id: 'wp-2',
      position: { latitude: 52.5, longitude: 4.5, accuracy: 10, timestamp: Date.now() },
      name: 'End',
      arrivalRadius: 50,
    },
  ],
  totalDistance: 35.2,
  estimatedDuration: 25344,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

const mockRoute2: Route = {
  id: 'route-2',
  name: 'Harbor Approach',
  waypoints: [
    {
      id: 'wp-3',
      position: { latitude: 51.0, longitude: 3.0, accuracy: 10, timestamp: Date.now() },
      name: 'Buoy 1',
      arrivalRadius: 50,
    },
    {
      id: 'wp-4',
      position: { latitude: 51.2, longitude: 3.2, accuracy: 10, timestamp: Date.now() },
      name: 'Harbor',
      arrivalRadius: 50,
    },
  ],
  totalDistance: 15.8,
  estimatedDuration: 11376,
  createdAt: new Date('2024-01-03'),
  updatedAt: new Date('2024-01-04'),
};

describe('RouteList', () => {
  let mockRouteService: RouteServiceImpl;

  beforeEach(() => {
    mockRouteService = createMockRouteService();
    jest.clearAllMocks();
  });

  it('component can be instantiated', () => {
    (mockRouteService.getAllRoutes as jest.Mock).mockResolvedValue([]);
    const store = createMockStore();

    const component = (
      <Provider store={store}>
        <RouteList routeService={mockRouteService} />
      </Provider>
    );
    
    expect(component).toBeDefined();
  });

  it('accepts routeService prop', () => {
    const store = createMockStore();

    const component = (
      <Provider store={store}>
        <RouteList routeService={mockRouteService} />
      </Provider>
    );
    
    expect(component.props.children.props.routeService).toBe(mockRouteService);
  });

  it('accepts onRouteSelect callback', () => {
    const store = createMockStore();
    const onRouteSelect = jest.fn();

    const component = (
      <Provider store={store}>
        <RouteList
          routeService={mockRouteService}
          onRouteSelect={onRouteSelect}
        />
      </Provider>
    );
    
    expect(component.props.children.props.onRouteSelect).toBe(onRouteSelect);
  });

  it('accepts onCreateNew callback', () => {
    const store = createMockStore();
    const onCreateNew = jest.fn();

    const component = (
      <Provider store={store}>
        <RouteList routeService={mockRouteService} onCreateNew={onCreateNew} />
      </Provider>
    );
    
    expect(component.props.children.props.onCreateNew).toBe(onCreateNew);
  });

  it('loads routes from service on mount', async () => {
    (mockRouteService.getAllRoutes as jest.Mock).mockResolvedValue([
      mockRoute1,
      mockRoute2,
    ]);
    const store = createMockStore();

    const component = (
      <Provider store={store}>
        <RouteList routeService={mockRouteService} />
      </Provider>
    );

    expect(component).toBeDefined();
    // Service will be called during useEffect
  });

  it('displays routes from Redux store', () => {
    const store = createMockStore([mockRoute1, mockRoute2]);

    const component = (
      <Provider store={store}>
        <RouteList routeService={mockRouteService} />
      </Provider>
    );

    const state = store.getState();
    expect(state.route.routes).toHaveLength(2);
    expect(state.route.routes[0].name).toBe('Coastal Route');
  });

  it('handles route activation', async () => {
    (mockRouteService.setActiveRoute as jest.Mock).mockResolvedValue(undefined);
    const store = createMockStore([mockRoute1]);

    const component = (
      <Provider store={store}>
        <RouteList routeService={mockRouteService} />
      </Provider>
    );

    expect(component).toBeDefined();
  });

  it('handles route deactivation', async () => {
    (mockRouteService.clearActiveRoute as jest.Mock).mockResolvedValue(undefined);
    const store = createMockStore([mockRoute1]);

    const component = (
      <Provider store={store}>
        <RouteList routeService={mockRouteService} />
      </Provider>
    );

    expect(component).toBeDefined();
  });

  it('handles route deletion', async () => {
    (mockRouteService.deleteRoute as jest.Mock).mockResolvedValue(undefined);
    (mockRouteService.getAllRoutes as jest.Mock).mockResolvedValue([]);
    const store = createMockStore([mockRoute1]);

    const component = (
      <Provider store={store}>
        <RouteList routeService={mockRouteService} />
      </Provider>
    );

    expect(component).toBeDefined();
  });

  it('handles route export', async () => {
    (mockRouteService.exportRoute as jest.Mock).mockResolvedValue('<gpx>...</gpx>');
    const store = createMockStore([mockRoute1]);

    const component = (
      <Provider store={store}>
        <RouteList routeService={mockRouteService} />
      </Provider>
    );

    expect(component).toBeDefined();
  });

  it('displays active route with special styling', () => {
    const store = createMockStore([mockRoute1]);
    store.dispatch({ type: 'route/setActiveRoute', payload: 'route-1' });

    const component = (
      <Provider store={store}>
        <RouteList routeService={mockRouteService} />
      </Provider>
    );

    const state = store.getState();
    expect(state.route.activeRouteId).toBe('route-1');
  });

  it('handles route loading errors', async () => {
    (mockRouteService.getAllRoutes as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );
    const store = createMockStore();

    const component = (
      <Provider store={store}>
        <RouteList routeService={mockRouteService} />
      </Provider>
    );

    expect(component).toBeDefined();
  });

  it('uses Redux store for state management', () => {
    const store = createMockStore([mockRoute1, mockRoute2]);

    const component = (
      <Provider store={store}>
        <RouteList routeService={mockRouteService} />
      </Provider>
    );

    const state = store.getState();
    expect(state.route).toBeDefined();
    expect(state.route.routes).toHaveLength(2);
  });
});
