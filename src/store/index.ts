import { configureStore } from '@reduxjs/toolkit';
import instrumentReducer from './slices/instrumentSlice';
import routeReducer from './slices/routeSlice';
import aisReducer from './slices/aisSlice';
import chartReducer from './slices/chartSlice';
import navigationReducer from './slices/navigationSlice';
import settingsReducer from './slices/settingsSlice';
import { navigationMiddleware } from './middleware/navigationMiddleware';
import { aisMiddleware } from './middleware/aisMiddleware';

export const store = configureStore({
  reducer: {
    instrument: instrumentReducer,
    route: routeReducer,
    ais: aisReducer,
    chart: chartReducer,
    navigation: navigationReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'instrument/updateInstrumentData',
          'navigation/setCurrentPosition',
          'navigation/setNavigationData',
          'ais/updateTarget',
          'ais/updateTargets',
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp', 'payload.lastUpdate'],
        // Ignore these paths in the state
        ignoredPaths: [
          'instrument.latestData',
          'navigation.currentPosition',
          'navigation.eta',
          'ais.targets',
        ],
      },
    })
      .concat(navigationMiddleware)
      .concat(aisMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
