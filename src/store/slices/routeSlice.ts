import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Route, RouteValidation } from '../../types';

export interface RouteState {
  routes: Route[];
  activeRouteId: string | null;
  activeRoute: Route | null;
  routeValidation: Record<string, RouteValidation>;
  loading: boolean;
  error: string | null;
}

const initialState: RouteState = {
  routes: [],
  activeRouteId: null,
  activeRoute: null,
  routeValidation: {},
  loading: false,
  error: null,
};

const routeSlice = createSlice({
  name: 'route',
  initialState,
  reducers: {
    setRoutes: (state, action: PayloadAction<Route[]>) => {
      state.routes = action.payload;
    },
    addRoute: (state, action: PayloadAction<Route>) => {
      state.routes.push(action.payload);
    },
    updateRoute: (state, action: PayloadAction<Route>) => {
      const index = state.routes.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.routes[index] = action.payload;
      }
      if (state.activeRouteId === action.payload.id) {
        state.activeRoute = action.payload;
      }
    },
    removeRoute: (state, action: PayloadAction<string>) => {
      state.routes = state.routes.filter((r) => r.id !== action.payload);
      if (state.activeRouteId === action.payload) {
        state.activeRouteId = null;
        state.activeRoute = null;
      }
      delete state.routeValidation[action.payload];
    },
    setActiveRoute: (state, action: PayloadAction<string | null>) => {
      state.activeRouteId = action.payload;
      state.activeRoute =
        state.routes.find((r) => r.id === action.payload) || null;
    },
    setRouteValidation: (
      state,
      action: PayloadAction<{ routeId: string; validation: RouteValidation }>
    ) => {
      state.routeValidation[action.payload.routeId] = action.payload.validation;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearRoutes: (state) => {
      state.routes = [];
      state.activeRouteId = null;
      state.activeRoute = null;
      state.routeValidation = {};
    },
  },
});

export const {
  setRoutes,
  addRoute,
  updateRoute,
  removeRoute,
  setActiveRoute,
  setRouteValidation,
  setLoading,
  setError,
  clearRoutes,
} = routeSlice.actions;

export default routeSlice.reducer;
