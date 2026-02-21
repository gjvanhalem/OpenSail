import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type ModalType = 
  | 'route-planner'
  | 'waypoint-editor'
  | 'track-list'
  | 'settings'
  | 'instrument-manager'
  | 'logbook'
  | 'ais-details'
  | 'chart-download'
  | null;

export interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeModal: ModalType;
  modalData: unknown;
  fullscreenMode: boolean;
  showInstrumentPanel: boolean;
  showNavigationInfo: boolean;
  showRoutes: boolean;
  showTracks: boolean;
  showAIS: boolean;
  notifications: Array<{
    id: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    timestamp: Date;
    dismissed: boolean;
  }>;
  isLoading: boolean;
  loadingMessage: string | null;
}

const initialState: UIState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  activeModal: null,
  modalData: null,
  fullscreenMode: false,
  showInstrumentPanel: true,
  showNavigationInfo: true,
  showRoutes: true,
  showTracks: true,
  showAIS: true,
  notifications: [],
  isLoading: false,
  loadingMessage: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    openModal: (state, action: PayloadAction<{ type: ModalType; data?: unknown }>) => {
      state.activeModal = action.payload.type;
      state.modalData = action.payload.data ?? null;
    },
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },
    toggleFullscreen: (state) => {
      state.fullscreenMode = !state.fullscreenMode;
    },
    setFullscreen: (state, action: PayloadAction<boolean>) => {
      state.fullscreenMode = action.payload;
    },
    toggleInstrumentPanel: (state) => {
      state.showInstrumentPanel = !state.showInstrumentPanel;
    },
    setShowInstrumentPanel: (state, action: PayloadAction<boolean>) => {
      state.showInstrumentPanel = action.payload;
    },
    toggleNavigationInfo: (state) => {
      state.showNavigationInfo = !state.showNavigationInfo;
    },
    setShowNavigationInfo: (state, action: PayloadAction<boolean>) => {
      state.showNavigationInfo = action.payload;
    },
    toggleRoutes: (state) => {
      state.showRoutes = !state.showRoutes;
    },
    setShowRoutes: (state, action: PayloadAction<boolean>) => {
      state.showRoutes = action.payload;
    },
    toggleTracks: (state) => {
      state.showTracks = !state.showTracks;
    },
    setShowTracks: (state, action: PayloadAction<boolean>) => {
      state.showTracks = action.payload;
    },
    toggleAIS: (state) => {
      state.showAIS = !state.showAIS;
    },
    setShowAIS: (state, action: PayloadAction<boolean>) => {
      state.showAIS = action.payload;
    },
    addNotification: (
      state,
      action: PayloadAction<{
        id: string;
        message: string;
        type: 'info' | 'warning' | 'error' | 'success';
      }>
    ) => {
      state.notifications.push({
        ...action.payload,
        timestamp: new Date(),
        dismissed: false,
      });
    },
    dismissNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification) {
        notification.dismissed = true;
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string }>) => {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message ?? null;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapsed,
  setSidebarCollapsed,
  openModal,
  closeModal,
  toggleFullscreen,
  setFullscreen,
  toggleInstrumentPanel,
  setShowInstrumentPanel,
  toggleNavigationInfo,
  setShowNavigationInfo,
  toggleRoutes,
  setShowRoutes,
  toggleTracks,
  setShowTracks,
  toggleAIS,
  setShowAIS,
  addNotification,
  dismissNotification,
  removeNotification,
  clearNotifications,
  setLoading,
} = uiSlice.actions;

export default uiSlice.reducer;
