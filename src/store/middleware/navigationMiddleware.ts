import { Middleware } from '@reduxjs/toolkit';
import { updateInstrumentData } from '../slices/instrumentSlice';
import { setCurrentPosition, setCurrentHeading, setCurrentSpeed } from '../slices/navigationSlice';
import { InstrumentDataType } from '../../types';

/**
 * Middleware that processes instrument data and updates navigation state
 */
export const navigationMiddleware: Middleware =
  (store) => (next) => (action) => {
    const result = next(action);

    // Process instrument data updates
    if (updateInstrumentData.match(action)) {
      const data = action.payload;

      // Update navigation state based on instrument data type
      switch (data.type) {
        case InstrumentDataType.GPS:
          if (typeof data.value === 'object' && data.value !== null) {
            const gpsData = data.value as {
              latitude?: number;
              longitude?: number;
              accuracy?: number;
            };
            if (
              gpsData.latitude !== undefined &&
              gpsData.longitude !== undefined
            ) {
              store.dispatch(
                setCurrentPosition({
                  latitude: gpsData.latitude,
                  longitude: gpsData.longitude,
                  accuracy: gpsData.accuracy || 0,
                  timestamp: data.timestamp,
                })
              );
            }
          }
          break;

        case InstrumentDataType.Heading:
          if (typeof data.value === 'number') {
            store.dispatch(setCurrentHeading(data.value));
          }
          break;

        case InstrumentDataType.Speed:
          if (typeof data.value === 'number') {
            store.dispatch(setCurrentSpeed(data.value));
          }
          break;
      }
    }

    return result;
  };
