# Instrument Display Components

This directory contains the instrument gauge components and panel layout for displaying marine instrument data.

## Components

### Gauge Components

#### SpeedGauge
Displays vessel speed with both analog gauge and digital readout.
- Shows water speed (from log) if available, otherwise GPS speed
- Range: 0-30 knots
- Includes data source indicator (Log/GPS)

#### DepthGauge
Displays water depth with vertical bar gauge and digital readout.
- Shows depth in meters and feet
- Color-coded: red (shallow <2m), amber (caution <5m), green (safe <20m), blue (deep)
- Configurable max depth (default 50m)
- Shallow water warning

#### WindGauge
Displays wind speed and direction with compass rose.
- Shows apparent wind angle relative to bow
- Calculates true wind direction when heading is available
- Includes Beaufort scale description
- Range: 0-360° direction, unlimited speed

#### HeadingCompass
Displays vessel heading with rotating compass rose.
- Shows magnetic heading with cardinal directions
- Includes course over ground (COG) when different from heading
- Fixed lubber line at top for reference
- Degree markers every 10° and 30°

### Panel Component

#### InstrumentPanel
Container component for displaying multiple gauges with customizable layout.

**Props:**
- `className`: Optional CSS classes
- `layout`: 'grid' | 'horizontal' | 'vertical' (default: 'grid')
- `initialGauges`: Array of gauge configurations
- `showConfig`: Show configuration button (default: false)

**Features:**
- Configurable gauge visibility
- Multiple layout options
- Responsive grid layout (1/2/4 columns based on screen size)
- Configuration UI for enabling/disabling gauges

**Example Usage:**
```tsx
import { InstrumentPanel } from '@/components/instruments';

// Basic usage with all gauges
<InstrumentPanel />

// With configuration UI
<InstrumentPanel showConfig={true} layout="grid" />

// Custom gauge selection
<InstrumentPanel 
  initialGauges={[
    { id: 'speed', type: 'speed', enabled: true },
    { id: 'heading', type: 'heading', enabled: true }
  ]}
/>
```

## Data Sources

All gauges connect to Redux store for real-time data:

### Navigation State
- `speed`: GPS speed (knots)
- `heading`: Magnetic heading (degrees)
- `course`: Course over ground (degrees)

### Instruments State
- `depth`: Water depth (meters)
- `windSpeed`: Wind speed (knots)
- `windDirection`: Apparent wind angle (degrees)
- `waterSpeed`: Speed through water from log (knots)
- `waterTemperature`: Water temperature (°C)

## Styling

All components use Tailwind CSS with dark theme:
- Background: `bg-gray-800`
- Text: `text-white`, `text-gray-400`, `text-gray-500`
- Accent colors: `text-blue-500`, `text-red-400`, `text-green-500`

## Integration

The InstrumentPanel is integrated into the InstrumentsPage:

```tsx
// pwa/src/pages/InstrumentsPage.tsx
<InstrumentPanel showConfig={true} layout="grid" />
```

## Future Enhancements

Potential improvements:
- Gauge size customization
- Drag-and-drop gauge reordering
- Save/load gauge configurations
- Additional gauge types (temperature, pressure, etc.)
- Alarm thresholds and visual warnings
- Historical data graphs
