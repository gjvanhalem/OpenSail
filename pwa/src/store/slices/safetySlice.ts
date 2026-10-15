import { createSlice, type Dispatch, type PayloadAction } from '@reduxjs/toolkit';
import type { Position } from '@/models';
import type { SafetyEvent, SafetyEventType } from '@/database/db';
import { safetyEventRepository } from '@/database/repositories/SafetyEventRepository';
import {
  METRES_PER_NM,
  checkAnchor,
  clampAnchorRadius,
  initialAnchorCheck,
  mobFix,
  type AnchorWatchCheck,
  type AnchorWatchEvent,
} from '@/utils/safety';
import { calculateDistance } from '@/utils/calculations';
import { clearAlarm, raiseAlarm, type AlertsState } from './alertsSlice';

/**
 * Man overboard (R12) and anchor watch (R8). The events go to the
 * safetyEvents table, which is also how an active MOB or anchor watch
 * survives a reload or crash.
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

/** One line of the anchor watch log shown in the panel */
export interface AnchorLogEntry {
  time: number;
  type: SafetyEventType;
  distanceM?: number;
  radiusM?: number;
}

/** Entries kept in the panel's log; the database keeps them all */
export const ANCHOR_LOG_LENGTH = 20;

export interface AnchorWatchState extends AnchorWatchCheck {
  /** Session id, shared by this watch's logged events */
  id: string;
  /** Where the anchor was dropped: the boat's position at that moment */
  anchor: Position;
  radiusM: number;
  droppedAt: number;
  /** Newest first */
  log: AnchorLogEntry[];
}

export interface SafetyState {
  mob: MobState | null;
  anchor: AnchorWatchState | null;
  /** The anchor watch panel is expanded */
  anchorPanelOpen: boolean;
}

const initialState: SafetyState = { mob: null, anchor: null, anchorPanelOpen: false };

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
    anchorDropped: (state, action: PayloadAction<AnchorWatchState>) => {
      state.anchor = action.payload;
    },
    anchorChecked: (state, action: PayloadAction<AnchorWatchCheck>) => {
      if (state.anchor) Object.assign(state.anchor, action.payload);
    },
    anchorRadiusSet: (state, action: PayloadAction<number>) => {
      if (state.anchor) state.anchor.radiusM = action.payload;
    },
    anchorLogged: (state, action: PayloadAction<AnchorLogEntry>) => {
      if (!state.anchor) return;
      state.anchor.log.unshift(action.payload);
      state.anchor.log.length = Math.min(state.anchor.log.length, ANCHOR_LOG_LENGTH);
    },
    anchorRaised: (state) => {
      state.anchor = null;
    },
    setAnchorPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.anchorPanelOpen = action.payload;
    },
  },
});

export const {
  mobActivated,
  mobPositionFixed,
  mobCleared,
  anchorDropped,
  anchorChecked,
  anchorRadiusSet,
  anchorLogged,
  anchorRaised,
  setAnchorPanelOpen,
} = safetySlice.actions;
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

// --- Anchor watch ---------------------------------------------------------

const ANCHOR_EVENT_TYPES: Record<AnchorWatchEvent, SafetyEventType> = {
  drag: 'anchor_drag_alarm',
  back_inside: 'anchor_back_inside',
  gps_lost: 'anchor_gps_lost',
  gps_restored: 'anchor_gps_restored',
};

const metres = (m: number) => `${Math.round(m)} m`;

/** Log an anchor watch event to the database and the panel's log */
function logAnchorEvent(
  dispatch: Dispatch,
  watch: { id: string; anchor: Position; radiusM: number },
  type: SafetyEventType,
  position: Position | null,
  distanceM: number | null,
  now: number
) {
  dispatch(
    anchorLogged({ time: now, type, distanceM: distanceM ?? undefined, radiusM: watch.radiusM })
  );
  void logSafetyEvent({
    timestamp: new Date(now),
    type,
    sessionId: watch.id,
    ...vesselAt(position),
    targetLatitude: watch.anchor.latitude,
    targetLongitude: watch.anchor.longitude,
    radius: watch.radiusM,
    ...(distanceM !== null && { distance: distanceM }),
  });
}

/**
 * Drop anchor: start the watch with the boat's current position as the
 * anchor and `radiusM` (clamped to 10–500 m) as the circle. Needs a fix.
 */
export const dropAnchor =
  (radiusM: number) => (dispatch: Dispatch, getState: () => StateWithSafety) => {
    const position = getState().navigation.position;
    if (!position) return;
    const now = Date.now();
    const watch: AnchorWatchState = {
      ...initialAnchorCheck(now),
      id: newSessionId('anchor', now),
      anchor: { ...position },
      radiusM: clampAnchorRadius(radiusM),
      droppedAt: now,
      log: [],
    };
    dispatch(clearAlarm('anchorDrag'));
    dispatch(clearAlarm('anchorGpsLost'));
    dispatch(anchorDropped(watch));
    logAnchorEvent(dispatch, watch, 'anchor_dropped', position, 0, now);
  };

/** Change the circle while the watch runs */
export const setAnchorRadius =
  (radiusM: number) => (dispatch: Dispatch, getState: () => StateWithSafety) => {
    const watch = getState().safety.anchor;
    const radius = clampAnchorRadius(radiusM);
    if (!watch || watch.radiusM === radius) return;
    dispatch(anchorRadiusSet(radius));
    logAnchorEvent(
      dispatch,
      { ...watch, radiusM: radius },
      'anchor_radius_changed',
      getState().navigation.position,
      watch.distanceM,
      Date.now()
    );
  };

