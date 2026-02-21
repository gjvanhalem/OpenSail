import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Route, Waypoint } from '@/models';

export interface RoutesState {
  routes: Route[];
  activeRouteId: string | null;
  activeWaypointIndex: number;
  isNavigating: boolean;
}

const initialState: RoutesState = {
  routes: [],
  activeRouteId: null,
  activeWaypointIndex: 0,
  isNavigating: false,
};

const routesSlice = createSlice({
  name: 'routes',
  initialState,
  reducers: {
    addRoute: (state, action: PayloadAction<Route>) => {
      state.routes.push(action.payload);
    },
    updateRoute: (state, action: PayloadAction<Route>) => {
      const index = state.routes.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.routes[index] = action.payload;
      }
    },
    deleteRoute: (state, action: PayloadAction<string>) => {
      state.routes = state.routes.filter((r) => r.id !== action.payload);
      if (state.activeRouteId === action.payload) {
        state.activeRouteId = null;
        state.isNavigating = false;
        state.activeWaypointIndex = 0;
      }
    },
    setActiveRoute: (state, action: PayloadAction<string | null>) => {
      state.activeRouteId = action.payload;
      state.activeWaypointIndex = 0;
    },
    startNavigation: (state, action: PayloadAction<string>) => {
      state.activeRouteId = action.payload;
      state.activeWaypointIndex = 0;
      state.isNavigating = true;
    },
    stopNavigation: (state) => {
      state.isNavigating = false;
      state.activeWaypointIndex = 0;
    },
    advanceToNextWaypoint: (state) => {
      const activeRoute = state.routes.find((r) => r.id === state.activeRouteId);
      if (activeRoute && state.activeWaypointIndex < activeRoute.waypoints.length - 1) {
        state.activeWaypointIndex += 1;
      } else {
        // Reached end of route
        state.isNavigating = false;
      }
    },
    setActiveWaypointIndex: (state, action: PayloadAction<number>) => {
      state.activeWaypointIndex = action.payload;
    },
    addWaypointToRoute: (
      state,
      action: PayloadAction<{ routeId: string; waypoint: Waypoint }>
    ) => {
      const route = state.routes.find((r) => r.id === action.payload.routeId);
      if (route) {
        route.waypoints.push(action.payload.waypoint);
      }
    },
    removeWaypointFromRoute: (
      state,
      action: PayloadAction<{ routeId: string; waypointId: string }>
    ) => {
      const route = state.routes.find((r) => r.id === action.payload.routeId);
      if (route) {
        route.waypoints = route.waypoints.filter(
          (w) => w.id !== action.payload.waypointId
        );
      }
    },
    setRoutes: (state, action: PayloadAction<Route[]>) => {
      state.routes = action.payload;
    },
  },
});

export const {
  addRoute,
  updateRoute,
  deleteRoute,
  setActiveRoute,
  startNavigation,
  stopNavigation,
  advanceToNextWaypoint,
  setActiveWaypointIndex,
  addWaypointToRoute,
  removeWaypointFromRoute,
  setRoutes,
} = routesSlice.actions;

export default routesSlice.reducer;
