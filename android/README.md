# OpenSail for Android

The OpenSail web app (`../pwa`) as an Android app, built with [Capacitor 8](https://capacitorjs.com). It's the same app as [OpenSail for Windows](../desktop/README.md), with what a phone browser can't do:

- **Direct TCP to the instruments.** Instruments › Wi-Fi connects straight to the NMEA server of a Wi-Fi gateway or autopilot, such as the Pcnautic / pypilot autopilot on `192.168.14.1:20220`. No bridge needed.
- **Charts from GitHub.** The chart catalog and the PMTiles archives come from the public [opensail-charts](https://github.com/gjvanhalem/opensail-charts) releases (Rijkswaterstaat inland ENC, CC0-1.0), fetched natively because GitHub sends no CORS headers.
- **GPS** from the phone or tablet (Android's fused location).
- **Screen off.** While an anchor watch, man overboard, route, track recording or instrument connection is on, the app keeps running with the screen locked, and alarms ring like an alarm clock.

No accounts: everything stays on the device. Not for navigation.

## Install

The app isn't in the Play Store. Install the APK by hand ("sideloading"):

1. On the phone or tablet, open the newest [OpenSail release](https://github.com/gjvanhalem/OpenSail/releases) and download `OpenSail-<version>.apk`.
2. Open the downloaded file. Android asks to allow installing apps from this source (your browser or file manager): **Settings** › allow, then go back and tap **Install**.
3. Play Protect may warn about an unknown developer: **More details** › **Install anyway**.

Updates: install the newer APK over the old one. Routes, tracks, settings and downloaded charts are kept. All releases are signed with the same key, so an update never needs an uninstall (uninstalling deletes the app's data).

Android 7 (API 24) or newer. Tested on the emulator in CI with Android 14.

## First run

- **Location permission.** Settings › GPS › **Real GPS** asks for the location permission. Choose **While using the app** and keep **Precise** on. That is enough for the screen-off mode: the app counts as in use while its notification shows.
- **Notifications.** The first anchor watch, route or instrument connection asks to allow notifications. Allow them: the alarms come as notifications when the screen is off.
- **Charts.** The base map and seamarks load online. For the water, download a region at home over Wi-Fi: Chart › Offline charts › select an area › Download. It's stored in the app and works without internet.
- **Magnetic variation.** The autopilot sends a magnetic heading (HDM). Set Settings › Magnetic variation (° east, negative for west) so the chart shows true heading. In the Netherlands it's about +2°.

## Connecting to the autopilot (Pcnautic Easy Tiller Pilot)

1. Switch the autopilot on and join its Wi-Fi: **`pcnautic_AP`**. Android says the network has no internet: choose **Stay connected** (or "Keep Wi-Fi connection"). Mobile data keeps working for the base map.
2. In OpenSail: **Instruments** › **Wi-Fi**. Host **`192.168.14.1`**, port **`20220`** (the defaults), protocol NMEA 0183 › **Connect over Wi-Fi**.
3. Heading (HDM), rudder (RSA), pitch/roll (XDR) and wind (MWV) appear under Received Data and on the chart. The address is remembered once it worked.

The app opens connections to a local address (`192.168.x.x`, `10.x.x.x`, `172.16–31.x.x`) over the Wi-Fi network, also when Android prefers mobile data because the boat's Wi-Fi has no internet. When the Wi-Fi drops, the app reconnects by itself (after 1 s, 2 s, 4 s … up to 15 s), and it closes a link that sends nothing for 30 s. OpenSail only reads: it sends nothing to the autopilot.

## With the screen off

As soon as an **anchor watch**, a **man overboard**, a **route**, a **track recording** or an **instrument connection** is on, a permanent notification shows "OpenSail is running: Anchor watch, Instruments on". While it shows, GPS, the autopilot's data and the anchor check keep running with the screen locked. It goes away when the last of them stops. Swiping OpenSail away from the recent apps stops everything.

**Alarms** (anchor dragging, man overboard, no GPS on the anchor watch, shallow water and other instrument alerts) ring like an alarm clock, with the alarm volume, until you open the app or tap **Silence** on the notification. They light up the screen over the lock screen. While OpenSail is on screen, the app's own alarm overlay and siren take over.

**Battery optimisation:** Android, and Samsung, Xiaomi and Huawei in particular, may still stop apps in the background to save battery. Before relying on the anchor watch overnight:

1. Settings › Apps › OpenSail › Battery › **Unrestricted** (or "Don't optimise").
2. Samsung: also Settings › Battery › Background usage limits: OpenSail must not be in "Sleeping apps" or "Deep sleeping apps".
3. Test it at home: drop anchor with a 20 m circle, lock the screen, walk 50 m away and wait for the alarm.

Running in the background uses noticeably more battery (GPS and Wi-Fi stay on). Keep the phone or tablet on a charger for a night at anchor.

## Testing on the boat (checklist)

1. Install the APK, open it, Settings › GPS › Real GPS: position appears on the chart.
2. Join `pcnautic_AP`, Instruments › Wi-Fi › Connect: heading, rudder and heel appear. The "OpenSail is running: Instruments on" notification shows.
3. Switch Wi-Fi off and on: the app reconnects by itself.
4. Drop anchor, lock the screen for a few minutes, unlock: the anchor watch is still running and its log has no gaps.
5. Drop anchor with a small circle, lock the screen and move away: the alarm rings and lights the screen. Silence it from the notification.
6. Chart › Offline charts: download a region at home, then check it shows with mobile data off.

## What works how (Android WebView)

CI starts the debug APK on an Android 14 emulator and checks these; the table is in the job summary of the [Android app workflow](../.github/workflows/android.yml), screenshots and logcat in its `android-smoke-output` artifact.

| Feature | In the app |
|---|---|
| Origin | `https://localhost`, a secure context. Don't change it (`server.androidScheme`): IndexedDB belongs to the origin. |
| Storage (IndexedDB) | In the app's own storage; survives restarts and updates, deleted on uninstall. |
| Service worker | None: the app's files are in the APK and update with it. |
| Charts | Catalog and PMTiles byte ranges through Android's HTTP client (CapacitorHttp). |
| GPS | `@capacitor/geolocation` (Google Play services' fused location). |
| USB serial, Bluetooth | Not in the Android WebView: use Wi-Fi instruments. |

## Build

The Android SDK and JDK aren't needed on the dev laptop: CI builds and tests everything ([`.github/workflows/android.yml`](../.github/workflows/android.yml)). Every pull request that touches `android/` or `pwa/`, and main:

- Kotlin unit tests (`native/app/src/test`: the TCP sockets against a local server);
- the debug APK, downloadable as the `opensail-android-debug` artifact. It installs **next to** the released app as "OpenSail (test)", with its own storage;
- the smoke test (`smoke/smoke.mjs`) on a Pixel 6 emulator: TCP, charts, GPS, and the screen-off anchor alarm.

Releases: see [docs/RELEASING.md](../docs/RELEASING.md).

With the Android SDK and JDK 21 installed, locally:

```bash
npm ci --prefix ../pwa
```

```bash
npm ci
```

```bash
npm run sync
```

Then `./gradlew assembleDebug` in `native/`, or open `native/` in Android Studio.

### How it fits together

| Part | Where |
|---|---|
| Capacitor config | `capacitor.config.json`: app id `nl.gzeven.opensail`, `webDir` is `../pwa/dist` (built by `npm run build:native`), the Android project in `native/` |
| TCP sockets | `native/app/src/main/java/nl/gzeven/opensail/tcp/`: `TcpSockets.kt` (plain JVM, unit tested) and `TcpPlugin.kt` (the `OpenSailTcp` plugin: `connect({id, host, port})`, `write({id, data})`, `disconnect({id})`; events `tcp-data` `{id, data}` and `tcp-closed` `{id, error}`, the same as the Windows app's Rust commands) |
| Screen off | `native/app/src/main/java/nl/gzeven/opensail/background/`: `NavigationService.kt` (foreground service, types location and connectedDevice, holds a CPU and a Wi-Fi lock) and `BackgroundPlugin.kt` (the `OpenSailBackground` plugin: `keepRunning({activities})`, `showAlarm({id, title, text})`, `clearAlarm({id})`, event `alarmsSilenced`; `AlarmBook.kt` decides which alarms are shown, unit tested). The page side: `pwa/src/services/backgroundMode.ts`, mounted by `useBackgroundMode` in the layout. |
| The app's side | `pwa/src/platform/`: `platform.ts` tells Tauri, Capacitor and the browser apart; `nativeTcp.ts`, `platformFetch.ts`, `geolocation.ts` and `background.ts` pick the implementation (in the browser and on Windows, `background.ts` does nothing). Features don't check the platform themselves. |
| Version | `pwa/package.json`, read by `native/app/build.gradle` (versionCode = major × 10000 + minor × 100 + patch) |
| Native build flag | `pwa/.env.native`: `VITE_NATIVE_APP=true` (no service worker, no accounts) and `VITE_CHART_CATALOG_URL` |

`npm run sync` regenerates `native/capacitor.settings.gradle`, `native/app/capacitor.build.gradle` and the copied web files; commit the first two when plugins change.
