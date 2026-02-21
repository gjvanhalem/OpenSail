import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Position } from '@/models';

export interface NavigationState {
  position: Position | null;
  heading: number | null;
  speed: number | null;
  course: number | null;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
  isGPSActive: boolean;
}

const initialState: NavigationState = {
  position: null,
  heading: null,
  speed: null,
  course: null,
  altitude: null,
  accuracy: null,
  timestamp: null,
  isGPSActive: false,
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    updatePosition: (state, action: PayloadAction<Position>) => {
      state.position = action.payload;
      state.timestamp = action.payload.timestamp;
      state.accuracy = action.payload.accuracy;
      state.altitude = action.payload.altitude ?? null;
      state.isGPSActive = true;
    },
    updateHeading: (state, action: PayloadAction<number>) => {
      state.heading = action.payload;
    },
    updateSpeed: (state, action: PayloadAction<number>) => {
      state.speed = action.payload;
    },
    updateCourse: (state, action: PayloadAction<number>) => {
      state.course = action.payload;
    },
    setGPSActive: (state, action: PayloadAction<boolean>) => {
      state.isGPSActive = action.payload;
    },
    resetNavigation: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  updatePosition,
  updateHeading,
  updateSpeed,
  updateCourse,
  setGPSActive,
  resetNavigation,
} = navigationSlice.actions;

export default navigationSlice.reducer;
