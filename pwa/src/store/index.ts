import { configureStore } from '@reduxjs/toolkit';
import navigationReducer from './slices/navigationSlice';
import routesReducer from './slices/routesSlice';
import tracksReducer from './slices/tracksSlice';
import aisReducer from './slices/aisSlice';
import instrumentsReducer from './slices/instrumentsSlice';
import uiReducer from './slices/uiSlice';
import chartCacheReducer from './slices/chartCacheSlice';
import settingsReducer from './slices/settingsSlice';
import notificationsReducer from './slices/notificationsSlice';
import alertsReducer from './slices/alertsSlice';
import safetyReducer from './slices/safetySlice';

export const store = configureStore({
  reducer: {
    navigation: navigationReducer,
    routes: routesReducer,
    tracks: tracksReducer,
    ais: aisReducer,
    instruments: instrumentsReducer,
    ui: uiReducer,
    chartCache: chartCacheReducer,
    settings: settingsReducer,
    notifications: notificationsReducer,
    alerts: alertsReducer,
    safety: safetyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for Date objects
        ignoredActions: [
          'navigation/updatePosition',
          'tracks/addTrackPoint',
          'ais/updateTarget',
          'notifications/addNotification',
          'notifications/showInfo',
          'notifications/showWarning',
          'notifications/showError',
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp', 'payload.lastUpdate', 'payload.action.onClick'],
        // Ignore these paths in the state
        ignoredPaths: [
          'navigation.timestamp',
          'tracks.currentTrack.points',
          'ais.targets',
          'notifications.notifications',
        ],
      },
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export typed hooks
export { useAppDispatch, useAppSelector } from './hooks';
