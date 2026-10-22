# Technical Stack and Architecture

## Technology Stack

One frontend, `pwa/`, runs in the browser and inside the Windows and Android apps. Versions are in `pwa/package.json`.

### Core Framework
- **React 19**: UI library
- **TypeScript 5.9**: strict type checking (`tsc -b` in the build)
- **Vite 7**: build tool and dev server
- **React Router 7**: pages (Chart, Instruments, Routes, Tracks, Settings)

### PWA Infrastructure
- **vite-plugin-pwa / Workbox 7**: service worker for the app files (browser version only; the native apps have none)
- **Web App Manifest**: installable from the browser
- **HTTPS**: required for PWA features and the device APIs

### State Management
- **Redux Toolkit 2**: slices in `pwa/src/store/slices/`
- **React-Redux 9**

### Data Storage
- **IndexedDB** through **Dexie 4** (`pwa/src/database/`): routes, waypoints, tracks, safety events, settings, AIS targets, logbook, offline chart tiles and regions
- **Repository pattern**: one repository per data type

### Mapping and Charts
- **MapLibre GL 5** through `react-map-gl/maplibre` 8. No Mapbox, no token.
- **PMTiles 4**: chart archives read with HTTP range requests
- **Base map**: OpenFreeMap (OpenStreetMap, ODbL)
- **Seamarks**: OpenSeaMap raster overlay (CC BY-SA), with a "not for navigation" disclaimer
- **Depth areas and hazards**: Rijkswaterstaat inland ENC (CC0), converted to PMTiles by `tools/enc-pipeline` (Docker: GDAL + tippecanoe) and published in the public repo `gjvanhalem/opensail-charts` (GitHub releases)
- **One tile protocol**: every tile goes through `opensail://` (`components/chart/tileProtocol.ts`): IndexedDB first, then the network

### Native Apps
- **Windows**: Tauri 2 in `desktop/` (Rust, WebView2). NSIS installer, unsigned, no self-update yet.
- **Android**: Capacitor 8 in `android/` (Kotlin TCP plugin, foreground service for background and screen-off use, alarms as notifications). Signed APK, sideloaded.
- **Platform layer** `pwa/src/platform/`: `platform.ts` picks Tauri, Capacitor or browser at runtime. Native fetch without CORS (`platformFetch.ts`, `FetchRangeSource.ts`), direct TCP (`nativeTcp.ts`), geolocation (`geolocation.ts`), background mode (`background.ts`).
- `npm run build:native` (`--mode native`, `.env.native`): no service worker, no accounts, chart catalog from the opensail-charts releases.

### Hosted Browser Version
- `server/`: Node 24 server without dependencies; serves the app and `/charts/`, with user accounts (setup code, invites, admin and crew roles)
- Runs as Docker image `ghcr.io/gjvanhalem/opensail` on the owner's home server behind a Cloudflare Tunnel. See `DEPLOY.md`.

### Device Integration
- **Web Serial API**: USB instruments (Chromium browsers)
- **Web Bluetooth API**: Bluetooth instruments (Chromium browsers)
- **Wi-Fi**: direct TCP in the native apps; in the browser a WebSocket, to a gateway or to `tools/opensail-bridge` (Node, relays TCP/UDP to `ws://localhost:10110`, read-only by default)
- **Geolocation**: `navigator.geolocation`, or `@capacitor/geolocation` in the Android app
- **Web Audio and Screen Wake Lock**: alarm siren and keeping the screen on

### UI Framework
- **Tailwind CSS 4**, colours as CSS variables in `index.css` so night mode (red on black) only redefines them

### Testing
- **Vitest 4** with Testing Library and `fake-indexeddb`
- **Playwright**: end-to-end tests in `pwa/e2e/` (CI runs the `chromium` and `accounts` projects)
- **node --test**: server (`server/server.test.ts`) and bridge (`tools/opensail-bridge/bridge.test.mjs`)
- Kotlin unit tests and an emulator smoke test (Android), `cargo test` and a smoke test (Windows), in CI

### Development Tools
- **ESLint 9** (flat config) with typescript-eslint
- **Prettier 3**

## Project Structure

```
pwa/                      the one frontend
├── src/
│   ├── components/       chart/, instruments/, routes/, tracks/, safety/, alerts/,
│   │                     layout/ (top tabs, bottom bar), account/
│   ├── pages/            Chart, Instruments, Routes, Tracks, Settings (Logbook hidden)
│   ├── services/         connections/, alarm/, simulator/, GPS, chart download and catalog,
│   │                     track recording, route hazards, error handling
│   ├── protocols/        NMEA 0183, NMEA 2000 and SeaTalk parsers
│   ├── platform/         browser / Tauri / Capacitor differences
│   ├── database/         Dexie database, repositories, TileCache
│   ├── store/            Redux store and slices
│   ├── hooks/            custom React hooks
│   ├── models/           TypeScript data models
│   └── utils/            calculations, formatting, route guidance, GPX export, feature detection
├── e2e/                  Playwright tests
└── public/               icons and static files
desktop/                  Windows app (Tauri 2)
android/                  Android app (Capacitor 8)
server/                   Node server for the hosted browser version
tools/enc-pipeline/       Rijkswaterstaat ENC → PMTiles
tools/opensail-bridge/    TCP/UDP NMEA → WebSocket
docs/                     releasing, chart decisions, native app plan, UI redesign
.github/workflows/        CI and releases
```

## Architecture Patterns

