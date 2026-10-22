# OpenSail App

The OpenSail frontend. This one codebase is the browser version and is wrapped by the Windows app (`desktop/`, Tauri) and the Android app (`android/`, Capacitor).

## 📚 Documentation

- **[User Guide](USER_GUIDE.md)** - Installation, usage, and troubleshooting for end users
- **[Developer Guide](DEVELOPER_GUIDE.md)** - Setup, architecture, testing, and contributing
- **[E2E Tests](e2e/README.md)** - Running and writing the Playwright tests

## 🚀 Quick Start

### For Users

- **Windows**: download `OpenSail_<version>_x64-setup.exe` from the [GitHub releases](https://github.com/gjvanhalem/OpenSail/releases). It is unsigned, so Windows SmartScreen shows a warning.
- **Android**: download and sideload the signed `OpenSail-<version>.apk` from the same release.
- **Browser**: the hosted version needs an account (invite only). Chrome or Edge is recommended.

See the [User Guide](USER_GUIDE.md) for detailed instructions.

### For Developers

```bash
npm ci
npm run dev
```

The app runs at http://localhost:5173. No `.env` or map token is needed.

See the [Developer Guide](DEVELOPER_GUIDE.md) for complete setup instructions.

## 🛠️ Tech Stack

- **React 19** with TypeScript 5.9
- **Vite 7** with `vite-plugin-pwa` (Workbox)
- **Redux Toolkit 2** for state management
- **MapLibre GL 5** (via `react-map-gl/maplibre`) on OpenFreeMap tiles, with PMTiles for chart archives
- **Dexie 4** for IndexedDB storage
- **Tailwind CSS 4**
- **Vitest 4** for unit tests, **Playwright** for E2E tests

## 📁 Project Structure

```
src/
├── pages/         # Chart, Routes, Tracks, Instruments, Settings
├── components/    # UI: layout, chart, instruments, routes, tracks, safety, alerts, account
├── platform/      # Tauri / Capacitor / browser differences
├── protocols/     # NMEA 0183, NMEA 2000, SeaTalk parsers
├── services/      # Connections, GPS, alarms, chart downloads, simulator
├── store/         # Redux store and slices
├── database/      # Dexie database and repositories
├── hooks/         # Custom React hooks
└── utils/         # Calculations, units, route guidance, GPX export
```

## 🔧 Development Scripts

```bash
# Development
npm run dev              # Start dev server with HMR
npm run build            # Type check and build for the web
npm run build:native     # Build for the Windows and Android apps
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier
npx tsc -b               # TypeScript type checking

# Testing
npm test                 # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run E2E tests (build first)
npm run test:e2e:ui      # Run E2E tests in UI mode
```

## 🌐 Browser Compatibility

| Feature | Chrome/Edge | Safari | Firefox |
|---------|-------------|--------|---------|
| Chart, routes, tracks, safety | ✅ | ✅ | ✅ |
| Offline charts | ✅ | ✅ | ✅ |
| USB instruments (Web Serial) | ✅ | ❌ | ❌ |
| Bluetooth instruments | ✅ | ❌ | ❌ |
| Wi-Fi instruments (through the bridge) | ✅ | ✅ | ✅ |

The Windows and Android apps connect to Wi-Fi instruments directly, without the bridge.

## 🚢 Features

- **Charts**: OpenFreeMap base map, OpenSeaMap seamarks, and Rijkswaterstaat inland ENC depth areas and hazards
- **Offline charts**: download regions, with editions and an update check
- **Chart view**: follows the vessel, north-up or heading-up, Layers panel, instrument strip
- **Routes**: planning, active navigation (bearing, distance, XTE, ETA), route summary, hazard warnings
- **Tracks**: recording, colours, GPX export, track to route
- **Safety**: man overboard, anchor watch, alarms with a siren and full-screen alert
- **Instruments**: NMEA 0183, NMEA 2000 and SeaTalk over USB, Bluetooth or Wi-Fi, with a built-in simulator
- **Night mode**: Day, Night (red on black) or Auto

AIS, the logbook, weather and tides are not built yet. See [ROADMAP.md](../ROADMAP.md).

## 🚀 Deployment

The browser version is served by `server/` (with user accounts) from the Docker image `ghcr.io/gjvanhalem/opensail`. See [DEPLOY.md](../DEPLOY.md). The Windows and Android apps are released together from a version tag; see [docs/RELEASING.md](../docs/RELEASING.md).

## 🤝 Contributing

We welcome contributions! See the [Developer Guide](DEVELOPER_GUIDE.md#contributing).

## 📄 License

[MIT](../LICENSE), see the [main README](../README.md#license) for the chart data licences.

## 🆘 Support

- **User Issues**: See [User Guide](USER_GUIDE.md#troubleshooting)
- **Bug Reports and Feature Requests**: Open a GitHub issue

---

**Happy Sailing! ⛵**
