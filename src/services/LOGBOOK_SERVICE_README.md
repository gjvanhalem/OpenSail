# Logbook Service Implementation

## Overview

The LogbookService provides comprehensive voyage tracking and logbook management for the marine navigation system. It automatically detects voyage start/end based on vessel movement and maintains detailed records of all navigation activities.

## Features Implemented

### 1. Automatic Voyage Tracking (Requirement 13.1, 13.2)

- **Auto-start detection**: Automatically starts a voyage when vessel speed exceeds 1.0 knots
- **Auto-end detection**: Automatically ends a voyage after vessel is stationary for 5 minutes
- **Manual control**: Supports manual voyage start/end for user control
- **Statistics calculation**: Tracks distance, average speed, maximum speed, and duration

### 2. Logbook Entry Management (Requirement 13.3)

- **Voyage entries**: Automatic voyage_start and voyage_end entries
- **Waypoint entries**: Record when passing waypoints
- **Note entries**: Manual text notes with timestamps
- **Event entries**: Record significant events (engine start, weather changes, etc.)
- **Position tracking**: All entries include GPS position when available

### 3. CSV Export (Requirement 13.5)

- **Full export**: Export all logbook entries to CSV format
- **Filtered export**: Export specific voyage or date range
- **Proper formatting**: Handles special characters, quotes, and missing data
- **Standard format**: Compatible with spreadsheet applications

### 4. UI Components

- **LogbookView**: Main logbook interface with voyage list and entry details
- **VoyageCard**: Visual representation of voyage with statistics
- **LogbookEntryList**: Scrollable list of logbook entries with type-based coloring

## Usage Examples

### Starting a Voyage

```typescript
import { LogbookServiceImpl } from './services/LogbookService';

const logbookService = new LogbookServiceImpl();

// Manual start
const voyageId = await logbookService.startVoyage();

// Or let it auto-start when vessel moves
logbookService.updateSpeed(5.0); // Will auto-start if speed > 1.0 kn
```

### Adding Logbook Entries

```typescript
// Add a note
await logbookService.addNoteEntry('Weather improving, wind from NW');

// Record waypoint passage
await logbookService.addWaypointEntry('WP001');

// Record an event
await logbookService.addEventEntry('Engine started');
```

### Updating Position and Speed

```typescript
// Update current position (calculates distance)
logbookService.setCurrentPosition({
  latitude: 52.3676,
  longitude: 4.9041,
  accuracy: 10,
  timestamp: Date.now()
});

// Update speed (tracks max and average)
logbookService.updateSpeed(7.5);
```

### Retrieving Voyage Data

```typescript
// Get current voyage with real-time statistics
const currentVoyage = await logbookService.getCurrentVoyage();
console.log(`Distance: ${currentVoyage?.distance} nm`);
console.log(`Avg Speed: ${currentVoyage?.avgSpeed} kn`);

// Get all voyages
const allVoyages = await logbookService.getVoyages();

// Get voyages in date range
const recentVoyages = await logbookService.getVoyages({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
});
```

### Exporting Logbook

```typescript
// Export to CSV
const csv = await logbookService.exportLogbook('csv');

// Save to file or share
// (In React Native, use react-native-fs or Share API)
```

## Database Schema

### Voyages Table

```sql
CREATE TABLE voyages (
  id TEXT PRIMARY KEY,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  start_position_lat REAL,
  start_position_lon REAL,
  end_position_lat REAL,
  end_position_lon REAL,
  distance REAL,
  avg_speed REAL,
  max_speed REAL
);
```

### Logbook Entries Table

```sql
CREATE TABLE logbook_entries (
  id TEXT PRIMARY KEY,
  voyage_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  position_lat REAL,
  position_lon REAL,
  type TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (voyage_id) REFERENCES voyages(id) ON DELETE CASCADE
);
```

## Automatic Voyage Detection

The service monitors vessel speed to automatically manage voyages:

1. **Movement Threshold**: 1.0 knots
2. **Stationary Timeout**: 5 minutes (300 seconds)
3. **Detection Logic**:
   - When speed exceeds threshold → Start voyage (if not already started)
   - When stationary for timeout → End voyage (if in progress)

This ensures voyages are accurately tracked without manual intervention.

## Statistics Calculation

### Distance
- Calculated using Haversine formula between consecutive positions
- Accumulated throughout the voyage
- Reported in nautical miles

### Average Speed
- Mean of all speed readings during voyage
- Updated in real-time
- Reported in knots

### Maximum Speed
- Highest speed recorded during voyage
- Tracked continuously
- Reported in knots

### Duration
- Time between voyage start and end (or current time if active)
- Calculated on-demand
- Reported in hours and minutes

## Testing

Comprehensive test suite with 27 tests covering:

- Voyage management (start, end, auto-detection)
- Statistics calculation (distance, speed, duration)
- Logbook entries (notes, waypoints, events)
- CSV export (formatting, special characters)
- Position and speed updates
- Voyage state management

All tests pass successfully.

## Requirements Coverage

- ✅ **13.1**: Automatic voyage start/end detection
- ✅ **13.2**: Distance, average speed, maximum speed logging
- ✅ **13.3**: Manual text notes to logbook entries
- ✅ **13.4**: 365-day storage (database supports unlimited storage)
- ✅ **13.5**: CSV export functionality

## Future Enhancements

- PDF export support
- Logbook templates for different vessel types
- Weather data integration in entries
- Photo attachments to entries
- Crew member tracking
- Fuel consumption logging
- Maintenance event tracking
