# Redux Store Documentation

This directory contains the Redux Toolkit store configuration (`index.ts`), typed hooks (`hooks.ts`) and the state slices (`slices/`).

## Store Structure

The store is organized into the following slices:

### 1. Navigation Slice (`navigationSlice.ts`)
Vessel position and navigation data, from GPS or instruments.

**State:**
- `position`, `heading` (true), `speed` (SOG), `course` (COG), `altitude`, `accuracy`, `timestamp`
- `isGPSActive`: GPS running
- `sources`: which source (`'gps'` or `'instrument'`) each value (`position`, `cogSog`, `heading`) currently comes from
- `lastSeen`: when each source last reported each value

**Actions:**
- `reportNavigation(source, reading)`: thunk for every GPS and instrument reading; applies the navigation source settings (auto, GPS or instrument; auto uses instruments while they report)
- `navigationReading`: the reducer behind it
- `updatePosition`, `updateHeading`, `updateSpeed`, `updateCourse`
- `setGPSActive`, `resetNavigation`

`navigationNormalization.ts` turns instrument data into navigation readings.

### 2. Routes Slice (`routesSlice.ts`)
Saved routes and active route navigation.

**State:**
- `routes`: all saved routes
- `activeRouteId`, `activeWaypointIndex`, `isNavigating`
- `navigationStart`: where the boat was when navigation started (start of the first leg)
- `routeCompleted`: the last waypoint has been reached

**Actions:**
- `addRoute`, `updateRoute`, `deleteRoute`, `setRoutes`
- `setActiveRoute`, `startNavigation`, `stopNavigation`
- `advanceToNextWaypoint`, `setActiveWaypointIndex`
- `addWaypointToRoute`, `removeWaypointFromRoute`

### 3. Tracks Slice (`tracksSlice.ts`)
Track recording and saved tracks.

**State:**
- `tracks`, `currentTrack`, `isRecording`, `isPaused`

**Actions:**
- `startRecording`, `stopRecording`, `pauseRecording`, `resumeRecording`, `addTrackPoint`
- `addTrack`, `deleteTrack`, `updateTrack`, `setTrackColor`, `setTracks`, `clearCurrentTrack`

### 4. AIS Slice (`aisSlice.ts`)
AIS targets and CPA warnings. Only the map layer exists so far: no AIS decoder feeds this slice yet (Phase 5).

**State:**
- `targets` (keyed by MMSI), `selectedTargetMMSI`, `cpaWarnings`, `showAISLayer`, `cpaWarningThreshold` (nautical miles)

**Actions:**
- `updateTarget`, `removeTarget`, `selectTarget`, `clearOldTargets`, `clearAllTargets`
- `dismissCPAWarning`, `setShowAISLayer`, `setCPAWarningThreshold`

### 5. Instruments Slice (`instrumentsSlice.ts`)
Instrument connections and their data.

**State:**
- `connections`: connection status per connection; `type` is `'serial'`, `'bluetooth'`, `'network'` (Wi-Fi) or `'stub'` (simulator). The connection objects themselves live in `services/connections/connectionRegistry.ts`
- `activeConnectionId`
- `dataStreams`: the last 100 readings per data type
- `depth`, `windSpeed`, `windDirection` (apparent), `waterSpeed`, `waterTemperature`
- `rudderAngle`, `heel`, `pitch`
- `isReceivingData`

**Actions:**
- `addConnection`, `updateConnection`, `removeConnection`, `setActiveConnection`, `setConnectionStatus`
- `addInstrumentData`, `clearDataStreams`, `setIsReceivingData`

`instrumentNormalization.ts` converts readings to the stored units (metres, knots, degrees, °C).

### 6. UI Slice (`uiSlice.ts`)
UI state.

**State:**
- `fullscreenMode`
- `showRoutes`, `showTracks`, `showAIS`: chart layers (the Layers panel)
- `activeModal`, `modalData`, `showInstrumentPanel`, `showNavigationInfo`, `isLoading`, `loadingMessage`
- `notifications`: not used; toasts use the notifications slice

