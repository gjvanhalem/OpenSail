# Tide Service Implementation

## Overview

The Tide Service provides tide and current predictions for marine navigation. It includes station lookup, tide height predictions with 0.1m precision, and current flow predictions.

## Components

### TideService (`src/services/TideService.ts`)

Core service that manages tide stations and generates predictions.

**Features:**
- Tide station lookup by ID or nearest position
- Tide predictions with high/low tide times and heights (0.1m precision)
- Current predictions with direction and speed (0.1 knot precision)
- 24-hour caching for offline access
- Pre-configured Dutch tide stations (Hoorn, Rotterdam, Den Helder)

**Usage:**
```typescript
import { createTideService } from './services/TideService';

const tideService = createTideService();
await tideService.initialize();

// Find nearest station
const station = await tideService.getNearbyStation(position);

// Get tide predictions
const tides = await tideService.getTidePredictions(station.id, 3); // 3 days

// Get current predictions
const currents = await tideService.getCurrentPredictions(station.id, 1); // 1 day

// Cache for offline use
await tideService.cacheTideData(station.id);
```

### UI Components

#### TideDisplay (`src/components/TideDisplay.tsx`)

Displays tide predictions for nearby stations in a scrollable list.

**Props:**
- `tideService`: TideService instance
- `position`: Current vessel position
- `days`: Number of days to display (default: 3)

**Features:**
- Automatic station lookup based on position
- Grouped by date with high/low tide indicators
- Color-coded tide types (blue for high, orange for low)
- Height display with 0.1m precision
- Loading and error states

#### CurrentArrows (`src/components/CurrentArrows.tsx`)

Manages current flow data for map overlay display.

**Props:**
- `tideService`: TideService instance
- `bounds`: Geographic bounds for display area
- `currentTime`: Time for current prediction (default: now)
- `onCurrentsLoaded`: Callback when current data is loaded

**Helper Functions:**
- `createCurrentMarkers()`: Convert predictions to map markers
- `getCurrentSpeedColor()`: Get color based on current speed
- `getArrowSize()`: Calculate arrow size based on speed

**Usage:**
```typescript
<CurrentArrows
  tideService={tideService}
  bounds={mapBounds}
  onCurrentsLoaded={(currents) => {
    // Update map with current arrows
  }}
/>
```

#### TideStationInfo (`src/components/TideStationInfo.tsx`)

Displays detailed information about a tide station.

**Props:**
- `tideService`: TideService instance
- `position`: Position to find nearest station
- `onClose`: Callback when user closes the info panel

**Features:**
- Station details (name, ID, position, timezone)
- Next tide prediction (time, type, height)
- Current flow information (direction, speed)
- Distance to station from current position
- Compass direction formatting (N, NE, E, etc.)

## Testing

Comprehensive test suite with 30 tests covering:
- Station initialization and lookup
- Tide prediction generation and accuracy
- Current prediction generation
- Caching and offline access
- Distance calculations
- Data precision (0.1m for tides, 0.1 knot for currents)

**Run tests:**
```bash
npm test -- TideService.test.ts
```

## Requirements Coverage

### Requirement 11.1: Display tide predictions
✅ TideDisplay component shows tide predictions for nearby stations

### Requirement 11.2: Show current predictions
✅ CurrentArrows component provides current direction and speed data

### Requirement 11.3: Tide height precision
✅ All tide heights displayed with 0.1m precision

### Requirement 11.4: Offline data access
✅ 24-hour caching system for offline operation

### Requirement 11.5: Station lookup
✅ getNearbyStation() finds closest station to any position

## Data Model

### TideStation
```typescript
{
  id: string;           // Station identifier
  name: string;         // Station name
  position: Position;   // Geographic location
  timezone: string;     // Timezone for predictions
}
```

### TidePrediction
```typescript
{
  stationId: string;    // Reference to station
  timestamp: Date;      // Time of tide
  height: number;       // Height in meters (0.1m precision)
  type: 'high' | 'low'; // Tide type
}
```

### CurrentPrediction
```typescript
{
  stationId: string;    // Reference to station
  timestamp: Date;      // Time of prediction
  direction: number;    // Direction in degrees (0-360)
  speed: number;        // Speed in knots (0.1 knot precision)
}
```

## Future Enhancements

- Integration with real tide data APIs (NOAA, UK Hydrographic Office)
- More tide stations (currently only Dutch stations)
- Tidal stream atlas integration
- Tide graph visualization
- Tidal height at specific times (interpolation)
- Spring/neap tide indicators
- Tidal range calculations
