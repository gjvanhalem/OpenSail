import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import navigationReducer, { updatePosition, updateSpeed } from '@/store/slices/navigationSlice';
import routesReducer, { addRoute, advanceToNextWaypoint, startNavigation } from '@/store/slices/routesSlice';
import settingsReducer from '@/store/slices/settingsSlice';
import type { Position, Route } from '@/models';
import { calculateDestination } from '@/utils/calculations';
import { NavigationStatus } from '../NavigationStatus';

const pos = (latitude: number, longitude: number, timestamp = 0): Position => ({
  latitude,
  longitude,
  accuracy: 0,
  timestamp,
});

const route: Route = {
  id: 'r1',
  name: 'North',
  waypoints: [pos(50, -5), pos(51, -5)].map((position, i) => ({
    id: `w${i}`,
    name: `W${i + 1}`,
    position,
    arrivalRadius: 0.1,
  })),
  totalDistance: 60,
  estimatedDuration: 10,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

function setup() {
  const store = configureStore({
    reducer: { navigation: navigationReducer, routes: routesReducer, settings: settingsReducer },
    middleware: (gdm) => gdm({ serializableCheck: false }),
  });
  store.dispatch(addRoute(route));
  render(
    <Provider store={store}>
      <NavigationStatus />
    </Provider>
  );
  return store;
}

const NOON = new Date(2026, 9, 15, 12, 0, 0).getTime();

describe('NavigationStatus', () => {
  it('shows nothing until a route is navigated', () => {
    setup();
    expect(screen.queryByRole('region', { name: 'Route guidance' })).toBeNull();
  });

  it('shows bearing, distance, XTE and ETA to the next waypoint', async () => {
    const store = setup();
    store.dispatch(startNavigation('r1', pos(50, -5)));
    store.dispatch(advanceToNextWaypoint());
    // Halfway up the leg, 0.5 nm to starboard of it, at 6 kn
    store.dispatch(updatePosition({ ...calculateDestination(pos(50.5, -5), 90, 0.5), timestamp: NOON }));
    store.dispatch(updateSpeed(6));

    expect(await screen.findByTestId('guidance-waypoint')).toHaveTextContent('To 2/2: W2');
    expect(screen.getByTestId('guidance-bearing')).toHaveTextContent('359°');
    expect(screen.getByTestId('guidance-xte')).toHaveTextContent('0.50 nm R');
    expect(screen.getByTestId('guidance-distance')).toHaveTextContent('30.02 nm');
    // 30.02 nm at 6 kn
    expect(screen.getByTestId('guidance-eta-waypoint')).toHaveTextContent('17:00 (in 5h 0m)');
  });

  it('says when the route is finished', async () => {
    const store = setup();
    store.dispatch(startNavigation('r1', null));
    store.dispatch(advanceToNextWaypoint());
    store.dispatch(advanceToNextWaypoint());
    expect(await screen.findByText('Arrived')).toBeInTheDocument();
    expect(screen.getByText('End of route North')).toBeInTheDocument();
  });
});