**Actions:**
- `toggleFullscreen`, `setFullscreen`
- `toggleRoutes` / `setShowRoutes`, `toggleTracks` / `setShowTracks`, `toggleAIS` / `setShowAIS`
- `openModal`, `closeModal`, `toggleInstrumentPanel`, `setShowInstrumentPanel`, `toggleNavigationInfo`, `setShowNavigationInfo`, `setLoading`

### 7. Chart Cache Slice (`chartCacheSlice.ts`)
Offline chart regions, downloads, storage quota and chart updates. See `components/chart/OFFLINE_CHARTS_README.md`.

### 8. Settings Slice (`settingsSlice.ts`)
All app settings (`AppSettings` in `database/repositories/SettingsRepository.ts`), stored in IndexedDB.

**State:**
- `settings`, `isLoading`, `error`, `isInitialized`
- `updatedWhileLoading`: keys changed before the first load finished, so they win over the loaded values

**Actions:**
- Thunks `loadSettings`, `updateSetting({ key, value })`, `updateMultipleSettings`, `resetSettings`
- `setSettingOptimistic`

### 9. Notifications Slice (`notificationsSlice.ts`)
The toast queue shown by `components/Toast.tsx`. See `services/ERROR_HANDLING_README.md`.

**Actions:** `addNotification`, `removeNotification`, `clearNotifications`, `showInfo`, `showWarning`, `showError`

### 10. Alerts Slice (`alertsSlice.ts`)
Instrument min/max alerts and safety alarms.

**State:**
- `active`: values (`depth`, `speed`, `windSpeed`) outside their limits
- `alarms`: safety alarms by kind (`mob`, `anchorDrag`, `anchorGpsLost`, `collision`, `test`), with `acknowledged` when silenced

**Actions:**
- `evaluateAlerts`, `acknowledgeAlerts`
- `raiseAlarm`, `clearAlarm`, `silenceAlarms`, thunk `raiseSafetyAlarm`

### 11. Safety Slice (`safetySlice.ts`)
Man overboard and anchor watch. Every event is also logged in the `safetyEvents` table, so an active MOB or anchor watch is restored after a restart.

**State:**
- `mob`: active man-overboard (position, time, stale fix) or null
- `anchor`: active anchor watch (anchor position, radius, check result, event log) or null
- `anchorPanelOpen`

**Actions:**
- Thunks `activateMob`, `fixMobPosition`, `clearMob`, `dropAnchor`, `setAnchorRadius`, `raiseAnchor`, `runAnchorCheck`, `restoreSafety`
- Reducers `mobActivated`, `mobPositionFixed`, `mobCleared`, `anchorDropped`, `anchorChecked`, `anchorRadiusSet`, `anchorLogged`, `anchorRaised`, `setAnchorPanelOpen`

## Usage

### Importing Hooks

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
```

### Dispatching Actions

```typescript
import { reportNavigation } from '@/store/slices/navigationSlice';

const dispatch = useAppDispatch();

dispatch(reportNavigation('gps', {
  position: { latitude: 52.88, longitude: 5.36, accuracy: 10, timestamp: Date.now() },
}));
```

### Selecting State

```typescript
const position = useAppSelector((state) => state.navigation.position);
const isNavigating = useAppSelector((state) => state.routes.isNavigating);
const units = useAppSelector((state) => state.settings.settings.units);
```

## Redux DevTools

Redux Toolkit enables Redux DevTools support. Install the Redux DevTools browser extension to inspect state and actions during development.

## Serialization

The serializable check ignores non-serializable values (Dates, callbacks) in these state paths:
- `navigation.timestamp`
- `tracks.currentTrack.points`
- `ais.targets`
- `notifications.notifications`

and in some actions (`navigation/updatePosition`, `tracks/addTrackPoint`, `ais/updateTarget`, the notification actions) and payload paths (`payload.timestamp`, `payload.lastUpdate`, `payload.action.onClick`).

## Best Practices

1. **Use typed hooks**: Always use `useAppDispatch` and `useAppSelector` instead of plain Redux hooks
2. **Keep actions simple**: Complex logic should be in thunks or services, not reducers
3. **Normalize data**: Use dictionaries (keyed by ID) for collections when possible
4. **Avoid deep nesting**: Keep state structure flat for better performance
5. **Use selectors**: Create reusable selectors for complex state derivations
