# Redux Store Integration

This directory contains the Redux store configuration and integration with the marine navigation services.

## Structure

```
store/
├── index.ts                 # Store configuration
├── hooks.ts                 # Typed Redux hooks
├── selectors.ts             # Memoized selectors
├── initialize.ts            # Store initialization
├── slices/                  # Redux slices
│   ├── instrumentSlice.ts   # Instrument data state
│   ├── routeSlice.ts        # Route management state
│   ├── aisSlice.ts          # AIS targets state
│   ├── chartSlice.ts        # Chart display state
│   ├── navigationSlice.ts   # Navigation state
│   └── settingsSlice.ts     # App settings state
└── middleware/              # Custom middleware
    ├── navigationMiddleware.ts  # Process instrument data
    └── aisMiddleware.ts         # Process AIS targets
```

## Usage

### Initialization

Initialize the store and connect services at application startup:

```typescript
import { initializeStore, getServices } from './store/initialize';

// Initialize store and services
const store = initializeStore();

// Get service instances
const { instrumentService, routeService, aisService } = getServices();
```

### Using Redux Hooks

Use the typed hooks in your React components:

```typescript
import { useAppDispatch, useAppSelector } from './store/hooks';
import { selectCurrentPosition, selectCurrentHeading } from './store/selectors';

function NavigationDisplay() {
  const dispatch = useAppDispatch();
  const position = useAppSelector(selectCurrentPosition);
  const heading = useAppSelector(selectCurrentHeading);

  return (
    <div>
      <p>Position: {position?.latitude}, {position?.longitude}</p>
      <p>Heading: {heading}°</p>
    </div>
  );
}
```

### Service Integration

Services automatically dispatch actions to Redux when data changes:

```typescript
// Connect to instruments - updates flow to Redux automatically
await instrumentService.connect({
  protocol: 'nmea0183',
  connection: { type: 'serial', port: '/dev/ttyUSB0' },
  baudRate: 4800,
});

// Create a route - automatically added to Redux state
const route = await routeService.createRoute(waypoints);

// Process AIS messages - targets automatically added to Redux state
await aisService.processMessage(instrumentData);
```

## State Slices

### Instrument Slice

Manages instrument connection status and latest data from all instrument types.

```typescript
interface InstrumentState {
  connected: boolean;
  stubMode: boolean;
  latestData: Record<InstrumentDataType, InstrumentData | null>;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
}
```

### Route Slice

Manages routes, active route, and route validation.

```typescript
interface RouteState {
  routes: Route[];
  activeRouteId: string | null;
  activeRoute: Route | null;
  routeValidation: Record<string, RouteValidation>;
  loading: boolean;
  error: string | null;
}
```

### AIS Slice

Manages AIS targets, nearby vessels, and selected target.

```typescript
interface AISState {
  targets: Record<string, AISTarget>;
  nearbyTargets: string[];
  selectedTargetMMSI: string | null;
  bounds: GeoBounds | null;
  lastUpdate: number;
  error: string | null;
}
```

### Chart Slice

Manages chart display settings, layers, and coverage.

```typescript
interface ChartState {
  zoom: number;
  rotation: ChartRotation;
  center: { latitude: number; longitude: number } | null;
  layers: ChartLayer[];
  visibleBounds: GeoBounds | null;
  coverage: ChartCoverage[];
  availableUpdates: ChartUpdate[];
  loading: boolean;
  cacheSize: number;
  error: string | null;
}
```

### Navigation Slice

Manages current position, heading, speed, track recording, MOB, anchor watch, and voyage.

```typescript
interface NavigationState {
  currentPosition: Position | null;
  currentHeading: number | null;
  currentSpeed: number | null;
  isRecordingTrack: boolean;
  activeTrackId: string | null;
  currentTrack: Track | null;
  mobMarker: MOBMarker | null;
  anchorWatch: AnchorWatch | null;
  currentVoyage: Voyage | null;
  isNavigating: boolean;
  distanceToNextWaypoint: number | null;
  bearingToNextWaypoint: number | null;
  eta: Date | null;
  error: string | null;
}
```

### Settings Slice

Manages application settings.

```typescript
interface SettingsState extends AppSettings {
  loading: boolean;
  error: string | null;
  lastSyncTime: number | null;
}
```

## Middleware

### Navigation Middleware

Automatically processes instrument data and updates navigation state:
- GPS data → current position
- Heading data → current heading
- Speed data → current speed

### AIS Middleware

Automatically identifies nearby vessels when:
- New AIS target is received
- Own position changes

Calculates distance to all targets and updates `nearbyTargets` list.

## Selectors

Use memoized selectors for efficient state access:

```typescript
// Instrument selectors
selectInstrumentConnected(state)
selectInstrumentData(InstrumentDataType.GPS)(state)

// Route selectors
selectAllRoutes(state)
selectActiveRoute(state)
selectRouteValidation(routeId)(state)

// AIS selectors
selectAllAISTargets(state)
selectNearbyAISTargets(state)
selectAISTarget(mmsi)(state)

// Chart selectors
selectChartZoom(state)
selectVisibleChartLayers(state)

// Navigation selectors
selectCurrentPosition(state)
selectIsRecordingTrack(state)
selectMOBMarker(state)

// Settings selectors
selectUnits(state)
selectTheme(state)
```

## Redux DevTools

The store is configured to work with Redux DevTools for debugging. Install the browser extension to inspect state changes and time-travel debug.

## Testing

When testing components that use Redux:

```typescript
import { Provider } from 'react-redux';
import { store } from './store';

function TestWrapper({ children }) {
  return <Provider store={store}>{children}</Provider>;
}
```

## Performance

- All selectors use `createSelector` for memoization
- Middleware is optimized to avoid unnecessary dispatches
- Serializable check configured to ignore Date objects and complex data structures
