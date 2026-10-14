# GPS Integration Guide

This document describes the GPS integration features implemented in the marine navigation system.

## Overview

The system now supports two GPS modes:
1. **Real GPS**: Uses the browser's Geolocation API to get actual device position
2. **GPS Simulator**: Generates simulated GPS data for development and testing

## Components

### GeolocationService

The `GeolocationService` wraps the browser's Geolocation API and provides:
- Continuous position tracking via `watchPosition`
- Position accuracy monitoring
- Error handling with user-friendly messages
- Redux integration for state management
- Permission request handling

**Usage:**
```typescript
import { getGeolocationService } from '@/services';
import { useAppDispatch } from '@/store/hooks';

const dispatch = useAppDispatch();
const geoService = getGeolocationService();

// Initialize with Redux dispatch
geoService.initialize(dispatch);

// Start tracking
await geoService.start();

// Stop tracking
geoService.stop();

// Get last known position
const position = geoService.getLastPosition();
```

**Configuration:**
```typescript
const geoService = getGeolocationService({
  enableHighAccuracy: true,  // Request high accuracy GPS
  timeout: 10000,            // Timeout in milliseconds
  maximumAge: 0,             // Don't use cached positions
  minAccuracy: 50,           // Minimum acceptable accuracy in meters
});
```

### GPSSimulator

The `GPSSimulator` generates realistic GPS position updates for development:
- Simulates vessel movement along predefined tracks
- Configurable speed and update intervals
- Three predefined scenarios: Harbor, Coastal, Open Water
- Smooth interpolation between waypoints

**Usage:**
```typescript
import { getGPSSimulator, GPSSimulator } from '@/services';
import { useAppDispatch } from '@/store/hooks';

const dispatch = useAppDispatch();
const simulator = getGPSSimulator();

// Initialize with Redux dispatch
simulator.initialize(dispatch);

// Get predefined tracks
const tracks = GPSSimulator.getPredefinedTracks();

// Start simulation with a track
simulator.start(tracks[0]); // Harbor track

// Stop simulation
simulator.stop();
```

**Predefined Tracks:**
1. **Harbor Navigation**: 3 knots, tight turns, harbor environment
2. **Coastal Cruise**: 6 knots, moderate speed, coastal navigation
3. **Open Water Passage**: 7.5 knots, straight course, open water

**Custom Tracks:**
```typescript
const customTrack = {
  name: 'My Custom Track',
  description: 'Custom navigation scenario',
  speed: 5, // knots
  waypoints: [
    { latitude: 51.5, longitude: -0.1, accuracy: 5, timestamp: Date.now() },
    { latitude: 51.51, longitude: -0.09, accuracy: 5, timestamp: Date.now() },
    // ... more waypoints
  ],
};

simulator.start(customTrack);
```

## UI Components

### GPSControl Component

The `GPSControl` component provides a user interface for:
- Switching between Real GPS, Simulator, and Off modes
- Selecting simulation tracks
- Viewing current GPS status and position
- Displaying accuracy information
- Error messages

**Location:** Added to the Settings page

**Features:**
- Radio button selection for GPS mode
- Real-time position display
- Accuracy monitoring
- Track selection dropdown (when in simulator mode)
- Visual status indicators

## Chart Integration

### Auto-Centering

The ChartPage now includes auto-centering functionality:
- Automatically centers the map on vessel position when GPS is active
- Disables when user manually pans the map
- Re-enable with the "Recenter" button
- Visual indicator shows when auto-center is active

### Heading-Up Mode

When chart rotation is set to "Heading-Up" in settings:
- Map rotates to align with vessel heading
- Vessel icon always points up
- North direction rotates around the vessel

### Vessel Marker

The `VesselMarker` component:
- Displays vessel position on the map
- Shows heading indicator (red line)
- Smooth rotation animation
- Updates in real-time from Redux state

## Redux Integration

### Navigation Slice

The `navigationSlice` stores GPS-related state:
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
}
```

**Actions:**
- `updatePosition`: Update vessel position
- `updateHeading`: Update vessel heading
- `updateSpeed`: Update vessel speed
- `updateCourse`: Update vessel course
- `setGPSActive`: Set GPS active status
- `resetNavigation`: Reset all navigation data

## Error Handling

Both services integrate with the `ErrorHandler`:
- Permission denied errors
- Position unavailable errors
- Timeout errors
- Browser compatibility errors

Errors are:
1. Logged to console
2. Displayed in the UI
3. Stored in error log
4. Categorized by severity

## Browser Compatibility

### Full Support (Recommended)
- Chrome 89+
- Edge 89+
- Safari 15.4+

### Geolocation API Support
- All modern browsers support the Geolocation API
- Requires HTTPS (or localhost for development)
- User must grant location permission

### Known Limitations
- iOS Safari may have reduced accuracy in web apps
- Background location tracking is limited in browsers
- High accuracy mode may drain battery faster

## Testing

### Development Testing
1. Open Settings page
2. Select "Simulator" mode
3. Choose a predefined track
4. Navigate to Chart page
5. Observe vessel moving along the track

### Real GPS Testing
1. Open Settings page
2. Select "Real GPS" mode
3. Grant location permission when prompted
4. Navigate to Chart page
5. Observe vessel at your actual location

### Accuracy Monitoring
- Check the GPS Control panel for accuracy values
- Typical accuracy: 5-50 meters
- High accuracy mode: 5-10 meters (may take longer to acquire)

## Performance Considerations

### Update Intervals
- Real GPS: Updates as provided by device (typically 1-5 seconds)
- Simulator: Configurable, default 1 second

### Battery Impact
- High accuracy mode uses more battery
- Continuous tracking impacts battery life
- Consider disabling GPS when not actively navigating

### Memory Usage
- Position history is not stored in memory
- Only current position is kept in Redux state
- Track recording stores positions in IndexedDB

## Future Enhancements

Potential improvements:
1. Dead reckoning when GPS signal is lost
2. Kalman filtering for smoother position updates
3. Speed and course calculation from position history
4. GPS quality indicators (satellite count, HDOP)
5. Waypoint arrival detection
6. Route following with cross-track error
7. Custom simulation track editor
8. GPS track recording and playback

## Troubleshooting

### GPS Not Working
1. Check browser compatibility
2. Ensure HTTPS connection (or localhost)
3. Grant location permission
4. Check GPS Control panel for errors
5. Try simulator mode to verify system works

### Poor Accuracy
1. Enable high accuracy mode in settings
2. Ensure clear view of sky (for device GPS)
3. Wait for GPS to acquire satellites
4. Check accuracy value in GPS Control panel

### Auto-Center Not Working
1. Click the "Recenter" button
2. Ensure GPS is active (check status)
3. Verify position updates in GPS Control panel
4. Check browser console for errors

### Simulator Not Moving
1. Verify simulator mode is selected
2. Check that a track is selected
3. Look for error messages
4. Try switching tracks
5. Restart the simulator

## API Reference

See the TypeScript interfaces in:
- `src/services/GeolocationService.ts`
- `src/services/GPSSimulator.ts`
- `src/store/slices/navigationSlice.ts`
- `src/models/index.ts` (Position interface)
