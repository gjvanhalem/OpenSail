import { Middleware } from '@reduxjs/toolkit';
import { updateTarget, setNearbyTargets } from '../slices/aisSlice';
import { setCurrentPosition } from '../slices/navigationSlice';
import { AISTarget, Position } from '../../types';

/**
 * Middleware that processes AIS targets and identifies nearby vessels
 */
export const aisMiddleware: Middleware =
  (store) => (next) => (action) => {
    const result = next(action);

    // When a target is updated or position changes, recalculate nearby targets
    if (updateTarget.match(action) || setCurrentPosition.match(action)) {
      const state = store.getState();
      const currentPosition = state.navigation.currentPosition;
      const targets = state.ais.targets;

      if (currentPosition) {
        // Calculate distance to each target and identify nearby ones (within 2nm)
        const nearbyMMSIs: string[] = [];
        const NEARBY_THRESHOLD = 2; // nautical miles

        Object.values(targets).forEach((target) => {
          const aisTarget = target as AISTarget;
          const distance = calculateDistance(
            currentPosition,
            aisTarget.position
          );

          if (distance <= NEARBY_THRESHOLD) {
            nearbyMMSIs.push(aisTarget.mmsi);
          }
        });

        // Update nearby targets if changed
        const currentNearby = state.ais.nearbyTargets;
        if (
          nearbyMMSIs.length !== currentNearby.length ||
          !nearbyMMSIs.every((mmsi) => currentNearby.includes(mmsi))
        ) {
          store.dispatch(setNearbyTargets(nearbyMMSIs));
        }
      }
    }

    return result;
  };

/**
 * Calculate distance between two positions in nautical miles
 */
function calculateDistance(
  pos1: { latitude: number; longitude: number },
  pos2: { latitude: number; longitude: number }
): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = toRad(pos2.latitude - pos1.latitude);
  const dLon = toRad(pos2.longitude - pos1.longitude);
  const lat1 = toRad(pos1.latitude);
  const lat2 = toRad(pos2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
