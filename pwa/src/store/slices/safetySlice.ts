import { createSlice, type Dispatch, type PayloadAction } from '@reduxjs/toolkit';
import type { Position } from '@/models';
import type { SafetyEvent } from '@/database/db';
import { safetyEventRepository } from '@/database/repositories/SafetyEventRepository';
import { METRES_PER_NM, mobFix } from '@/utils/safety';
import { calculateDistance } from '@/utils/calculations';
import { clearAlarm, raiseAlarm, type AlertsState } from './alertsSlice';

/**
 * Man overboard (R12) and, from the next step, anchor watch (R8). The events
 * go to the safetyEvents table, which is also how an active MOB survives a
 * reload or crash.
 */

export interface MobState {
  /** Session id, shared by this MOB's logged events */
  id: string;
  /** When the button was pressed, ms since epoch */
  activatedAt: number;
  /** The MOB spot; null until the first fix when there was none */
  position: Position | null;
  /** The latest fix was older than STALE_FIX_MS when the button was pressed */
  staleFix: boolean;
}

export interface SafetyState {
  mob: MobState | null;
}

const initialState: SafetyState = { mob: null };

const safetySlice = createSlice({
  name: 'safety',
  initialState,
  reducers: {
    mobActivated: (state, action: PayloadAction<MobState>) => {
      state.mob = action.payload;
    },
    /** The first fix after a MOB that was pressed without one */
    mobPositionFixed: (state, action: PayloadAction<Position>) => {
      if (state.mob && !state.mob.position) state.mob.position = action.payload;
    },
    mobCleared: (state) => {
      state.mob = null;
    },
  },
});

export const { mobActivated, mobPositionFixed, mobCleared } = safetySlice.actions;
export default safetySlice.reducer;

interface StateWithSafety {
  safety: SafetyState;
  navigation: { position: Position | null };
  alerts?: AlertsState;
}

const newSessionId = (prefix: string, now: number) =>
  `${prefix}_${now}_${Math.random().toString(36).slice(2, 8)}`;

/** Write an event without holding up the alarm; a failed write is only logged */
export function logSafetyEvent(event: Omit<SafetyEvent, 'id'>): Promise<void> {
  return safetyEventRepository
    .create(event)
    .then(() => undefined)
    .catch((error) => console.error('Failed to log safety event:', error));
}

const vesselAt = (position: Position | null) => ({
  latitude: position?.latitude ?? null,
  longitude: position?.longitude ?? null,
});

export const MOB_ALARM_MESSAGE = 'MAN OVERBOARD';

/**
 * Man overboard: record the latest fix as the MOB spot right away, sound the
 * alarm and log it. Pressing again while a MOB is active does nothing.
 */
export const activateMob =
  () => (dispatch: Dispatch, getState: () => StateWithSafety) => {
    const state = getState();
    if (state.safety.mob) return;
    const now = Date.now();
    const fix = mobFix(state.navigation.position, now);
    const mob: MobState = {
      id: newSessionId('mob', now),
      activatedAt: now,
      position: fix?.position ?? null,
      staleFix: fix?.stale ?? false,
    };
    dispatch(mobActivated(mob));
    dispatch(raiseAlarm({ kind: 'mob', message: MOB_ALARM_MESSAGE, now }));
    void logSafetyEvent({
      timestamp: new Date(now),
      type: 'mob_activated',
      sessionId: mob.id,
      ...vesselAt(state.navigation.position),
      ...(mob.position && {
        targetLatitude: mob.position.latitude,
        targetLongitude: mob.position.longitude,
      }),
      notes: !fix ? 'No position fix yet' : fix.stale ? 'Position fix was stale' : undefined,
    });
  };

/** Use this fix as the MOB spot when the MOB was pressed without one */
export const fixMobPosition =
  (position: Position) => (dispatch: Dispatch, getState: () => StateWithSafety) => {
    const mob = getState().safety.mob;
    if (!mob || mob.position) return;
    dispatch(mobPositionFixed(position));
    void logSafetyEvent({
      timestamp: new Date(Date.now()),
      type: 'mob_position',
      sessionId: mob.id,
      ...vesselAt(position),
      targetLatitude: position.latitude,
      targetLongitude: position.longitude,
    });
  };

/** End the MOB: stops guidance and the alarm */
export const clearMob = () => (dispatch: Dispatch, getState: () => StateWithSafety) => {
  const state = getState();
  const mob = state.safety.mob;
  if (!mob) return;
  dispatch(mobCleared());
  dispatch(clearAlarm('mob'));
  const position = state.navigation.position;
  void logSafetyEvent({
    timestamp: new Date(Date.now()),
    type: 'mob_cleared',
    sessionId: mob.id,
    ...vesselAt(position),
    ...(mob.position && {
      targetLatitude: mob.position.latitude,
      targetLongitude: mob.position.longitude,
      distance: position ? calculateDistance(position, mob.position) * METRES_PER_NM : undefined,
    }),
  });
};

/** Rebuild a MOB from its logged events (start-up after a reload or crash) */
export function mobFromEvents(events: SafetyEvent[]): MobState | null {
  const start = events.find((e) => e.type === 'mob_activated');
  if (!start) return null;
  const withSpot = events.find(
    (e) => e.targetLatitude !== undefined && e.targetLongitude !== undefined
  );
  return {
    id: start.sessionId,
    activatedAt: start.timestamp.getTime(),
    position: withSpot
      ? {
          latitude: withSpot.targetLatitude!,
          longitude: withSpot.targetLongitude!,
          accuracy: 0,
          timestamp: withSpot.timestamp.getTime(),
        }
      : null,
    staleFix: start.notes === 'Position fix was stale',
  };
}

/**
 * Restore a MOB that was still active when the app closed. Its alarm comes
 * back silenced: the crew knows, and the guidance panel is back on screen.
 */
export const restoreSafety =
  () => async (dispatch: Dispatch, getState: () => StateWithSafety) => {
    try {
      const { mob } = await safetyEventRepository.getActiveSessions();
      const restored = mob && mobFromEvents(mob);
      if (restored && !getState().safety.mob) {
        dispatch(mobActivated(restored));
      }
    } catch (error) {
      console.error('Failed to restore MOB / anchor watch:', error);
    }
  };
