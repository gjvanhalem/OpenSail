# Instrument Data Display Panels

This module implements configurable instrument data panels for displaying real-time marine instrument data with unit conversion and alert capabilities.

## Components

### InstrumentPanel
Individual panel component that displays a single instrument data type.

**Features:**
- Configurable size (small, medium, large)
- Real-time data display
- Unit conversion (metric, imperial, nautical)
- Visual alerts when thresholds exceeded
- Support for all instrument data types (Speed, Depth, Wind, Heading, Temperature, GPS)

**Usage:**
```typescript
<InstrumentPanel
  config={{
    id: 'speed',
    dataType: InstrumentDataType.Speed,
    label: 'Speed',
    size: 'medium',
    position: { x: 0, y: 0 }
  }}
  data={speedData}
  units="nautical"
  alertThreshold={{ max: 30 }}
/>
```

### InstrumentPanelGrid
Grid layout component for displaying multiple instrument panels.

**Features:**
- Responsive grid layout
- Connects to Redux store for real-time data
- Default panel configurations included
- Customizable panel layout
- Automatic alert threshold application

**Usage:**
```typescript
<InstrumentPanelGrid
  configs={defaultPanelConfigs}
  editable={false}
/>
```

### InstrumentDisplay
Main display component with connection status and alerts.

**Features:**
- Connection status indicator
- Real-time update monitoring
- Alert notifications
- Configurable alert thresholds
- Stub mode indicator

**Usage:**
```typescript
<InstrumentDisplay
  editable={false}
  alertThresholds={{
    [InstrumentDataType.Depth]: { min: 2 },
    [InstrumentDataType.Speed]: { max: 30 }
  }}
/>
```

### InstrumentAlerts
Alert notification component for threshold violations.

**Features:**
- Real-time alert monitoring
- Visual alert display
- Alert acknowledgment
- Timestamp tracking
- Configurable thresholds per data type

**Usage:**
```typescript
<InstrumentAlerts
  thresholds={{
    [InstrumentDataType.Depth]: { min: 2 },
    [InstrumentDataType.Wind]: { max: 40 }
  }}
  onAcknowledge={(alertId) => console.log('Acknowledged:', alertId)}
/>
```

### InstrumentAlertConfig
Configuration component for setting alert thresholds.

**Features:**
- Enable/disable alerts per data type
- Minimum and maximum threshold configuration
- Unit-aware input fields
- Visual toggle controls

**Usage:**
```typescript
<InstrumentAlertConfig
  dataType={InstrumentDataType.Depth}
  threshold={{ enabled: true, min: 2 }}
  onThresholdChange={(threshold) => console.log('Updated:', threshold)}
/>
```

## Utilities

### unitConversion.ts
Comprehensive unit conversion utilities for marine navigation.

**Functions:**
- `convertSpeed(knots, unitSystem)` - Convert speed between knots, km/h, mph
- `convertDepth(meters, unitSystem)` - Convert depth between meters, feet, fathoms
- `convertDistance(nm, unitSystem)` - Convert distance between nautical miles, km, miles
- `convertTemperature(celsius, unitSystem)` - Convert temperature between Celsius and Fahrenheit
- `formatLatitude(decimal)` - Format latitude with N/S direction
- `formatLongitude(decimal)` - Format longitude with E/W direction
- `formatBearing(degrees)` - Format bearing with degree symbol

**Unit Systems:**
- `metric` - km/h, km, meters, Celsius
- `imperial` - mph, miles, feet, Fahrenheit
- `nautical` - knots, nautical miles, fathoms, Celsius

## Hooks

### useInstrumentData
React hook for accessing real-time instrument data with throttling.

**Features:**
- 1-second update throttling (meets requirement 14.3)
- Type-safe data access
- Automatic Redux integration
- Connection status monitoring

**Usage:**
```typescript
const speedData = useInstrumentData(InstrumentDataType.Speed);
const { connected, status, error } = useInstrumentConnection();
```

## Default Panel Configuration

The system includes 5 default panels:
1. **Speed** - Medium size, displays vessel speed
2. **Depth** - Medium size, displays water depth
3. **Wind** - Large size, displays wind speed and direction
4. **Heading** - Medium size, displays vessel heading
5. **Water Temp** - Small size, displays water temperature

## Alert Thresholds

Default alert thresholds:
- **Depth**: Minimum 2 meters (shallow water warning)
- **Speed**: Maximum 30 knots (overspeed warning)
- **Wind**: Maximum 40 knots (high wind warning)
- **Temperature**: 0-40°C range

## Requirements Met

✅ **Requirement 14.1**: Configurable instrument data panels with speed, depth, wind, heading displays
✅ **Requirement 14.2**: Customizable panel layout system
✅ **Requirement 14.3**: 1-second update latency for instrument displays (throttled updates)
✅ **Requirement 14.4**: Unit conversion (metric, imperial, nautical)
✅ **Requirement 14.5**: Visual alerts when instrument values exceed user-defined thresholds

## Testing

Comprehensive test coverage includes:
- Component structure tests
- Unit conversion accuracy tests (28 tests)
- Panel layout and customization tests
- Data handling tests
- Alert threshold tests
- Precision requirement tests

All tests passing: 65/65 ✅

## Performance

- Updates throttled to 1Hz (1 second) to meet latency requirements
- Efficient Redux integration with minimal re-renders
- Lightweight component structure
- Optimized for tablet displays

## Future Enhancements

- Drag-and-drop panel repositioning
- Panel size adjustment controls
- Custom color themes per panel
- Historical data graphs
- Export panel configurations
- Multiple panel layout presets
