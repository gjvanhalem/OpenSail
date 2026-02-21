# Settings Implementation

This directory contains the settings UI components for the marine navigation system.

## Components

### SettingsScreen
Main settings screen with tabbed interface for different settings categories.

**Features:**
- Tabbed navigation (Display, Alerts, Connections)
- Persistent settings storage via SettingsService
- Clean, organized UI

**Usage:**
```tsx
import { SettingsScreen } from './components';

<SettingsScreen />
```

### DisplaySettings
Settings for chart display and visual preferences.

**Settings:**
- Units (metric, imperial, nautical)
- Chart rotation (north-up, heading-up)
- Theme (light, dark)
- Chart layers (navigation aids, depth contours)
- Default zoom level

### AlertSettings
Settings for safety alerts and alarms.

**Settings:**
- Anchor watch alarm (enable/disable, radius)
- Collision warning (enable/disable, distance)
- Shallow water alarm (enable/disable, depth threshold)
- Weather alerts (enable/disable)

### ConnectionSettings
Settings for instrument connections and data synchronization.

**Settings:**
- Auto sync (enable/disable)
- Instrument protocol (NMEA 0183, NMEA 2000, SeaTalk, Simulator)
- Connection type (serial, network)
- Serial port configuration
- Network host/port configuration
- Baud rate
- Auto reconnect

## SettingsService

The SettingsService handles all settings persistence and retrieval.

**Key Features:**
- SQLite database storage
- Default settings initialization
- Category-based getters (display, alerts, connections)
- Type-safe setting access
- Automatic initialization

**Example Usage:**
```typescript
import { createSettingsService } from './services/SettingsService';

const service = createSettingsService();
await service.initialize();

// Get individual setting
const units = await service.getSetting('units');

// Set individual setting
await service.setSetting('units', 'metric');

// Get all settings
const allSettings = await service.getAllSettings();

// Get settings by category
const displaySettings = await service.getDisplaySettings();
const alertSettings = await service.getAlertSettings();
const connectionSettings = await service.getConnectionSettings();

// Reset to defaults
await service.resetToDefaults();
```

## Settings Categories

### Display Settings
Controls visual appearance and chart display preferences.

- `units`: Unit system (metric, imperial, nautical)
- `chartRotation`: Chart orientation (north-up, heading-up)
- `defaultZoom`: Default zoom level (1-20)
- `theme`: UI theme (light, dark)
- `showNavigationAids`: Show/hide navigation aids layer
- `showDepthContours`: Show/hide depth contours layer

### Alert Settings
Controls safety alarms and warnings.

- `anchorWatchRadius`: Anchor watch radius in meters (10-500)
- `enableAnchorAlarm`: Enable/disable anchor watch alarm
- `enableCollisionAlarm`: Enable/disable AIS collision warnings
- `collisionWarningDistance`: Warning distance in nautical miles (0.5-10)
- `enableShallowWaterAlarm`: Enable/disable shallow water alarm
- `shallowWaterDepth`: Shallow water threshold in meters (1-50)
- `enableWeatherAlerts`: Enable/disable weather alerts

### Connection Settings
Controls instrument connections and data sync.

- `autoSync`: Enable/disable automatic data synchronization
- `instrumentProtocol`: Marine protocol (nmea0183, nmea2000, seatalk, stub)
- `instrumentConnectionType`: Connection type (serial, network)
- `serialPort`: Serial port path (e.g., /dev/ttyUSB0)
- `networkHost`: Network host (IP or hostname)
- `networkPort`: Network port (1-65535)
- `baudRate`: Serial baud rate (4800, 9600, 38400)
- `autoReconnect`: Enable/disable automatic reconnection

## Database Schema

Settings are stored in the `settings` table:

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Values are stored as JSON strings for flexibility.

## Testing

Comprehensive unit tests are provided in `SettingsService.test.ts`:

- Initialization with defaults
- Loading existing settings
- Getting and setting individual settings
- Resetting to defaults
- Category getters
- Error handling

Run tests:
```bash
npm test SettingsService.test.ts
```

## Requirements Coverage

This implementation satisfies the following requirements:

- **Requirement 14.4**: Display instrument data with user-selectable units
- **Requirement 6.3**: Adapt UI layout for portrait and landscape orientations
- **Requirement 1.5**: Support chart rotation aligned to heading or north-up
- **Requirements 3.1, 3.2, 3.3**: Instrument connection configuration

## Future Enhancements

Potential improvements:

1. Import/export settings
2. Settings profiles (day/night modes)
3. Cloud backup of settings
4. Settings search functionality
5. Advanced connection diagnostics
6. Custom alert sound selection
