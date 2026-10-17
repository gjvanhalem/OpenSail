import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { InstrumentData } from '@/models';
import { normalizeInstrumentData } from './instrumentNormalization';

export type ConnectionType = 'serial' | 'bluetooth' | 'network' | 'stub';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ProtocolType = 'NMEA0183' | 'NMEA2000' | 'SeaTalk';

export interface InstrumentConnection {
  id: string;
  type: ConnectionType;
  protocol: ProtocolType;
  status: ConnectionStatus;
  name: string;
  lastDataReceived: number | null;
  errorMessage: string | null;
}

export interface InstrumentsState {
  connections: InstrumentConnection[];
  activeConnectionId: string | null;
  dataStreams: Record<string, InstrumentData[]>; // keyed by data type
  depth: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  waterSpeed: number | null;
  waterTemperature: number | null;
  /** Degrees, starboard positive */
  rudderAngle: number | null;
  /** Degrees, starboard down positive */
  heel: number | null;
  /** Degrees, bow up positive */
  pitch: number | null;
  isReceivingData: boolean;
}

const initialState: InstrumentsState = {
  connections: [],
  activeConnectionId: null,
  dataStreams: {},
  depth: null,
  windSpeed: null,
  windDirection: null,
  waterSpeed: null,
  waterTemperature: null,
  rudderAngle: null,
  heel: null,
  pitch: null,
  isReceivingData: false,
};

const instrumentsSlice = createSlice({
  name: 'instruments',
  initialState,
  reducers: {
    addConnection: (state, action: PayloadAction<InstrumentConnection>) => {
      state.connections.push(action.payload);
    },
    updateConnection: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<InstrumentConnection> }>
    ) => {
      const connection = state.connections.find((c) => c.id === action.payload.id);
      if (connection) {
        Object.assign(connection, action.payload.updates);
      }
    },
    removeConnection: (state, action: PayloadAction<string>) => {
      state.connections = state.connections.filter((c) => c.id !== action.payload);
      if (state.activeConnectionId === action.payload) {
        state.activeConnectionId = null;
      }
    },
    setActiveConnection: (state, action: PayloadAction<string | null>) => {
      state.activeConnectionId = action.payload;
    },
    setConnectionStatus: (
      state,
      action: PayloadAction<{ id: string; status: ConnectionStatus; errorMessage?: string }>
    ) => {
      const connection = state.connections.find((c) => c.id === action.payload.id);
      if (connection) {
        connection.status = action.payload.status;
        connection.errorMessage = action.payload.errorMessage ?? null;
      }
    },
    addInstrumentData: (state, action: PayloadAction<InstrumentData>) => {
      const data = action.payload;
      
      // Add to data stream
      if (!state.dataStreams[data.type]) {
        state.dataStreams[data.type] = [];
      }
      state.dataStreams[data.type].push(data);
      
      // Keep only last 100 data points per type
      if (state.dataStreams[data.type].length > 100) {
        state.dataStreams[data.type] = state.dataStreams[data.type].slice(-100);
      }
      
      // Update specific instrument values, in metres / knots / degrees / °C
      const reading = normalizeInstrumentData(data);
      if (reading.depth !== undefined) state.depth = reading.depth;
      if (reading.waterSpeed !== undefined) state.waterSpeed = reading.waterSpeed;
      if (reading.windSpeed !== undefined) state.windSpeed = reading.windSpeed;
      if (reading.windDirection !== undefined) state.windDirection = reading.windDirection;
      if (reading.waterTemperature !== undefined) state.waterTemperature = reading.waterTemperature;
      if (reading.rudderAngle !== undefined) state.rudderAngle = reading.rudderAngle;
      if (reading.heel !== undefined) state.heel = reading.heel;
      if (reading.pitch !== undefined) state.pitch = reading.pitch;
      
      state.isReceivingData = true;
      
      // Update last data received timestamp for the connection
      if (state.activeConnectionId) {
        const connection = state.connections.find((c) => c.id === state.activeConnectionId);
        if (connection) {
          connection.lastDataReceived = Date.now();
        }
      }
    },
    clearDataStreams: (state) => {
      state.dataStreams = {};
    },
    setIsReceivingData: (state, action: PayloadAction<boolean>) => {
      state.isReceivingData = action.payload;
    },
  },
});

export const {
  addConnection,
  updateConnection,
  removeConnection,
  setActiveConnection,
  setConnectionStatus,
  addInstrumentData,
  clearDataStreams,
  setIsReceivingData,
} = instrumentsSlice.actions;

export default instrumentsSlice.reducer;