/** End the watch, and its alarms */
export const raiseAnchor = () => (dispatch: Dispatch, getState: () => StateWithSafety) => {
  const watch = getState().safety.anchor;
  if (!watch) return;
  logAnchorEvent(
    dispatch,
    watch,
    'anchor_raised',
    getState().navigation.position,
    watch.distanceM,
    Date.now()
  );
  dispatch(anchorRaised());
  dispatch(clearAlarm('anchorDrag'));
  dispatch(clearAlarm('anchorGpsLost'));
};

type AnchorAlarmKind = 'anchorDrag' | 'anchorGpsLost';

/**
 * Sound an alarm whose cause just started. A silenced alarm of the same kind
 * is cleared first, so a new drag always sounds again.
 */
function soundAlarm(dispatch: Dispatch, kind: AnchorAlarmKind, message: string, now: number) {
  dispatch(clearAlarm(kind));
  dispatch(raiseAlarm({ kind, message, now }));
}

/**
 * The cause of an alarm went away. A silenced alarm goes; one still sounding
 * keeps sounding until someone silences it, so a short drag is not missed.
 */
function causeEnded(
  dispatch: Dispatch,
  alerts: AlertsState | undefined,
  kind: AnchorAlarmKind,
  message: string,
  now: number
) {
  const alarm = alerts?.alarms[kind];
  if (!alarm) return;
  if (alarm.acknowledged) dispatch(clearAlarm(kind));
  else dispatch(raiseAlarm({ kind, message, now }));
}

/**
 * Check the anchor against the latest fix (R8.2, R8.5). Run for every new fix
 * and on a timer of at most ANCHOR_CHECK_INTERVAL_MS, which also notices a
 * GPS that went quiet.
 */
export const runAnchorCheck =
  (now: number) => (dispatch: Dispatch, getState: () => StateWithSafety) => {
    const state = getState();
    const watch = state.safety.anchor;
    if (!watch) return;
    const position = state.navigation.position;
    const { check, events } = checkAnchor(watch, watch, position, now);
    dispatch(anchorChecked(check));

    for (const event of events) {
      logAnchorEvent(dispatch, watch, ANCHOR_EVENT_TYPES[event], position, check.distanceM, now);
      const distance = metres(check.distanceM ?? 0);
      const alerts = getState().alerts;
      switch (event) {
        case 'drag':
          soundAlarm(
            dispatch,
            'anchorDrag',
            `ANCHOR DRAGGING: ${distance} from the anchor (circle ${metres(watch.radiusM)})`,
            now
          );
          break;
        case 'back_inside':
          causeEnded(
            dispatch,
            alerts,
            'anchorDrag',
            `Anchor dragged, now back inside the circle (${distance})`,
            now
          );
          break;
        case 'gps_lost':
          soundAlarm(dispatch, 'anchorGpsLost', 'ANCHOR WATCH: no usable position for over a minute', now);
          break;
        case 'gps_restored':
          causeEnded(dispatch, alerts, 'anchorGpsLost', 'Anchor watch: position is back', now);
          break;
      }
    }
  };

/** Rebuild an anchor watch from its logged events (start-up after a reload or crash) */
export function anchorFromEvents(events: SafetyEvent[], now: number): AnchorWatchState | null {
  const start = events.find((e) => e.type === 'anchor_dropped');
  if (!start || start.targetLatitude === undefined || start.targetLongitude === undefined) {
    return null;
  }
  const radius = [...events].reverse().find((e) => e.radius !== undefined)?.radius;
  return {
    ...initialAnchorCheck(now),
    id: start.sessionId,
    anchor: {
      latitude: start.targetLatitude,
      longitude: start.targetLongitude,
      accuracy: 0,
      timestamp: start.timestamp.getTime(),
    },
    radiusM: clampAnchorRadius(radius ?? 50),
    droppedAt: start.timestamp.getTime(),
    maxDistanceM: Math.max(0, ...events.map((e) => e.distance ?? 0)),
    log: events
      .slice(-ANCHOR_LOG_LENGTH)
      .reverse()
      .map((e) => ({
        time: e.timestamp.getTime(),
        type: e.type,
        distanceM: e.distance,
        radiusM: e.radius,
      })),
  };
}

/**
 * Restore a MOB and an anchor watch that were still active when the app
 * closed. Their alarms come back silent; the anchor watch checks again with
 * the next fix, and a MOB's guidance panel is back on screen.
 */
export const restoreSafety =
  () => async (dispatch: Dispatch, getState: () => StateWithSafety) => {
    try {
      const { mob, anchor } = await safetyEventRepository.getActiveSessions();
      const restoredMob = mob && mobFromEvents(mob);
      if (restoredMob && !getState().safety.mob) {
        dispatch(mobActivated(restoredMob));
      }
      const restoredAnchor = anchor && anchorFromEvents(anchor, Date.now());
      if (restoredAnchor && !getState().safety.anchor) {
        dispatch(anchorDropped(restoredAnchor));
      }
    } catch (error) {
      console.error('Failed to restore MOB / anchor watch:', error);
    }
  };