### One Codebase, Three Platforms
- The same `pwa/` build runs in the browser, in WebView2 (Windows) and in the Android WebView
- Platform differences only in `pwa/src/platform/`
- Native apps have no accounts; the hosted browser version has

### Offline-First Design
- The service worker (browser) or the app package (native) holds the app files
- IndexedDB stores all navigation data locally
- Chart regions are downloaded for offline use (Chart page → Offline charts); tiles are stored per region, with editions and an update check

### Repository Pattern
- Data access through repositories on Dexie
- Consistent CRUD interfaces across data types

### Connection and Protocol Parser Pattern
- Every connection (`SerialConnection`, `BluetoothConnection`, `WebSocketConnection`, `NativeTcpConnection`, `StubConnection`) hands over one line at a time
- `InstrumentDataService` passes lines to the parser for the protocol
- Readings go to Redux; position, COG/SOG and heading go through the navigation source settings (auto, GPS or instrument)
- `StubConnection` simulates an instrument bus in all three protocols

## Marine Protocols

### NMEA 0183
- Sentences: GGA, RMC, GLL, VTG, DBT, DPT, MWV, VHW, HDG, HDM, HDT, RSA (rudder), XDR (heel, pitch), VDM/VDO (recognised; no AIS decoder yet)
- Checksum validation
- A magnetic heading becomes true with the magnetic variation setting, when no instrument sends variation

### NMEA 2000
- PGNs: 126992, 127250, 127251, 128259, 128267, 129025, 129026, 129029, 130306, 130310
- Through a gateway (USB, Wi-Fi); a browser can't talk to CAN directly

### SeaTalk (Raymarine)
- Datagrams: 00 (depth), 10/11 (apparent wind), 20 (speed through water), 23/27 (water temperature), 50/51 (latitude/longitude), 52 (SOG), 53 (COG), 84 (autopilot heading), 89 (compass heading), 99 (variation)
- As `$STALK` sentences, the way SeaTalk-to-NMEA gateways forward them

## Data Flow

### Instrument Data Flow
1. Instrument → USB, Bluetooth, WebSocket or native TCP connection
2. Protocol parser → structured data
3. Redux (`instrumentsSlice`, `navigationSlice`) → gauges, instrument strip, alerts

### Route Navigation Flow
1. User creates waypoints → route saved in IndexedDB
2. Hazard check along the route (official inland ENC, advisory on the coast)
3. Active navigation: bearing, distance, XTE, ETA, auto-advance within the arrival radius

### Offline Chart Flow
1. User selects the visible map area → Offline Charts panel
2. Base map, seamark and ENC tiles and label glyphs for the chosen zoom levels → TileCache (IndexedDB)
3. The `opensail://` protocol serves stored tiles; offline, a missing tile is empty

### Safety Flow
- Man overboard and anchor watch events are logged in IndexedDB and restored after a restart
- Alarms: Web Audio siren, full-screen alert, wake lock; Android notifications with the screen off

## Browser Compatibility

- **Chrome / Edge**: all browser features, including Web Serial and Web Bluetooth
- **Safari, Firefox**: no USB or Bluetooth instruments; Wi-Fi instruments through WebSocket work
- Runtime feature detection (`utils/featureDetection.ts`); the warning banner is not shown in the native apps

## Build and Development

### Scripts (in `pwa/`)
- `npm run dev`: dev server at http://localhost:5173 (no `.env` or tokens needed)
- `npm run build`: web build in `pwa/dist`
- `npm run build:native`: the build the Windows and Android apps wrap
- `npm test`: Vitest
- `npm run test:e2e`: Playwright
- `npm run lint`: ESLint
- `npm run format`: Prettier

The root `package.json` has `dev`, `build`, `preview`, `test`, `test:e2e` and `lint` shortcuts that run in `pwa/`. Rust, the JDK and the Android SDK are not needed locally: CI builds the apps.

### CI (`.github/workflows/`)
- `pwa-deploy.yml`: lint, `tsc -b`, Vitest, server and bridge tests, Playwright (chromium, accounts), build
- `android.yml`: Kotlin tests, APK; emulator smoke test on tags and manual runs
- `desktop.yml`: Rust fmt/clippy/test when `desktop/` changes; installer and smoke test on tags and manual runs
- `release.yml`: tag `v*` builds and tests both apps and publishes one GitHub release with the `.exe` and `.apk` (see `docs/RELEASING.md`)
- `image.yml`: Docker image of the web version on main
- `pipeline-image.yml`: chart pipeline image when `tools/enc-pipeline` changes

### Versioning
One version for all platforms: `pwa/package.json`.

## Security Considerations

1. **HTTPS Required**: PWA features and device APIs need a secure context
2. **User Permissions**: explicit prompts for device and location access
3. **Data Privacy**: all navigation data stored locally on the device
4. **Accounts**: only on the hosted browser version (`server/`)
5. **Wi-Fi links are read-only**: nothing is sent to an autopilot by default

## Known Limitations

1. **Browser device APIs**: Web Serial and Web Bluetooth only in Chromium browsers; not in the Android app
2. **Background in the browser**: a browser tab stops with the screen off; the Android app uses a foreground service
3. **Windows installer**: unsigned (SmartScreen warning), no self-update yet
4. **Not built yet**: AIS decoding and CPA (Phase 5), logbook (Phase 6), weather and tides (Phase 7), autopilot steering. `ROADMAP.md` "Next up" is the source for plans.
