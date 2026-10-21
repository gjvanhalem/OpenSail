# Device Testing Guide

How to test OpenSail on real devices: the browser version, the Windows app and the Android app. Most of it is automated; this guide is for what CI can't check.

## What CI already covers

| Where | What | When |
|---|---|---|
| `pwa-deploy.yml` | Lint, types, unit tests, server and bridge tests, Playwright projects `chromium` and `accounts` | Pull requests and main that touch `pwa/`, `server/` or the bridge |
| `desktop.yml` | The Windows installer started in WebView2: storage, charts, wake lock, Web Audio, Web Serial and Web Bluetooth present | Release tags `v*` and by hand |
| `android.yml` | The debug APK on an Android 14 emulator: TCP, charts, GPS and the screen-off anchor alarm | Release tags `v*` and by hand |

The smoke test results are tables in the job summaries; see [desktop/README.md](../desktop/README.md#webview2-notes) and [android/README.md](../android/README.md#what-works-how-android-webview). Releasing: [docs/RELEASING.md](../docs/RELEASING.md).

Locally, Playwright has more projects than CI runs:

```bash
cd pwa
npm run test:e2e:chromium   # Chrome / Edge
npm run test:e2e:firefox
npm run test:e2e:webkit     # Safari's engine
npm run test:e2e            # every project, including Mobile Chrome and Mobile Safari
```

## Testing Checklist

Use this on each device. Most of it works without a boat: **Instruments → Simulator** sends NMEA data and **Settings → Navigation sources → GPS Mode → Simulator** sails a track on the IJsselmeer.

### ✅ Layout
- [ ] Wide screen (1024 px and up): the tabs Chart, Routes, Tracks, Instruments, Settings are in the top bar
- [ ] Narrower: the same tabs are in the bottom bar, within thumb reach
- [ ] The status chip in the top bar shows the connection and the position, and opens Instruments
- [ ] **MOB** and the anchor button are bottom left on every page, also in full screen
- [ ] The moon button switches night mode (red on black); **Settings → Boat & units → Display** offers Day, Night and Auto
- [ ] Full screen hides the bars; the button at the top brings them back
- [ ] Touch targets are big enough to hit with wet fingers; no horizontal scrolling; rotating the device works

### ✅ Chart
- [ ] Base map, OpenSeaMap seamarks and the Rijkswaterstaat inland ENC show (online)
- [ ] "Not for navigation" stays on the chart
- [ ] The map buttons on the right work: follow vessel, N↑ / H↑, Layers, Offline charts, zoom
- [ ] Layers switches seamarks, inland ENC, routes, tracks and AIS targets
- [ ] The instrument strip shows SOG, COG and DEPTH (on a phone), plus HDG and AWS on wider screens, and opens Instruments
- [ ] Panning stops following the vessel; the follow button turns it back on

### ✅ Offline
- [ ] Offline charts → **Select Region on Map** → **Select This Area** → name → **Start Download** finishes
- [ ] With the network off (airplane mode), restart the app: it starts and the downloaded region draws, with depth areas
- [ ] Downloaded Regions shows the edition and offers **Update** when a newer edition exists
- [ ] Routes, tracks and settings are still there after a restart

### ✅ Navigation
- [ ] Routes → **+ New Route**, tap the map to add waypoints, **Save Route**; the hazard check lists shallow water and hazards
- [ ] **Navigate** shows BRG, DTW, XTE and ETA on the chart and moves to the next waypoint on arrival; **Stop route** ends it
- [ ] Tracks → **Start Recording**, **Pause**, **Resume**, **Stop & Save**; **Export as GPX** and **Convert to route** work

### ✅ Safety and alarms
- [ ] **Settings → Alarms → Test alarm** sounds the siren and shows the full-screen alarm; **Silence** stops it
- [ ] **MOB** records the position, sounds the alarm and shows bearing and distance back; **Clear MOB** needs a second tap
- [ ] Anchor → **Drop anchor here**; moving outside the circle raises the DRAGGING alarm
- [ ] An instrument alert (for example a minimum depth in **Settings → Alarms**) shows a banner until **Acknowledge**
- [ ] The screen stays on while an alarm sounds or a watch runs (or the app says the browser can't do that)

### ✅ Instruments
- [ ] The simulator fills the gauges (speed, depth, wind with true wind, heading)
- [ ] **Edit layout** shows, hides and reorders gauges
- [ ] A real connection: USB, Bluetooth or Wi-Fi (below)

## Platform-Specific Testing

### Browser (Windows, Android, iPad)

**Recommended:** Chrome or Edge. USB serial and Bluetooth only work in Chromium browsers; Safari and Firefox have neither.

- Open the hosted version (https://opensail.g-zeven.nl, sign in) or `npm run preview` on `localhost`. GPS, installing and offline need HTTPS or `localhost`.
- Install it: Chrome or Edge **⋮ → Install app**, Safari **Share → Add to Home Screen**. It opens without browser bars.
- **USB:** plug in the NMEA cable, Instruments → **USB Serial** → **Connect to USB Port**, pick the port.
- **Bluetooth:** Instruments → **Bluetooth** → **Connect to Bluetooth Device**.
- **Wi-Fi:** start the [OpenSail bridge](../tools/opensail-bridge/README.md) on the laptop, then Instruments → **Wi-Fi** → `ws://localhost:10110` → **Connect over Wi-Fi**.
- **iPad / iPhone:** iOS suspends the page when the screen locks or you switch apps: no GPS, no alarms. Test the alarms with Auto-Lock set to Never.

### Windows app

- Install `OpenSail_<version>_x64-setup.exe` from the release (SmartScreen: **More info → Run anyway**).
- **Wi-Fi:** join `pcnautic_AP`, Instruments → **Wi-Fi**, host `192.168.14.1`, port `20220`. No bridge needed.
- Still to confirm on a real laptop: the USB port picker and the Bluetooth device picker in WebView2, and Windows location as a GPS source. See [desktop/README.md](../desktop/README.md#webview2-notes).

### Android app

- Install `OpenSail-<version>.apk` from the release (or the `opensail-android-debug` artifact, which installs next to it as "OpenSail (test)").
- USB serial and Bluetooth aren't available in the Android app: use Wi-Fi instruments.
- Follow the boat checklist in [android/README.md](../android/README.md#testing-on-the-boat-checklist): GPS, the autopilot over Wi-Fi, reconnecting, and the anchor alarm with the screen off.

## Testing Tools

### Remote Debugging

**Android (browser or debug APK):**
```bash
# Enable USB debugging on the device
# Connect via USB
# Open chrome://inspect in desktop Chrome
# Click "Inspect" on OpenSail
```

**iOS:**
```bash
# Enable Web Inspector on the iOS device
# Connect to a Mac via USB
# Open Safari → Develop → [Your Device]
# Select the page to inspect
```

### Device report script

Run in the browser console (or the remote inspector) and paste the table into the report:

```javascript
const testReport = {
  device: navigator.userAgent,
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  online: navigator.onLine,
  serviceWorker: 'serviceWorker' in navigator,
  indexedDB: 'indexedDB' in window,
  geolocation: 'geolocation' in navigator,
  wakeLock: 'wakeLock' in navigator,
  bluetooth: 'bluetooth' in navigator,
  serial: 'serial' in navigator,
  standalone: window.matchMedia('(display-mode: standalone)').matches
};

console.table(testReport);
```

**Settings → About** shows the app version and which device features the browser supports.

## Test Report Template

Open a GitHub issue with this for every problem found:

```markdown
**Version:** [Settings → About]
**Device / OS:** [e.g. Galaxy Tab S9, Android 14]
**Shell:** [Browser (which) / Windows app / Android app]
**Screen:** [width x height, portrait or landscape]

**What I did:**
**What happened:**
**What I expected:**
**Screenshot / console output:**
```
