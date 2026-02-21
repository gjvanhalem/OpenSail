import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ChartDisplay from './ChartDisplay';
import chartReducer from '../store/slices/chartSlice';
import navigationReducer from '../store/slices/navigationSlice';
import routeReducer from '../store/slices/routeSlice';
import { ChartRotation } from '../types';

// Mock Mapbox
jest.mock('@rnmapbox/maps');
jest.mock('react-native');

describe('ChartDisplay', () => {
  const createMockStore = (initialState = {}) => {
    return configureStore({
      reducer: {
        chart: chartReducer,
        navigation: navigationReducer,
        route: routeReducer,
      },
      preloadedState: {
        chart: {
          zoom: 12,
          rotation: ChartRotation.NorthUp,
          center: null,
          layers: [],
          visibleBounds: null,
          coverage: [],
          availableUpdates: [],
          loading: false,
          cacheSize: 0,
          error: null,
        },
        navigation: {
          currentPosition: {
            latitude: 52.3676,
            longitude: 4.9041,
            accuracy: 10,
            timestamp: Date.now(),
          },
          currentHeading: 45,
          currentSpeed: 5.5,
          isRecordingTrack: false,
          activeTrackId: null,
          currentTrack: null,
          mobMarker: null,
          anchorWatch: null,
          currentVoyage: null,
          isNavigating: false,
          distanceToNextWaypoint: null,
          bearingToNextWaypoint: null,
          eta: null,
          error: null,
        },
        route: {
          routes: [],
          activeRouteId: null,
          activeRoute: null,
          routeValidation: {},
          loading: false,
          error: null,
        },
        ...initialState,
      },
    });
  };

  it('component can be instantiated', () => {
    const store = createMockStore();
    const component = (
      <Provider store={store}>
        <ChartDisplay />
      </Provider>
    );
    expect(component).toBeDefined();
  });

  it('accepts showVesselMarker prop', () => {
    const store = createMockStore();
    const component = (
      <Provider store={store}>
        <ChartDisplay showVesselMarker={true} />
      </Provider>
    );
    expect(component.props.children.props.showVesselMarker).toBe(true);
  });

  it('accepts navigationAids prop', () => {
    const store = createMockStore();
    const navigationAids = [
      {
        id: 'buoy-1',
        type: 'buoy' as const,
        position: [4.9041, 52.3676] as [number, number],
        name: 'Test Buoy',
      },
    ];
    const component = (
      <Provider store={store}>
        <ChartDisplay navigationAids={navigationAids} />
      </Provider>
    );
    expect(component.props.children.props.navigationAids).toEqual(navigationAids);
  });

  it('accepts routes prop', () => {
    const store = createMockStore();
    const routes = [
      {
        id: 'route-1',
        name: 'Test Route',
        waypoints: [],
        totalDistance: 10,
        estimatedDuration: 3600,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const component = (
      <Provider store={store}>
        <ChartDisplay routes={routes} />
      </Provider>
    );
    expect(component.props.children.props.routes).toEqual(routes);
  });

  it('accepts aisTargets prop', () => {
    const store = createMockStore();
    const aisTargets = [
      {
        mmsi: '123456789',
        name: 'Test Vessel',
        callSign: 'TEST',
        position: {
          latitude: 52.3676,
          longitude: 4.9041,
          accuracy: 10,
          timestamp: Date.now(),
        },
        course: 90,
        speed: 10,
        heading: 90,
        vesselType: 70,
        length: 100,
        width: 20,
        lastUpdate: new Date(),
        history: [],
      },
    ];
    const component = (
      <Provider store={store}>
        <ChartDisplay aisTargets={aisTargets} />
      </Provider>
    );
    expect(component.props.children.props.aisTargets).toEqual(aisTargets);
  });

  it('accepts onMapInteraction callback', () => {
    const store = createMockStore();
    const onMapInteraction = jest.fn();
    const component = (
      <Provider store={store}>
        <ChartDisplay onMapInteraction={onMapInteraction} />
      </Provider>
    );
    expect(component.props.children.props.onMapInteraction).toBe(onMapInteraction);
  });

  it('accepts onWaypointPress callback', () => {
    const store = createMockStore();
    const onWaypointPress = jest.fn();
    const component = (
      <Provider store={store}>
        <ChartDisplay onWaypointPress={onWaypointPress} />
      </Provider>
    );
    expect(component.props.children.props.onWaypointPress).toBe(onWaypointPress);
  });

  it('accepts onAISTargetPress callback', () => {
    const store = createMockStore();
    const onAISTargetPress = jest.fn();
    const component = (
      <Provider store={store}>
        <ChartDisplay onAISTargetPress={onAISTargetPress} />
      </Provider>
    );
    expect(component.props.children.props.onAISTargetPress).toBe(onAISTargetPress);
  });

  it('uses Redux state for chart configuration', () => {
    const store = createMockStore();
    const state = store.getState();
    expect(state.chart.zoom).toBe(12);
    expect(state.chart.rotation).toBe(ChartRotation.NorthUp);
  });

  it('uses Redux state for navigation data', () => {
    const store = createMockStore();
    const state = store.getState();
    expect(state.navigation.currentPosition).toBeTruthy();
    expect(state.navigation.currentHeading).toBe(45);
  });
});

