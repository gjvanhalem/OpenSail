import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { InstrumentData, InstrumentDataType } from '../../types';

export interface InstrumentState {
  connected: boolean;
  stubMode: boolean;
  latestData: Record<InstrumentDataType, InstrumentData | null>;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
}

const initialState: InstrumentState = {
  connected: false,
  stubMode: false,
  latestData: {
    [InstrumentDataType.GPS]: null,
    [InstrumentDataType.Depth]: null,
    [InstrumentDataType.Wind]: null,
    [InstrumentDataType.Speed]: null,
    [InstrumentDataType.Heading]: null,
    [InstrumentDataType.Temperature]: null,
    [InstrumentDataType.AIS]: null,
  },
  connectionStatus: 'disconnected',
  error: null,
};

const instrumentSlice = createSlice({
  name: 'instrument',
  initialState,
  reducers: {
    setConnectionStatus: (
      state,
      action: PayloadAction<InstrumentState['connectionStatus']>
    ) => {
      state.connectionStatus = action.payload;
      state.connected = action.payload === 'connected';
    },
    setStubMode: (state, action: PayloadAction<boolean>) => {
      state.stubMode = action.payload;
    },
    updateInstrumentData: (state, action: PayloadAction<InstrumentData>) => {
      state.latestData[action.payload.type] = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.connectionStatus = 'error';
      }
    },
    clearInstrumentData: (state) => {
      state.latestData = initialState.latestData;
    },
    disconnect: (state) => {
      state.connected = false;
      state.connectionStatus = 'disconnected';
      state.error = null;
    },
  },
});

export const {
  setConnectionStatus,
  setStubMode,
  updateInstrumentData,
  setError,
  clearInstrumentData,
  disconnect,
} = instrumentSlice.actions;

export default instrumentSlice.reducer;
