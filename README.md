# OpenSail

Open-source marine navigation for recreational sailors, made for Dutch inland waters and the coast. One app for your **Windows laptop**, your **Android phone or tablet**, and the **browser**.

[![Latest release](https://img.shields.io/github/v/release/gjvanhalem/OpenSail?label=release)](https://github.com/gjvanhalem/OpenSail/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> ⚠️ **Not for navigation.** OpenSail is a helpful extra on board, not a certified chart plotter. Always carry official charts and keep a proper lookout.

## Download

Get the newest version from **[Releases](https://github.com/gjvanhalem/OpenSail/releases/latest)**:

| Platform | File | Notes |
|---|---|---|
| **Windows** 10/11 | `OpenSail_<version>_x64-setup.exe` | The installer isn't code-signed yet, so Windows shows *"unknown publisher"*: choose **More info → Run anyway**. Updates install over the old version. |
| **Android** 7+ | `OpenSail-<version>.apk` | Allow *"install unknown apps"* for your browser or file manager. For anchor watch with the screen off, set the app's battery use to **Unrestricted**. |
| **Browser** | — | Chrome or Edge recommended. A hosted version with user accounts runs on the maintainer's server ([DEPLOY.md](DEPLOY.md)). |

How to use it, step by step: **[User guide](pwa/USER_GUIDE.md)**.

## What it does

- **Nautical chart**: OpenStreetMap base map, OpenSeaMap buoys, beacons and lights, and Rijkswaterstaat depth areas and hazards for Dutch inland waters. The chart follows the boat, north-up or heading-up, with a Layers panel.
- **Offline**: download chart regions at home and use them without internet on the water.
- **Routes**: plan with waypoints, then navigate with bearing, distance, cross-track error and ETA. It moves to the next waypoint automatically and warns about shallow water and hazards.
- **Tracks**: record, colour, export as GPX, and turn a track into a route.
- **Safety**: an always-visible **man overboard** button with guidance back to the spot, and an **anchor watch** with a drag alarm. Alarms ring loudly and keep the screen on. On Android they keep running with the screen off.
- **Instruments**: NMEA 0183, NMEA 2000 and SeaTalk over **USB**, **Bluetooth** or **Wi-Fi**. The apps connect straight to a Wi-Fi gateway or autopilot over TCP, for example the Pcnautic tiller pilot at `192.168.14.1:20220`. Gauges show speed, depth, wind (apparent and calculated true wind) and heading, with an instrument strip on the chart, units, min/max alarms and a built-in simulator.
- **Day and night mode**: red on black at night, or automatic.

**Not there yet:** AIS targets and collision warnings, the logbook, and weather and tides. See the [roadmap](ROADMAP.md#next-up).

## How it's built

One React app (`pwa/`) runs everywhere. Only a thin platform layer (`pwa/src/platform/`) differs per platform.

```
pwa/            the app: React 19, TypeScript, Vite 7, Redux Toolkit, Dexie (IndexedDB),
                MapLibre GL, Tailwind 4; protocol parsers, chart, safety, instruments
  src/platform/ browser / Tauri / Capacitor: native fetch, TCP, GPS, background mode
desktop/        Windows app (Tauri 2, Rust)
android/        Android app (Capacitor 8, Kotlin TCP plugin, foreground service)
server/         Node 24 server for the hosted browser version (sign-in, invites, roles)
tools/
  enc-pipeline/     Rijkswaterstaat S-57 charts → PMTiles (Docker: GDAL + tippecanoe)
  opensail-bridge/  TCP/UDP NMEA → WebSocket, for Wi-Fi instruments in the browser
docs/           releasing, chart sources, decisions, native app plan, UI redesign
```

Chart archives are published in the public repo **[opensail-charts](https://github.com/gjvanhalem/opensail-charts)**.

## Development

You need **Node.js 22 or newer**. Rust, the JDK and the Android SDK are only needed to build the apps yourself; GitHub Actions builds and tests those.

```bash
cd pwa
```

```bash
npm ci
```

```bash
npm run dev
```

The app runs at http://localhost:5173. No API keys or `.env` are needed. Use the GPS simulator (Settings → Navigation sources → GPS Mode → Simulator) and the instrument simulator (Instruments → Simulator) to try everything without a boat.

| Command (in `pwa/`) | What |
|---|---|
| `npm run build` | Web build in `pwa/dist` |
| `npm run build:native` | The build the Windows and Android apps wrap |
| `npm test` | Unit tests (Vitest) |
| `npx playwright test --project=chromium --project=accounts` | End-to-end tests as CI runs them (Playwright; `npm run test:e2e` also runs Firefox, WebKit and mobile projects) |
| `npm run lint` | ESLint |

Server and bridge tests (Node 24): `node --test server/server.test.ts` and `node --test tools/opensail-bridge/bridge.test.mjs`, run from the repo root. The root `package.json` has `dev`, `build`, `test`, `test:e2e` and `lint` shortcuts that run in `pwa/`.

More: **[Developer guide](pwa/DEVELOPER_GUIDE.md)**, [Windows app](desktop/README.md), [Android app](android/README.md), [hosting on a home server](DEPLOY.md).

## Releases

There's one version for all platforms, in `pwa/package.json`. Pushing a tag `vX.Y.Z` runs every test, including the Windows and Android smoke tests, and publishes one GitHub release with the Windows installer and the signed APK. See **[docs/RELEASING.md](docs/RELEASING.md)**.

## Contributing

Issues and pull requests are welcome. Use [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:` …). Every pull request runs lint, type checks, unit tests and the end-to-end tests. Plans and open work are in **[ROADMAP.md](ROADMAP.md)**. The original requirements (R1–R15) are in `.kiro/specs/marine-navigation-system/requirements.md`.

## License

[MIT](LICENSE). The chart data has its own licences and credits, which the app shows: OpenStreetMap / OpenFreeMap (ODbL), OpenSeaMap (CC BY-SA) and Rijkswaterstaat ENC (CC0).
