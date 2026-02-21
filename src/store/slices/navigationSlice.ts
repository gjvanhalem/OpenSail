import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  Position,
  Track,
  MOBMarker,
  AnchorWatch,
  Voyage,
} from '../../types';

export interface NavigationState {
  currentPosition: Position | null;
  currentHeading: number | null;
  currentSpeed: number | null;
  isRecordingTrack: boolean;
  activeTrackId: string | null;
  currentTrack: Track | null;
  mobMarker: MOBMarker | null;
  anchorWatch: AnchorWatch | null;
  currentVoyage: Voyage | null;
  isNavigating: boolean;
  distanceToNextWaypoint: number | null;
  bearingToNextWaypoint: number | null;
  eta: Date | null;
  error: string | null;
}

const initialState: NavigationState = {
  currentPosition: null,
  currentHeading: null,
  currentSpeed: null,
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
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setCurrentPosition: (state, action: PayloadAction<Position>) => {
      state.currentPosition = action.payload;
    },
    setCurrentHeading: (state, action: PayloadAction<number | null>) => {
      state.currentHeading = action.payload;
    },
    setCurrentSpeed: (state, action: PayloadAction<number | null>) => {
      state.currentSpeed = action.payload;
    },
    startTrackRecording: (
      state,
      action: PayloadAction<{ trackId: string; track: Track }>
    ) => {
      state.isRecordingTrack = true;
      state.activeTrackId = action.payload.trackId;
      state.currentTrack = action.payload.track;
    },
    stopTrackRecording: (state) => {
      state.isRecordingTrack = false;
      state.activeTrackId = null;
      state.currentTrack = null;
    },
    updateCurrentTrack: (state, action: PayloadAction<Track>) => {
      state.currentTrack = action.payload;
    },
    setMOBMarker: (state, action: PayloadAction<MOBMarker | null>) => {
      state.mobMarker = action.payload;
    },
    setAnchorWatch: (state, action: PayloadAction<AnchorWatch | null>) => {
      state.anchorWatch = action.payload;
    },
    updateAnchorWatch: (state, action: PayloadAction<Partial<AnchorWatch>>) => {
      if (state.anchorWatch) {
        state.anchorWatch = { ...state.anchorWatch, ...action.payload };
      }
    },
    startVoyage: (state, action: PayloadAction<Voyage>) => {
      state.currentVoyage = action.payload;
    },
    endVoyage: (state) => {
      state.currentVoyage = null;
    },
    updateVoyage: (state, action: PayloadAction<Partial<Voyage>>) => {
      if (state.currentVoyage) {
        state.currentVoyage = { ...state.currentVoyage, ...action.payload };
      }
    },
    setIsNavigating: (state, action: PayloadAction<boolean>) => {
      state.isNavigating = action.payload;
    },
    setNavigationData: (
      state,
      action: PayloadAction<{
        distanceToNextWaypoint: number | null;
        bearingToNextWaypoint: number | null;
        eta: Date | null;
      }>
    ) => {
      state.distanceToNextWaypoint = action.payload.distanceToNextWaypoint;
      state.bearingToNextWaypoint = action.payload.bearingToNextWaypoint;
      state.eta = action.payload.eta;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearNavigation: (state) => {
      state.isNavigating = false;
      state.distanceToNextWaypoint = null;
      state.bearingToNextWaypoint = null;
      state.eta = null;
    },
  },
});

export const {
  setCurrentPosition,
  setCurrentHeading,
  setCurrentSpeed,
  startTrackRecording,
  stopTrackRecording,
  updateCurrentTrack,
  setMOBMarker,
  setAnchorWatch,
  updateAnchorWatch,
  startVoyage,
  endVoyage,
  updateVoyage,
  setIsNavigating,
  setNavigationData,
  setError,
  clearNavigation,
} = navigationSlice.actions;

export default navigationSlice.reducer;
