import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ErrorSeverity } from '../../services/ErrorHandler';

export interface Notification {
  id: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  duration?: number; // Auto-dismiss after duration (ms), undefined = manual dismiss
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationsState {
  notifications: Notification[];
  maxNotifications: number;
}

const initialState: NotificationsState = {
  notifications: [],
  maxNotifications: 5,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notification-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
      };
      
      state.notifications.push(notification);
      
      // Keep only the most recent notifications
      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(-state.maxNotifications);
      }
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    // Convenience actions for different severity levels
    showInfo: (state, action: PayloadAction<string>) => {
      const notification: Notification = {
        id: `notification-${Date.now()}-${Math.random()}`,
        message: action.payload,
        severity: 'info',
        timestamp: new Date(),
        duration: 3000,
      };
      state.notifications.push(notification);
      
      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(-state.maxNotifications);
      }
    },
    
    showWarning: (state, action: PayloadAction<string>) => {
      const notification: Notification = {
        id: `notification-${Date.now()}-${Math.random()}`,
        message: action.payload,
        severity: 'warning',
        timestamp: new Date(),
        duration: 5000,
      };
      state.notifications.push(notification);
      
      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(-state.maxNotifications);
      }
    },
    
    showError: (state, action: PayloadAction<string>) => {
      const notification: Notification = {
        id: `notification-${Date.now()}-${Math.random()}`,
        message: action.payload,
        severity: 'error',
        timestamp: new Date(),
        duration: 7000,
      };
      state.notifications.push(notification);
      
      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(-state.maxNotifications);
      }
    },
  },
});

export const {
  addNotification,
  removeNotification,
  clearNotifications,
  showInfo,
  showWarning,
  showError,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
