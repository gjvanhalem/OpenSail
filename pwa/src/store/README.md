# Redux Store Documentation

This directory contains the Redux Toolkit store configuration and state slices for the PWA navigation application.

## Store Structure

The store is organized into the following slices:

### 1. Navigation Slice (`navigationSlice.ts`)
Manages real-time vessel position and navigation data.

**State:**
- `position`: Current GPS position (lat/lon)
- `heading`: Vessel heading in degrees
- `speed`: Speed over ground
- `course`: Course over ground
- `altitude`: GPS altitude
- `accuracy`: GPS accuracy
- `timestamp`: Last update timestamp
- `isGPSActive`: GPS signal status

**Actions:**
- `updatePosition`: Update GPS position
- `updateHeading`: Update vessel heading
- `updateSpeed`: Update vessel speed
- `updateCourse`: Update course over ground
- `setGPSActive`: Set GPS active status
- `resetNavigation`: Reset all navigation data

### 2. Routes Slice (`routesSlice.ts`)
Manages route planning and active route navigation.

**State:**
- `routes`: Array of all saved routes
- `activeRouteId`: Currently selected/navigating route
- `activeWaypointIndex`: Current waypoint in active route
- `isNavigating`: Whether actively navigating a route

**Actions:**
- `addRoute`: Add a new route
- `updateRoute`: Update existing route
- `deleteRoute`: Delete a route
- `setActiveRoute`: Set the active route
- `startNavigation`: Start navigating a route
- `stopNavigation`: Stop navigation
- `advanceToNextWaypoint`: Move to next waypoint
- `setActiveWaypointIndex`: Jump to specific waypoint
- `addWaypointToRoute`: Add waypoint to route
- `removeWaypointFromRoute`: Remove waypoint from route
- `setRoutes`: Load routes from storage

### 3. Tracks Slice (`tracksSlice.ts`)
Manages track recording and saved tracks.

**State:**
- `tracks`: Array of all saved tracks
- `currentTrack`: Currently recording track
- `isRecording`: Recording status
- `isPaused`: Pause status

**Actions:**
- `startRecording`: Start recording a new track
- `stopRecording`: Stop and save current track
- `pauseRecording`: Pause recording
- `resumeRecording`: Resume recording
- `addTrackPoint`: Add point to current track
- `addTrack`: Add a saved track
- `deleteTrack`: Delete a track
- `updateTrack`: Update track metadata
- `setTracks`: Load tracks from storage
- `clearCurrentTrack`: Clear current recording

### 4. AIS Slice (`aisSlice.ts`)
Manages AIS targets and collision warnings.

**State:**
- `targets`: Dictionary of AIS targets (keyed by MMSI)
- `selectedTargetMMSI`: Currently selected target
- `cpaWarnings`: Array of CPA (Closest Point of Approach) warnings
- `showAISLayer`: Visibility of AIS layer
- `cpaWarningThreshold`: Distance threshold for warnings (nautical miles)

**Actions:**
- `updateTarget`: Update or add AIS target
- `removeTarget`: Remove AIS target
- `selectTarget`: Select target for details
- `clearOldTargets`: Remove targets older than specified age
- `dismissCPAWarning`: Dismiss a CPA warning
- `setShowAISLayer`: Toggle AIS layer visibility
- `setCPAWarningThreshold`: Set warning threshold
- `clearAllTargets`: Clear all targets

### 5. Instruments Slice (`instrumentsSlice.ts`)
Manages instrument connections and data streams.

**State:**
- `connections`: Array of instrument connections
- `activeConnectionId`: Currently active connection
- `dataStreams`: Historical data streams by type
- `depth`: Current depth reading
- `windSpeed`: Current wind speed
- `windDirection`: Current wind direction
- `waterSpeed`: Current water speed
- `waterTemperature`: Current water temperature
- `isReceivingData`: Data reception status

**Actions:**
- `addConnection`: Add new instrument connection
- `updateConnection`: Update connection details
- `removeConnection`: Remove connection
- `setActiveConnection`: Set active connection
- `setConnectionStatus`: Update connection status
- `addInstrumentData`: Add new instrument data point
- `clearDataStreams`: Clear all data streams
- `setIsReceivingData`: Set data reception status

### 6. UI Slice (`uiSlice.ts`)
Manages UI state (sidebar, modals, notifications).

**State:**
- `sidebarOpen`: Sidebar visibility
- `sidebarCollapsed`: Sidebar collapsed state
- `activeModal`: Currently open modal
- `modalData`: Data for active modal
- `fullscreenMode`: Fullscreen status
- `showInstrumentPanel`: Instrument panel visibility
- `showNavigationInfo`: Navigation info visibility
- `notifications`: Array of notifications
- `isLoading`: Loading state
- `loadingMessage`: Loading message

**Actions:**
- `toggleSidebar`: Toggle sidebar open/closed
- `setSidebarOpen`: Set sidebar open state
- `toggleSidebarCollapsed`: Toggle sidebar collapsed
- `setSidebarCollapsed`: Set sidebar collapsed state
- `openModal`: Open a modal with optional data
- `closeModal`: Close active modal
- `toggleFullscreen`: Toggle fullscreen mode
- `setFullscreen`: Set fullscreen state
- `toggleInstrumentPanel`: Toggle instrument panel
- `setShowInstrumentPanel`: Set instrument panel visibility
- `toggleNavigationInfo`: Toggle navigation info
- `setShowNavigationInfo`: Set navigation info visibility
- `addNotification`: Add a notification
- `dismissNotification`: Dismiss a notification
- `removeNotification`: Remove a notification
- `clearNotifications`: Clear all notifications
- `setLoading`: Set loading state with optional message

## Usage

### Importing Hooks

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
```

### Dispatching Actions

```typescript
import { updatePosition } from '@/store/slices/navigationSlice';

const dispatch = useAppDispatch();

dispatch(updatePosition({
  latitude: 51.5074,
  longitude: -0.1278,
  accuracy: 10,
  timestamp: Date.now(),
}));
```

### Selecting State

```typescript
const position = useAppSelector((state) => state.navigation.position);
const isNavigating = useAppSelector((state) => state.routes.isNavigating);
const aisTargets = useAppSelector((state) => state.ais.targets);
```

## Redux DevTools

The store is configured with Redux DevTools support. Install the Redux DevTools browser extension to inspect state and actions during development.

## Serialization

The store is configured to handle non-serializable values (like Date objects) in specific paths:
- `navigation.timestamp`
- `tracks.currentTrack.points`
- `ais.targets`

These are necessary for working with timestamps and large data structures efficiently.

## Best Practices

1. **Use typed hooks**: Always use `useAppDispatch` and `useAppSelector` instead of plain Redux hooks
2. **Keep actions simple**: Complex logic should be in thunks or services, not reducers
3. **Normalize data**: Use dictionaries (keyed by ID) for collections when possible
4. **Avoid deep nesting**: Keep state structure flat for better performance
5. **Use selectors**: Create reusable selectors for complex state derivations
