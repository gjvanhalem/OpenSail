# OpenSail for Windows

The OpenSail web app (`../pwa`) as a Windows program, built with [Tauri 2](https://tauri.app). It adds what a browser can't do:

- **Direct TCP to the instruments.** Instruments › Wi-Fi connects straight to the NMEA server of a Wi-Fi gateway or autopilot, such as the Pcnautic / pypilot autopilot on `192.168.14.1:20220`. The OpenSail bridge isn't needed.
- **Charts from GitHub.** The chart catalog and the PMTiles archives come from the public [opensail-charts](https://github.com/gjvanhalem/opensail-charts) releases (Rijkswaterstaat inland ENC, CC0-1.0). GitHub sends no CORS headers, so the app fetches them natively.

No accounts: everything stays on this computer. Not for navigation.

## Install

1. Download `OpenSail_<version>_x64-setup.exe` from the newest [OpenSail release](https://github.com/gjvanhalem/OpenSail/releases) (`v*`; the first Windows release was `desktop-v0.1.0`).
2. Run it. The installer isn't signed yet, so Windows SmartScreen warns: click **More info** → **Run anyway**. It installs for your user only (no administrator rights) and adds OpenSail to the Start menu.
3. Updates: install the newer setup over the old one. Routes, tracks, settings and downloaded charts are kept.

WebView2 (the Edge engine the app runs in) is part of Windows 11. On an older Windows 10 the installer downloads it.

## First run

- **Charts.** The chart shows the base map and seamarks online. The Rijkswaterstaat inland ENC (depths, bridges, fairways) appears once the [opensail-charts](https://github.com/gjvanhalem/opensail-charts) release exists. For the water, download a region at home: Chart › Offline charts › select an area › Download. It's stored in the app and works without internet.
- **Position.** Connect the autopilot or another instrument with GPS (below). Windows location (Settings › Privacy & security › Location, "Let desktop apps access your location") may also work for GPS, see [WebView2 notes](#webview2-notes).
- **Magnetic variation.** The autopilot sends a magnetic heading (HDM). Set Settings › Magnetic variation (° east, negative for west) so the chart shows true heading. In the Netherlands it's about +2°.

## Connecting to the autopilot (Pcnautic Easy Tiller Pilot)

1. Switch the autopilot on and join its Wi-Fi on the laptop: **`pcnautic_AP`**. The laptop has no internet on that network, which is fine with downloaded charts.
2. In OpenSail: **Instruments** › **Wi-Fi**. Host **`192.168.14.1`**, port **`20220`** (the defaults), protocol NMEA 0183 › **Connect over Wi-Fi**.
3. Heading (HDM), rudder (RSA), pitch/roll (XDR) and wind (MWV) appear under Received Data and on the chart. The address is remembered once it worked.

When the Wi-Fi drops, the app reconnects by itself (after 1 s, 2 s, 4 s … up to 15 s). OpenSail only reads: it sends nothing to the autopilot.

## WebView2 notes

The app runs in WebView2, Microsoft's Chromium. CI starts the built app on Windows and checks these (the table is in the job summary of the [Desktop app workflow](../.github/workflows/desktop.yml), screenshots in its `smoke-output` artifact):

Measured on the CI runner (WebView2 154, October 2026):

| Feature | In the app |
|---|---|
| Origin | `https://tauri.localhost`, a secure context |
| Storage (IndexedDB: routes, tracks, settings, chart tiles) | Works and survives a restart. Stored under `%LOCALAPPDATA%\nl.g-zeven.opensail\EBWebView`. `navigator.storage.persist()` returns false (quota about 10 GB on the runner). The data belongs to the app, not to a browser profile that gets cleaned up, but uninstalling may remove it. |
| Service worker | None registered: the app's files are on disk and update with the installer. |
| Charts | The catalog and PMTiles byte ranges load through native HTTP (`window.fetch` to GitHub is blocked by CORS, as expected); the ENC draws on the chart. |
| Alarm sound (Web Audio) | `AudioContext` runs. |
| Screen wake lock | `navigator.wakeLock.request('screen')` is granted. |
| GPS (`navigator.geolocation`) | The API exists, permission state "prompt": WebView2 asks the first time. It needs Windows location turned on and a location source (most laptops have none). Rely on GPS from the instruments. To test on the laptop. |
| USB serial (Web Serial) | `navigator.serial` exists and `getPorts()` works. Whether `requestPort()` shows a port picker in WebView2 can't be tested in CI: test on the laptop with a USB NMEA cable. Without a picker, the follow-up is `tauri-plugin-serialplugin`. |
| Bluetooth (Web Bluetooth) | `navigator.bluetooth` exists (no adapter on the runner). Device picker: to test on the laptop. |

## Build

Rust isn't needed on the dev laptop: CI builds and tests everything ([`.github/workflows/desktop.yml`](../.github/workflows/desktop.yml)):

- Every pull request that touches `desktop/` or `pwa/`, and main: `cargo fmt --check`, `cargo clippy`, `cargo test` (the TCP code in `src-tauri/src/tcp.rs`), the installer (downloadable as the `opensail-desktop-windows` artifact) and the smoke test (`smoke/smoke.mjs`).
- A release tag `v<version>` builds the installer and the Android APK and publishes both in one GitHub release. The version is `pwa/package.json`, shared with the Android app: see [docs/RELEASING.md](../docs/RELEASING.md).

With Rust installed, locally: `npm ci` in `pwa/` and here, then `npm run build` (or `npx tauri dev`, which uses `npm run dev -- --mode native` in `pwa/`).

### How it fits together

| Part | Where |
|---|---|
| Window, commands, plugins | `src-tauri/src/main.rs`, `src-tauri/tauri.conf.json` (`frontendDist` is `../../pwa/dist`, built by `npm run build:native`; `version` is read from `../../pwa/package.json`) |
| TCP sockets | `src-tauri/src/tcp.rs`: `tcp_connect(id, host, port)`, `tcp_write(id, data)`, `tcp_disconnect(id)`; events `tcp-data` `{id, data}` and `tcp-closed` `{id, error}` |
| HTTP without CORS | `tauri-plugin-http`, allowed for the opensail-charts release only (`src-tauri/capabilities/default.json`) |
| The app's side | `pwa/src/platform/` (`nativePlatform`, `nativeTcp`, `platformFetch`, `FetchRangeSource`) and `pwa/src/services/connections/NativeTcpConnection.ts` |
| Native build flag | `pwa/.env.native`: `VITE_NATIVE_APP=true` (no service worker, no accounts) and `VITE_CHART_CATALOG_URL`, the same build as the [Android app](../android/README.md) |

The app is served from `https://tauri.localhost`. Don't change that (`useHttpsScheme`): IndexedDB belongs to the origin, so a different one starts with empty storage.

Not yet: code signing (the SmartScreen warning) and self-update. Both work like in toodoo (`TAURI_SIGNING_PRIVATE_KEY`, `tauri-plugin-updater`) once wanted.
