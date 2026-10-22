# OpenSail Developer Guide

This guide is for developers who want to work on OpenSail or understand how it is built.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Architecture Overview](#architecture-overview)
4. [Key Technologies](#key-technologies)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Build and Deployment](#build-and-deployment)
8. [Contributing](#contributing)

---

## Development Setup

### Prerequisites

- **Node.js**: 24 (the version CI uses; the server and its tests need it)
- **npm**: comes with Node.js
- **Git**
- **Browser**: Chrome or Edge, for Web Serial and Web Bluetooth

You don't need Rust, a JDK or the Android SDK: CI builds the Windows and Android apps.

### Initial Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/gjvanhalem/OpenSail.git
   cd OpenSail/pwa
   ```

2. **Install Dependencies**:
   ```bash
   npm ci
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

   The app runs at `http://localhost:5173`.

No `.env` file is needed. The chart uses free OpenStreetMap tiles from OpenFreeMap, so there is no map token. `.env.native` holds the settings for the native build (`VITE_NATIVE_APP`, `VITE_CHART_CATALOG_URL`).

To try everything without a boat, use the GPS simulator (Settings → GPS Control) and the instrument simulator (Instruments → Simulator).

### Development Tools

- **VS Code** with ESLint, Prettier and Tailwind CSS IntelliSense
- **Browser DevTools**: Redux DevTools for state, the Application tab for IndexedDB and the service worker

---

## Project Structure

```
OpenSail/
├── pwa/                    # The one frontend: browser, Windows and Android
│   ├── public/             # Icons, offline.html
│   ├── e2e/                # Playwright tests, fixtures and helpers
│   ├── scripts/            # deploy-check, performance-audit, device-test
│   └── src/
│       ├── pages/          # Chart, Routes, Tracks, Instruments, Settings, Logbook (hidden)
│       ├── components/
│       │   ├── layout/     # AppBar (top tabs), BottomNav, Layout
│       │   ├── chart/      # ChartView, Layers panel, ENC layers, offline charts, tile protocol
│       │   ├── instruments/# Gauges, panels, simulator controls
│       │   ├── routes/     # Route planner, waypoint editor, summary, hazards
│       │   ├── tracks/     # Track list and recording controls
│       │   ├── safety/     # Man overboard, anchor watch, safety cluster
│       │   ├── alerts/     # Alarm overlay, alert banner
│       │   └── account/    # Account settings, user admin (browser version only)
│       ├── platform/       # Tauri / Capacitor / browser differences (see below)
│       ├── protocols/      # NMEA 0183, NMEA 2000 and SeaTalk parsers
│       ├── services/       # Connections, GPS, alarms, chart downloads, simulator
│       ├── store/          # Redux store and slices
│       ├── database/       # Dexie database, repositories, tile cache
│       ├── hooks/          # Custom React hooks
│       └── utils/          # Calculations, units, route guidance, GPX export
├── desktop/                # Windows app (Tauri 2)
├── android/                # Android app (Capacitor 8)
├── server/                 # Web server with user accounts (Node 24, no dependencies)
├── tools/
│   ├── enc-pipeline/       # Rijkswaterstaat ENC → PMTiles (Docker, GDAL + tippecanoe)
│   └── opensail-bridge/    # TCP/UDP → WebSocket relay for Wi-Fi instruments in the browser
└── docs/                   # Releasing, chart sources, native app plan, UI redesign
```

Some folders have their own README, for example `src/database/`, `src/store/`, `src/services/connections/` and `src/components/chart/OFFLINE_CHARTS_README.md`.

---

## Architecture Overview

### One Codebase, Three Ways to Ship

`pwa/` is the only frontend. The same build runs:

- **In the browser**, served by `server/` with user accounts (setup code, invites, admin and crew roles). See [DEPLOY.md](../DEPLOY.md).
- **As a Windows app**: Tauri 2 in `desktop/` wraps the build in WebView2. See [desktop/README.md](../desktop/README.md).
- **As an Android app**: Capacitor 8 in `android/`, with a Kotlin TCP plugin and a foreground service for background use. See [android/README.md](../android/README.md).

The native apps have no accounts. They use `npm run build:native`, which turns off the service worker and web manifest.

### The Platform Layer

All platform differences live in `src/platform/`. `platform.ts` detects Tauri, Capacitor or a browser at runtime, and features ask for a capability instead of checking the platform themselves:

- `platformFetch.ts` and `FetchRangeSource.ts`: native HTTP in the apps (no CORS), for chart downloads and PMTiles range requests
- `nativeTcp.ts`: direct TCP to Wi-Fi instruments in the apps
- `geolocation.ts`: device position
- `background.ts`: keep running with the screen off (Android foreground service)

### Charts

- **Base map**: OpenFreeMap vector tiles (OpenStreetMap), drawn by MapLibre GL.
- **Seamarks**: OpenSeaMap raster overlay.
- **Depth areas and hazards**: Rijkswaterstaat inland ENC, converted by `tools/enc-pipeline` to PMTiles and published in the [opensail-charts](https://github.com/gjvanhalem/opensail-charts) releases. The Zimablade serves its own copy at `/charts/`.
- **Offline**: downloaded regions are stored in IndexedDB and served to the map through an `opensail://` protocol (`src/components/chart/tileProtocol.ts`).

### Instruments

Parsers for NMEA 0183, NMEA 2000 and SeaTalk are in `src/protocols/`. Connections are in `src/services/connections/`:

- `SerialConnection`: USB (Web Serial, Chromium browsers)
- `BluetoothConnection`: Web Bluetooth
- `NativeTcpConnection`: Wi-Fi over direct TCP in the Windows and Android apps
- `WebSocketConnection`: Wi-Fi in the browser, through `tools/opensail-bridge` on `ws://localhost:10110`
- `StubConnection`: the built-in simulator, which generates real protocol data

### State and Storage

- **Redux Toolkit** slices in `src/store/slices/` (navigation, instruments, routes, tracks, safety, alerts, settings, chart cache, UI and more).
- **Dexie** (IndexedDB) in `src/database/`: routes, waypoints, tracks, safety events, settings, chart tiles and regions. Data access goes through repository classes in `src/database/repositories/`.
- Everything stays on the device. The server only stores user accounts.

---

## Key Technologies

- **React 19** and **TypeScript 5.9**
- **Vite 7** with `vite-plugin-pwa` (Workbox) for the service worker
- **Redux Toolkit 2**
- **Dexie 4** for IndexedDB
- **MapLibre GL 5** via `react-map-gl/maplibre`, with **PMTiles** for chart archives
- **Tailwind CSS 4**
- **React Router 7**
- **Vitest 4** for unit tests, **Playwright** for end-to-end tests
- **Tauri 2** (Windows) and **Capacitor 8** (Android)

---

## Development Workflow

### Scripts

Run these in `pwa/`:

```bash
npm run dev              # Dev server with HMR (http://localhost:5173)
npm run build            # Type check and web build in dist/
npm run build:native     # The build the Windows and Android apps wrap
npm run preview          # Serve the production build (http://localhost:4173)
npm run lint             # ESLint
npm run format           # Prettier
npx tsc -b               # Type check only
```

The root `package.json` has `dev`, `build`, `preview`, `test`, `test:e2e` and `lint` shortcuts that run in `pwa/`.

### Git Workflow

1. Create a branch: `git checkout -b feat/your-feature`
2. Make your changes, with tests
3. Commit with [conventional commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
4. Push and open a pull request

---

## Testing

### Unit Tests (Vitest)

```bash
npm test                 # Run once
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage
```

Unit tests sit next to the code in `__tests__/` folders. Integration tests are in `src/test/integration/`.

### E2E Tests (Playwright)

```bash
npm run build
npm run test:e2e
```

There are two Playwright projects that matter: `chromium` (the app on the preview server) and `accounts` (the server in `server/node.ts`, with sign-in and invites). CI runs both. See [e2e/README.md](e2e/README.md).

### Server and Bridge Tests

Run these from the repo root, with Node 24:

```bash
node --test server/server.test.ts
node --test tools/opensail-bridge/bridge.test.mjs
```

### Testing Best Practices

1. **Test behavior**, not implementation
2. **Use roles and labels** as selectors
3. **Keep tests independent**
4. **Mock hardware**: use the simulator and the stubbed tile servers, never real devices or external servers

---

## Build and Deployment

### Web

`npm run build` writes the web build to `dist/`. The browser version runs on the owner's Zimablade at https://opensail.g-zeven.nl, behind a Cloudflare Tunnel. It is served by `server/` from the Docker image `ghcr.io/gjvanhalem/opensail`, which `.github/workflows/image.yml` builds on every push to `main`. See [DEPLOY.md](../DEPLOY.md).

Netlify and Vercel are no longer used.

### Windows and Android

CI builds both apps from `npm run build:native`. Pushing a tag `vX.Y.Z` runs `.github/workflows/release.yml`, which builds and tests both and publishes one GitHub release with the Windows installer (`OpenSail_<version>_x64-setup.exe`) and the signed APK (`OpenSail-<version>.apk`). There is one version for all platforms, in `pwa/package.json`. See [docs/RELEASING.md](../docs/RELEASING.md).

### CI

| Workflow | What |
|---|---|
| `pwa-deploy.yml` | Lint, `tsc -b`, unit tests, server and bridge tests, Playwright (`chromium` and `accounts`), build |
| `android.yml` | Kotlin tests and APK; emulator smoke test only on tags or manual runs |
| `desktop.yml` | Rust fmt, clippy and tests when `desktop/` changes; installer and smoke test only on tags or manual runs |
| `release.yml` | Tags `v*`: builds, tests and publishes the release |
| `image.yml` | Docker image for the web version, on `main` |
| `pipeline-image.yml` | Chart pipeline image, when `tools/enc-pipeline` changes |

---

## Contributing

### Code Review

Every pull request runs lint, type checks, unit tests and the end-to-end tests. All checks must pass before merging.

### Contribution Guidelines

- Follow existing patterns, and keep functions small
- Put platform-specific code in `src/platform/`, not in features
- Add unit tests for new logic and an E2E test for new user workflows
- Update the docs and the [User Guide](USER_GUIDE.md) for features people will see

### What's Next

Plans and open work are in [ROADMAP.md](../ROADMAP.md). The original requirements (R1–R15) are in `.kiro/specs/marine-navigation-system/requirements.md`; the Kiro specs are historical design documents, not the current architecture.

---

## Debugging

### Common Issues

#### Service Worker Not Updating

In development, unregister it in DevTools → Application → Service Workers, or run:

```javascript
navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(reg => reg.unregister()));
```

#### IndexedDB Quota Exceeded

Downloaded chart regions take the most space. Check usage with:

```javascript
const estimate = await navigator.storage.estimate();
console.log(`Using ${estimate.usage} of ${estimate.quota} bytes`);
```

---

## Resources

- [React](https://react.dev)
- [Vite](https://vite.dev/guide/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [PMTiles](https://docs.protomaps.com/pmtiles/)
- [Dexie.js](https://dexie.org/)
- [Tauri](https://tauri.app/)
- [Capacitor](https://capacitorjs.com/)
- [SeaTalk protocol](https://www.thomasknauf.de/seatalk.htm)

---

**Happy Coding! ⚓**
