# Instrument Display Components

This directory contains the instrument gauges, the panel that lays them out, and the connection UI for marine instruments.

## Components

### Gauge Components

Every gauge sits in a `GaugeCard`: the name top left, the reference top right, the gauge, then a row of secondary values. A gauge with an active min/max alert (`useGaugeAlert`) gets a red, pulsing ring. Round gauges share their SVG geometry in `dial.ts`.

#### SpeedGauge
Boat speed on a 270° dial that fills up to the speed, with the number in the middle.
- Speed through the water from the log when there is one, otherwise SOG
- Range 6, 12, 20, 30 or 50 knots (setting `speedGaugeMax`, default 12)

#### DepthGauge
Depth as a large number with a graph of the last two minutes (`depthTrend.ts`).
- Turns amber close to and red below the shallow-water alert limit, which is drawn in the graph
- Shows the other unit too (metres and feet)
- Shoaling / deepening trend

#### WindGauge
Apparent wind on a boat-relative dial: the bow at the top, red and green close-hauled sectors, the pointer where the wind comes from.
- True wind (TWS, TWA, TWD) is computed from the boat speed (log, or SOG as fallback) and shown only when the boat speed is known

#### HeadingCompass
True heading on a compass card that turns, so the heading is always under the lubber mark at the top. A small ring on the edge marks the course over ground.

#### PositionDisplay
Latitude and longitude, with the position source.

### Panel Component

#### InstrumentPanel
Shows the gauges in the layout saved in settings (`instrumentPanelLayout`). "Edit layout" lets the user choose which gauges show, their order and their size (small, medium, large).

**Props:**
- `className`: Optional CSS classes
- `layout`: 'grid' | 'horizontal' | 'vertical'
- `showConfig`: Show the Edit layout button

`panelLayout.ts` holds the layout types (`GaugeType`, `GaugeSize`, `PanelLayout`), the default layout and `normalizePanelLayout()`, which keeps a stored layout valid (every gauge once, new gauges appended).

### Connections

#### InstrumentManager
Connects to instruments over USB (Web Serial), Bluetooth, Wi-Fi (WebSocket in the browser, directly or through the OpenSail bridge; plain TCP in the Windows and Android apps) or the built-in simulator, and shows connection status and received data. See `services/connections/README.md`.

#### StubControls
Adjusts what the instrument simulator sends while it runs (heading, speed, depth, apparent wind, position).

## Data Sources

The gauges read the Redux store:

### Navigation State
- `speed`: SOG (knots)
- `heading`: true heading (degrees)
- `course`: course over ground (degrees)
- `position`, `sources.position`

### Instruments State
- `depth`: water depth (metres)
- `windSpeed`: apparent wind speed (knots)
- `windDirection`: apparent wind angle (degrees)
- `waterSpeed`: speed through water from the log (knots)
- `dataStreams`: recent readings per data type (depth trend)

### Settings and Alerts
- `settings.speedGaugeMax`, `settings.instrumentPanelLayout`, `settings.alertThresholds`
- `alerts.active`: values outside their min/max limits

## Styling

Tailwind CSS. The gauge colours are CSS tokens in `index.css` (`--gauge-bg`, `--gauge-ink`, `--gauge-accent`, `--gauge-port`, `--gauge-starboard`, `--gauge-warning`, `--gauge-danger` and more), so night mode can change them.

## Integration

```tsx
// pwa/src/pages/InstrumentsPage.tsx
<InstrumentPanel showConfig={true} layout="grid" />
<InstrumentManager />
```
