---
inclusion: always
---

# Product Overview

OpenSail is an open-source (MIT) marine navigation app for recreational sailors, focused on Dutch inland waters and the coast. It started as a WinGPS equivalent for modern devices. One React codebase ships as a **Windows app**, an **Android app** and a **browser version** (PWA). It is a helpful extra on board, not a certified chart plotter: "not for navigation".

## Core Capabilities

Available in v0.3.0:
- Nautical chart: OpenStreetMap base map (OpenFreeMap), OpenSeaMap seamarks, Rijkswaterstaat inland ENC depth areas and hazards; follows the vessel, north-up or heading-up, Layers panel, instrument strip (SOG, COG, DEPTH, HDG, AWS)
- Offline charts: download regions at home, with chart editions and an update check
- Routes with active navigation: bearing, distance, cross-track error, ETA, auto-advance, route summary and hazard warnings (official inland, advisory on the coast)
- Tracks: recording, colours, GPX export, track to route
- Safety: always-visible man overboard with guidance back to the spot, anchor watch with drag alarm and event log, loud alarms (siren, full-screen alert, screen kept on; notifications on Android)
- Instruments: NMEA 0183, NMEA 2000 and SeaTalk over USB, Bluetooth or Wi-Fi; gauges for speed, depth, wind (apparent and computed true wind) and heading; units, min/max alerts, configurable panels; built-in instrument and GPS simulators
- Day, night (red on black) and automatic display mode

Not built yet (see `ROADMAP.md` "Next up"):
- Autopilot steering (next)
- AIS targets and collision warnings (Phase 5; only the map layer exists)
- Electronic logbook (Phase 6; hidden placeholder page)
- Weather, tides and currents (Phase 7)

## Target Platform

| Platform | How | Notes |
|---|---|---|
| **Windows** 10/11 | Tauri 2 app, NSIS installer `OpenSail_<version>_x64-setup.exe` | Unsigned (SmartScreen warning), no self-update yet. Direct TCP to Wi-Fi instruments. |
| **Android** 7+ | Capacitor 8 app, signed APK `OpenSail-<version>.apk` | Sideloaded, no Play Store. Direct TCP to Wi-Fi instruments; GPS, instruments and anchor watch keep running with the screen off. |
| **Browser** | The same build as a PWA | Hosted with user accounts on the maintainer's server (`DEPLOY.md`). Chrome or Edge recommended. |
| **iOS** | Not planned yet | See `docs/native-app-plan.md`. |

All three are released together: one version (`pwa/package.json`) and one GitHub release per tag `v*`.

## Instrument Connections by Platform

| Connection | Windows app | Android app | Chrome / Edge | Safari / Firefox |
|---|---|---|---|---|
| Wi-Fi (TCP gateway or autopilot) | Direct TCP | Direct TCP | Through WebSocket or the OpenSail bridge | Through WebSocket or the OpenSail bridge |
| USB serial | Not yet confirmed | ❌ | ✅ | ❌ |
| Bluetooth | Not yet confirmed | ❌ | ✅ | ❌ |
| Simulator | ✅ | ✅ | ✅ | ✅ |

Example: the Pcnautic / pypilot tiller pilot at `192.168.14.1:20220` on its Wi-Fi `pcnautic_AP`.

## Use Cases

### Primary Use Case: On Board
- Android tablet or phone, or a Windows laptop, in the cockpit or at the chart table
- Download charts for the sailing area beforehand
- Connect instruments or the autopilot over Wi-Fi
- Use offline while sailing; anchor watch overnight with the screen off (Android)

### Secondary Use Case: Planning at Home
- Plan routes on a laptop, check hazards along the route
- Download chart regions for the trip
- Review and export tracks

### Tertiary Use Case: Phone Backup
- Current position, route progress and man overboard on a phone

## Competitive Advantages

1. **Free and open source**: no subscription, no app store fees
2. **One codebase**: the same app on Windows, Android and in the browser
3. **Official Dutch inland chart data**: Rijkswaterstaat ENC, free (CC0)
4. **Works offline**: charts and all data stored on the device
5. **Privacy**: all navigation data stays on the device; the native apps have no accounts

## Target Users

- **Recreational sailors** on Dutch inland waters (IJsselmeer, Frisian lakes) and the coast
- **Budget-conscious boaters**: a free alternative to commercial apps
- **Multi-device users**: the same app on laptop, tablet and phone
