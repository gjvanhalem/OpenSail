# GPS Integration Guide

This document describes how the app gets the vessel's position from the device's GPS or from the GPS simulator.

## Overview

The system supports three GPS modes (setting `gpsMode`):
1. **Off**
2. **Real GPS**: the device's own location (`GeolocationService`)
3. **Simulator**: simulated tracks on the IJsselmeer, for development and testing (`GPSSimulator`)

Position, COG/SOG and heading can also come from instruments. Which source is used for each value is set under Settings → Navigation sources (`positionSource`, `cogSogSource`, `headingSource`: auto, GPS or instrument).

## Components

### Platform geolocation (`platform/geolocation.ts`)

`platformGeolocation()` returns the location source of the platform the app runs on, with the callback API of `navigator.geolocation`:
- **Browser and Windows app**: `navigator.geolocation`
- **Android app**: `@capacitor/geolocation`, which asks for the location permission itself and uses Android's fused location provider. It keeps working while the app runs in the background (foreground service).

### GeolocationService

Wraps the platform geolocation:
- Continuous position tracking via `watchPosition`
- Accuracy check (`minAccuracy`)
- Errors as `NavigationError`, passed to an `onError` callback
- Readings go to Redux through `reportNavigation('gps', ...)`, which applies the navigation source settings

**Usage:**
```typescript
import { getGeolocationService } from '@/services';

const geoService = getGeolocationService();
geoService.initialize(dispatch);
await geoService.start();
geoService.stop();
const position = geoService.getLastPosition();
```

**Configuration (defaults):**
```typescript
const geoService = getGeolocationService({
  enableHighAccuracy: true,
  timeout: 10000,      // ms
  maximumAge: 0,       // don't use cached positions
  minAccuracy: 50,     // metres
});
```

### GPSSimulator

Moves a simulated vessel along a predefined track:
- Update interval configurable, default 1 second
- Interpolates between waypoints at the track's speed

**Usage:**
```typescript
import { getGPSSimulator, GPSSimulator } from '@/services';

const simulator = getGPSSimulator();
simulator.initialize(dispatch);
const tracks = GPSSimulator.getPredefinedTracks();
simulator.start(tracks[0]);
simulator.stop();
```

**Predefined Tracks:**
1. **Harbor Navigation**: 3 knots, out of Stavoren harbour onto the IJsselmeer
2. **Coastal Cruise**: 6 knots, Stavoren to Hindeloopen along the Frisian coast
3. **Open Water Passage**: 7.5 knots, Stavoren to Enkhuizen across the IJsselmeer

### gpsMode and useGpsAutoStart

- `startGpsMode(mode, trackName, dispatch)` in `services/gpsMode.ts` stops whatever source runs and starts the chosen mode. Used by the GPS settings and on start-up.
- `useGpsAutoStart()` resumes the saved GPS mode (and simulator track, `gpsSimulatorTrack`) when the app starts, so a reload never silently stops the position, and with it the chart, anchor watch and MOB guidance.

## UI Components

### GPSControl Component

On the Settings page, under **Navigation sources**:
- Off / Real GPS / Simulator
- Simulator track selection
- Current GPS status, position and accuracy
- Error messages

## Chart Integration

### Follow Vessel

The chart follows the vessel while a position is known. Panning the map stops following; the Follow vessel button on the chart turns it back on.

### North-Up and Heading-Up

The heading-up button on the chart (and setting `chartRotation`) turns the chart so the bow points up. It uses the true heading, or COG when there is no heading.

### Vessel Marker

`VesselMarker` draws the vessel at its position with a heading line, from the Redux state.

## Redux Integration

### Navigation Slice

```typescript
interface NavigationState {
  position: Position | null;
  heading: number | null;
  speed: number | null;
  course: number | null;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
  isGPSActive: boolean;
  sources: Record<'position' | 'cogSog' | 'heading', 'gps' | 'instrument' | null>;
  lastSeen: ...; // when each source last reported each value
}
```

**Actions:**
- `reportNavigation(source, reading)`: thunk for GPS and instrument readings; applies the source choices
- `navigationReading`: the reducer behind it
- `updatePosition`, `updateHeading`, `updateSpeed`, `updateCourse`
- `setGPSActive`, `resetNavigation`

## Error Handling

`GeolocationService` reports permission denied, position unavailable, timeout and "not supported". `GPSControl` and `useGpsAutoStart` pass them to the `ErrorHandler`, which shows them as notifications (see `ERROR_HANDLING_README.md`).

## Platform Notes

- The browser needs HTTPS (or localhost) and the user's location permission
- In a browser, location stops when the tab is in the background or the screen is off; the Android app keeps it running with a foreground service
- High accuracy mode uses more battery

## Testing

### Development Testing
1. Open Settings → Navigation sources
2. Select "Simulator" and choose a track
3. Open the Chart page and watch the vessel move along the track

### Real GPS Testing
1. Open Settings → Navigation sources
2. Select "Real GPS" and grant location permission
3. Open the Chart page; the vessel is at your location

## Troubleshooting

### GPS Not Working
1. Ensure HTTPS (or localhost) in the browser
2. Grant location permission (in Android: app settings → Location)
3. Check the GPS Control panel for errors
4. Try simulator mode to verify the rest works

### Chart Not Following
1. Tap the Follow vessel button
2. Check that a position is coming in (GPS Control panel)

## API Reference

- `src/platform/geolocation.ts`
- `src/services/GeolocationService.ts`
- `src/services/GPSSimulator.ts`
- `src/services/gpsMode.ts`
- `src/hooks/useGpsAutoStart.ts`
- `src/store/slices/navigationSlice.ts`
- `src/models/index.ts` (Position interface)
