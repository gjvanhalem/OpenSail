import { createSlice } from '@reduxjs/toolkit';
import type { Dispatch, PayloadAction } from '@reduxjs/toolkit';
import type { Position } from '@/models';
import type { NavigationReading } from './navigationNormalization';

/** Where a navigation value comes from */
export type NavigationSource = 'gps' | 'instrument';

/** Which source to use for a value; auto prefers instruments while they report it */
export type NavigationSourceChoice = 'auto' | NavigationSource;

/** The values that can each come from their own source */
export type NavigationValue = 'position' | 'cogSog' | 'heading';

export type NavigationSourceChoices = Record<NavigationValue, NavigationSourceChoice>;

/** In auto mode, fall back to GPS when the instruments have not reported a value for this long */
export const INSTRUMENT_STALE_MS = 5000;

export interface NavigationState {
  position: Position | null;
  heading: number | null;
  /** Speed over ground, knots */
  speed: number | null;
  /** Course over ground, degrees true */
  course: number | null;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
  isGPSActive: boolean;
  /** The source each value currently comes from */
  sources: Record<NavigationValue, NavigationSource | null>;
  /** When each source last reported each value (ms since epoch) */
  lastSeen: Record<NavigationValue, Record<NavigationSource, number | null>>;
}

const neverSeen = () => ({ gps: null, instrument: null });

const initialState: NavigationState = {
  position: null,
  heading: null,
  speed: null,
  course: null,
  altitude: null,
  accuracy: null,
  timestamp: null,
  isGPSActive: false,
  sources: { position: null, cogSog: null, heading: null },
  lastSeen: { position: neverSeen(), cogSog: neverSeen(), heading: neverSeen() },
};

/**
 * Whether a reading from `source` should set a value, given the user's choice
 * and when the instruments last reported that value.
 */
export function acceptsSource(
  choice: NavigationSourceChoice,
  source: NavigationSource,
  instrumentLastSeen: number | null,
  now: number
): boolean {
  if (choice !== 'auto') return choice === source;
  if (source === 'instrument') return true;
  return instrumentLastSeen === null || now - instrumentLastSeen > INSTRUMENT_STALE_MS;
}

export interface NavigationReadingPayload {
  source: NavigationSource;
  reading: NavigationReading;
  choices: NavigationSourceChoices;
  now: number;
}

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
    /**
     * A reading from GPS or an instrument. Each value it carries is applied
     * only when the source choice for that value accepts this source.
     */
    navigationReading: (state, action: PayloadAction<NavigationReadingPayload>) => {
      const { source, reading, choices, now } = action.payload;
      const accepts = (value: NavigationValue) => {
        state.lastSeen[value][source] = now;
        if (!acceptsSource(choices[value], source, state.lastSeen[value].instrument, now)) {
          return false;
        }
        state.sources[value] = source;
        return true;
      };

      if (reading.position && accepts('position')) {
        const position = reading.position;
        state.position = position;
        state.timestamp = position.timestamp;
        state.accuracy = position.accuracy;
        state.altitude = position.altitude ?? null;
        state.isGPSActive = true;
      }

      if (
        (reading.course !== undefined || reading.speedOverGround !== undefined) &&
        accepts('cogSog')
      ) {
        if (reading.course !== undefined) state.course = reading.course;
        if (reading.speedOverGround !== undefined) state.speed = reading.speedOverGround;
      }

      if (reading.heading !== undefined) {
        if (accepts('heading')) state.heading = reading.heading;
      } else if (
        source === 'gps' &&
        state.heading !== null &&
        acceptsSource(choices.heading, 'gps', state.lastSeen.heading.instrument, now)
      ) {
        // GPS has no heading. Once GPS is the heading source (chosen, or the
        // compass went quiet in auto), drop the old compass heading so displays
        // fall back to course over ground instead of showing a stale value.
        state.heading = null;
        state.sources.heading = null;
      }
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
  navigationReading,
  setGPSActive,
  resetNavigation,
} = navigationSlice.actions;

export const DEFAULT_NAVIGATION_SOURCES: NavigationSourceChoices = {
  position: 'auto',
  cogSog: 'auto',
  heading: 'auto',
};

interface StateWithSourceSettings {
  settings?: {
    settings: Partial<Record<'positionSource' | 'cogSogSource' | 'headingSource', NavigationSourceChoice>>;
  };
}

/**
 * Report navigation values from GPS or an instrument. Applies the source
 * choices from settings (auto when not set).
 */
export const reportNavigation =
  (source: NavigationSource, reading: NavigationReading) =>
  (dispatch: Dispatch, getState: () => StateWithSourceSettings) => {
    // Stores without a settings slice (some tests) use auto for everything
    const settings = getState().settings?.settings ?? {};
    dispatch(
      navigationReading({
        source,
        reading,
        choices: {
          position: settings.positionSource ?? DEFAULT_NAVIGATION_SOURCES.position,
          cogSog: settings.cogSogSource ?? DEFAULT_NAVIGATION_SOURCES.cogSog,
          heading: settings.headingSource ?? DEFAULT_NAVIGATION_SOURCES.heading,
        },
        now: Date.now(),
      })
    );
  };

export default navigationSlice.reducer;
