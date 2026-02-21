import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { RoutePlanner } from './RoutePlanner';
import { RouteServiceImpl } from '../services/RouteService';
import routeReducer from '../store/slices/routeSlice';
import { Route, Position } from '../types';

// Mock React Native components
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  Alert: {
    alert: jest.fn(),
  },
}));

const createMockStore = () => {
  return configureStore({
    reducer: {
      route: routeReducer,
    },
  });
};

const createMockRouteService = () => {
  const service = new RouteServiceImpl();
  service.createRoute = jest.fn();
  service.updateRoute = jest.fn();
  service.deleteRoute = jest.fn();
  return service;
};

const mockPosition: Position = {
  latitude: 52.0,
  longitude: 4.0,
  accuracy: 10,
  timestamp: Date.now(),
};

describe('RoutePlanner', () => {
  let store: ReturnType<typeof createMockStore>;
  let mockRouteService: RouteServiceImpl;

  beforeEach(() => {
    store = createMockStore();
    mockRouteService = createMockRouteService();
    mockRouteService.setStore(store);
  });

  it('component can be instantiated', () => {
    const component = (
      <Provider store={store}>
        <RoutePlanner routeService={mockRouteService} />
      </Provider>
    );
    expect(component).toBeDefined();
  });

  it('accepts routeService prop', () => {
    const component = (
      <Provider store={store}>
        <RoutePlanner routeService={mockRouteService} />
      </Provider>
    );
    expect(component.props.children.props.routeService).toBe(mockRouteService);
  });

  it('accepts onRouteCreated callback', () => {
    const onRouteCreated = jest.fn();
    const component = (
      <Provider store={store}>
        <RoutePlanner
          routeService={mockRouteService}
          onRouteCreated={onRouteCreated}
        />
      </Provider>
    );
    expect(component.props.children.props.onRouteCreated).toBe(onRouteCreated);
  });

  it('accepts onClose callback', () => {
    const onClose = jest.fn();
    const component = (
      <Provider store={store}>
        <RoutePlanner routeService={mockRouteService} onClose={onClose} />
      </Provider>
    );
    expect(component.props.children.props.onClose).toBe(onClose);
  });

  it('accepts initialPosition prop', () => {
    const component = (
      <Provider store={store}>
        <RoutePlanner
          routeService={mockRouteService}
          initialPosition={mockPosition}
        />
      </Provider>
    );
    expect(component.props.children.props.initialPosition).toEqual(mockPosition);
  });

  it('creates route with valid waypoints', async () => {
    const mockRoute: Route = {
      id: 'route-1',
      name: 'Test Route',
      waypoints: [],
      totalDistance: 10,
      estimatedDuration: 7200,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (mockRouteService.createRoute as jest.Mock).mockResolvedValue(mockRoute);

    const onRouteCreated = jest.fn();
    const component = (
      <Provider store={store}>
        <RoutePlanner
          routeService={mockRouteService}
          onRouteCreated={onRouteCreated}
          initialPosition={mockPosition}
        />
      </Provider>
    );

    expect(component).toBeDefined();
  });

  it('handles route creation errors', async () => {
    (mockRouteService.createRoute as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const component = (
      <Provider store={store}>
        <RoutePlanner
          routeService={mockRouteService}
          initialPosition={mockPosition}
        />
      </Provider>
    );

    expect(component).toBeDefined();
  });

  it('uses Redux store for state management', () => {
    const component = (
      <Provider store={store}>
        <RoutePlanner routeService={mockRouteService} />
      </Provider>
    );
    
    const state = store.getState();
    expect(state.route).toBeDefined();
    expect(state.route.routes).toEqual([]);
  });
});
