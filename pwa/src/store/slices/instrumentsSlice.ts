import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { InstrumentData } from '@/models';

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
      
      // Update specific instrument values
      switch (data.type) {
        case 'depth':
          state.depth = data.value as number;
          break;
        case 'wind':
          if (typeof data.value === 'object' && data.value !== null) {
            const windData = data.value as { speed: number; direction: number };
            state.windSpeed = windData.speed;
            state.windDirection = windData.direction;
          }
          break;
        case 'speed':
          state.waterSpeed = data.value as number;
          break;
        case 'temperature':
          state.waterTemperature = data.value as number;
          break;
      }
      
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
