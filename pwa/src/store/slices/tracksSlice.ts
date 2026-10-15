import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { TrackPoint, Track as StoredTrack } from '@/database/db';

// Redux state uses uncompressed points for easier access
export interface Track {
  id: string;
  name: string;
  points: TrackPoint[];
  startTime: Date;
  endTime: Date;
  distance: number;
  maxSpeed: number;
  avgSpeed: number;
  color?: string;
}

export interface TracksState {
  tracks: Track[];
  currentTrack: Track | null;
  isRecording: boolean;
  isPaused: boolean;
}

/** A track as saved in the database, with its points unpacked for the store */
export function fromStoredTrack(track: StoredTrack): Track {
  return {
    id: track.id!,
    name: track.name,
    startTime: track.startTime,
    endTime: track.endTime,
    distance: track.distance,
    maxSpeed: track.maxSpeed,
    avgSpeed: track.avgSpeed,
    ...(track.color ? { color: track.color } : {}),
    points: JSON.parse(track.points.data),
  };
}

const initialState: TracksState = {
  tracks: [],
  currentTrack: null,
  isRecording: false,
  isPaused: false,
};

const tracksSlice = createSlice({
  name: 'tracks',
  initialState,
  reducers: {
    startRecording: (state, action: PayloadAction<{ id: string; name: string }>) => {
      state.currentTrack = {
        id: action.payload.id,
        name: action.payload.name,
        points: [],
        startTime: new Date(),
        endTime: new Date(),
        distance: 0,
        maxSpeed: 0,
        avgSpeed: 0,
      };
      state.isRecording = true;
      state.isPaused = false;
    },
    stopRecording: (state) => {
      if (state.currentTrack) {
        state.currentTrack.endTime = new Date();
        state.tracks.push(state.currentTrack);
        state.currentTrack = null;
      }
      state.isRecording = false;
      state.isPaused = false;
    },
    pauseRecording: (state) => {
      state.isPaused = true;
    },
    resumeRecording: (state) => {
      state.isPaused = false;
    },
    addTrackPoint: (state, action: PayloadAction<TrackPoint>) => {
      if (state.currentTrack && state.isRecording && !state.isPaused) {
        state.currentTrack.points.push(action.payload);
        
        // Update max speed
        if (action.payload.speed > state.currentTrack.maxSpeed) {
          state.currentTrack.maxSpeed = action.payload.speed;
        }
        
        // Calculate average speed
        const totalSpeed = state.currentTrack.points.reduce(
          (sum, point) => sum + point.speed,
          0
        );
        state.currentTrack.avgSpeed = totalSpeed / state.currentTrack.points.length;
      }
    },
    addTrack: (state, action: PayloadAction<Track>) => {
      state.tracks.push(action.payload);
    },
    deleteTrack: (state, action: PayloadAction<string>) => {
      state.tracks = state.tracks.filter((t) => t.id !== action.payload);
    },
    setTrackColor: (state, action: PayloadAction<{ id: string; color: string }>) => {
      const track = state.tracks.find((t) => t.id === action.payload.id);
      if (track) track.color = action.payload.color;
    },
    updateTrack: (state, action: PayloadAction<Track>) => {
      const index = state.tracks.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.tracks[index] = action.payload;
      }
    },
    setTracks: (state, action: PayloadAction<Track[]>) => {
      state.tracks = action.payload;
    },
    clearCurrentTrack: (state) => {
      state.currentTrack = null;
      state.isRecording = false;
      state.isPaused = false;
    },
  },
});

export const {
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  addTrackPoint,
  addTrack,
  deleteTrack,
  updateTrack,
  setTrackColor,
  setTracks,
  clearCurrentTrack,
} = tracksSlice.actions;

export default tracksSlice.reducer;
