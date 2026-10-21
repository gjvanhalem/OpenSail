# OpenSail User Guide

Welcome to OpenSail, open-source marine navigation for recreational sailors, made for Dutch inland waters and the coast. This guide explains how to install it and how to use it on board.

> ⚠️ **Not for navigation.** OpenSail is a helpful extra, not a certified chart plotter. Always carry official charts and keep a proper lookout.

## Table of Contents

1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [The Chart](#the-chart)
4. [Offline Charts](#offline-charts)
5. [Connecting Instruments](#connecting-instruments)
6. [Routes and Tracks](#routes-and-tracks)
7. [Safety: Man Overboard and Anchor Watch](#safety-man-overboard-and-anchor-watch)
8. [Settings](#settings)
9. [Not There Yet](#not-there-yet)
10. [Troubleshooting](#troubleshooting)

---

## Installation

OpenSail is one app in three forms. They look and work the same; the differences are in how they connect and what they can do with the screen off.

| | Windows app | Android app | Browser |
|---|---|---|---|
| Install from | [GitHub release](https://github.com/gjvanhalem/OpenSail/releases/latest) | [GitHub release](https://github.com/gjvanhalem/OpenSail/releases/latest) | https://opensail.g-zeven.nl (account needed) |
| Wi-Fi instruments and autopilot | Directly | Directly | Through the OpenSail bridge on a laptop |
| USB and Bluetooth instruments | Should work, not tested yet | No | Chrome and Edge |
| Keeps running with the screen off | No | Yes | No |
| Account | No, data stays on the computer | No, data stays on the device | Yes |

### On Windows

1. Download `OpenSail_<version>_x64-setup.exe` from the newest [release](https://github.com/gjvanhalem/OpenSail/releases/latest).
2. Run it. The installer isn't code-signed yet, so Windows SmartScreen warns about an unknown publisher: click **More info** → **Run anyway**.
3. OpenSail is installed for your user only and appears in the Start menu.

To update, install the newer setup over the old one. Your routes, tracks, settings and downloaded charts are kept. There's no automatic update yet: check the releases page now and then.

### On Android

The app isn't in the Play Store. You install the APK yourself:

1. On the phone or tablet, open the newest [release](https://github.com/gjvanhalem/OpenSail/releases/latest) and download `OpenSail-<version>.apk`.
2. Open the downloaded file. Android asks to allow installing apps from your browser or file manager: tap **Settings**, allow it, go back and tap **Install**.
3. If Play Protect warns about an unknown developer: **More details** → **Install anyway**.

To update, install the newer APK over the old one. Don't uninstall first: that deletes your routes, tracks and charts. Android 7 or newer.

### In the browser

The hosted version at **https://opensail.g-zeven.nl** is for invited crew: you need an account. Your skipper sends you an invite link; open it, pick a name and password, and you're in. Signing in lasts 30 days and renews while you use the app, so it keeps working on board without a connection.

- **Best browser:** Chrome or Edge (Windows, Android). Safari on an iPad works for the chart, routes and safety, but has no USB or Bluetooth. Firefox has no USB or Bluetooth either.
- **Install it as an app:** Chrome or Edge **⋮ → Install app**, or Safari **Share → Add to Home Screen**. It then opens in its own window without browser bars.

Your routes, tracks, settings and downloaded charts are stored in the browser on that device, not on the server.

---

## Getting Started

### The screen

- **Tabs:** Chart, Routes, Tracks, Instruments and Settings. On a wide screen (a laptop or a tablet in landscape) they're in the top bar; on a phone or a tablet in portrait they're in a bar at the bottom.
- **Top bar:** the status chip shows the instrument connection and the position (green dot with a position, amber without); tap it to open Instruments. The **moon** button switches night mode, and the full-screen button hides both bars for the biggest chart. In full screen, the button at the top brings the bars back.
- **Bottom left, on every page:** the red **MOB** button and the **anchor** button. They're always there, also in full screen.

### First steps

1. **Get a position.** Settings → **Navigation sources** → **GPS Mode** → **Real GPS** uses the device's GPS. Allow the location permission when asked. Or connect an instrument with GPS (see [Connecting Instruments](#connecting-instruments)). OpenSail remembers the GPS mode and starts it again next time.
2. **Download charts at home.** See [Offline Charts](#offline-charts).
3. **Test the alarm.** Settings → **Alarms** → **Test alarm**, so you know how loud it is.

No boat nearby? Settings → Navigation sources → GPS Mode → **Simulator** sails a track on the IJsselmeer, and Instruments → **Simulator** sends instrument data.

### Night mode

Tap the moon button in the top bar for **night mode**: red on black, so you keep your night vision. Tap the sun to go back. Settings → Boat & units → **Display** also offers **Auto**, which switches to night from dusk to dawn.

---

## The Chart

The chart combines three sources:

- **Base map:** OpenStreetMap (via OpenFreeMap).
- **Seamarks:** buoys, beacons and lights from OpenSeaMap.
- **Inland ENC:** depth areas, bridges, fairways and hazards from Rijkswaterstaat, for the Dutch inland waters. Depth data for the coast (Waddenzee, Zeeland) isn't in yet.

OpenSeaMap and OpenStreetMap are made by volunteers and may be incomplete or wrong. The **⚠ Not for navigation** note on the chart says so; tap it for the details.

### Moving around

- **Pan:** drag the chart. This stops following the boat.
- **Zoom:** pinch, the mouse wheel, or the **+** and **−** buttons.

### Map buttons (right edge, top to bottom)

| Button | What it does |
|---|---|
| **Follow vessel** | Shown once there's a position. Lit while the chart follows the boat; tap it to follow again after panning. |
| **N↑ / H↑** | North up or heading up. Heading up turns the chart with the boat's heading (or course). |
| **Layers** | What the chart shows: Seamarks (OpenSeaMap), Inland ENC (Rijkswaterstaat), Routes, Tracks and AIS targets. |
| **Offline charts** | Download chart regions for use without internet. |
| **+ / −** | Zoom in and out. |

### Instrument strip

The dark strip at the bottom right shows **SOG**, **COG** and **DEPTH**, and on wider screens also **HDG** and **AWS** (apparent wind speed). A value turns red while its alert is on. Tap the strip to open the Instruments page.

While you navigate a route, the route guidance shows top left: see [Navigating a route](#navigating-a-route).

---

## Offline Charts

On the water there's often no mobile data. Download the charts you need at home, over Wi-Fi.

### Downloading a region

1. On the Chart screen, tap the **Offline charts** button.
2. Tap **Select Region on Map**. Pan and zoom until the area you want fills the screen, then tap **Select This Area**.
3. Give the region a name and choose the **Zoom Levels** (8 to 14). Higher zoom means more detail and a bigger download. The panel shows the estimated size.
4. Tap **Start Download**. The download includes the base map, the seamarks, the label fonts and, where available, the Rijkswaterstaat depth data.

### Managing regions

The Offline charts panel shows the storage used and lists your **Downloaded Regions** with their size, zoom levels, download date and chart **Edition**. When Rijkswaterstaat publishes a newer edition, OpenSail tells you and the region gets an **Update** button (this needs a connection). You can delete regions you no longer need.

In the browser, the panel also says whether the browser has granted persistent storage. Without it, the browser may delete downloaded charts when the device runs low on space. The Windows and Android apps keep their charts in the app.

### What works offline

✅ **Available offline:**
- The chart, for the regions you downloaded
- Routes, route navigation and the hazard check
- Track recording
- Instruments, man overboard, anchor watch and alarms
- Everything you saved

❌ **Requires internet:**
- Downloading or updating chart regions
- The chart outside your downloaded regions
- Signing in for the first time (browser version)

---

## Connecting Instruments

OpenSail reads NMEA 0183, NMEA 2000 and SeaTalk data: position, speed, depth, wind and heading. Open the **Instruments** tab: the gauges are at the top, the **Connection** section below.

1. Choose the **Connection Type**: **USB Serial**, **Bluetooth**, **Wi-Fi** or **Simulator**. A type your device can't use is greyed out.
2. Choose the **Protocol**: NMEA 0183 (the most common), NMEA 2000 or SeaTalk (Raymarine).
3. Tap the connect button.

**Active Connections** shows the status and when data last came in. **Raw data** (folded away) lists what the instruments send, which helps when checking a connection.

### Wi-Fi: the Pcnautic autopilot

The Pcnautic Easy Tiller Pilot makes its own Wi-Fi network, **`pcnautic_AP`**, and sends NMEA 0183 on **`192.168.14.1`**, port **`20220`**.

**In the Windows and Android apps:**

1. Switch the autopilot on and join the `pcnautic_AP` Wi-Fi. It has no internet; on Android choose **Stay connected** when asked. Use your downloaded charts.
2. Instruments → **Wi-Fi**. Host `192.168.14.1` and port `20220` are filled in. Protocol NMEA 0183 → **Connect over Wi-Fi**.

**In the browser:** a browser can't open this kind of connection, so a small program on the laptop, the [OpenSail bridge](../tools/opensail-bridge/README.md), passes the data on:

1. Join `pcnautic_AP` on the laptop.
2. Start the bridge: `node tools/opensail-bridge/bridge.mjs` (needs Node.js).
3. Instruments → **Wi-Fi**, address `ws://localhost:10110` → **Connect over Wi-Fi**.

The autopilot sends a magnetic heading, rudder angle, heel and pitch, and wind if a wind sensor is connected to it. It sends **no position or depth**: keep the device's GPS on. When the Wi-Fi drops, OpenSail reconnects by itself. OpenSail only reads; it sends nothing to the autopilot.

**Magnetic variation:** set it in Settings → Navigation sources → **Magnetic variation** (° east, negative for west), so the chart and the gauges show true heading. In the Netherlands it's about +2°.

Other Wi-Fi gateways work the same way: enter their host and port in the apps, or run the bridge with `--target host:port` in the browser.

### USB (Chrome, Edge, Windows app)

1. Plug the NMEA cable into the computer.
2. Instruments → **USB Serial** → choose the protocol → **Connect to USB Port**.
3. Pick the port from the list. The browser may ask for permission.

### Bluetooth (Chrome, Edge, Windows app)

1. Switch the instrument on and put it in pairing mode.
2. Instruments → **Bluetooth** → **Connect to Bluetooth Device**, and pick it from the list.

In the Windows app, USB and Bluetooth use the same browser features as Edge, but they haven't been tested on a real laptop yet. The Android app has no USB or Bluetooth: use a Wi-Fi gateway.

### Gauges

The Instruments page shows **speed**, **depth**, **wind** and **heading**. The wind gauge shows the apparent wind and works out the true wind (TWS, TWA) from the boat speed. Tap **Edit layout** to show, hide, resize and reorder gauges. Settings → Boat & units sets the units and the **Speed gauge range** (so the dial fits your boat's speeds).

### Where the position and heading come from

Settings → **Navigation sources** chooses, for **Position**, **Course & speed over ground** and **Heading**, whether they come from the GPS or an **Instrument**, or **Auto**. Next to each it shows where the value comes from now.

---

## Routes and Tracks

### Planning a route

1. Open **Routes** and tap **+ New Route**.
2. Give it a name and tap the map to add waypoints, or use **+ Add waypoint**.
3. The planner shows the distance and the estimated duration. Edit or remove waypoints in the list; each has a name, a position, an arrival radius and notes.
4. With two or more waypoints, the **Hazard check** looks for shallow water and hazards along the route. Warnings from the Rijkswaterstaat inland ENC are official chart data; warnings marked **advisory** come from survey data, not from an official chart.
5. Tap **Save Route**.

Tap a route in the list to see its summary (total distance and the ETA if you leave now). **Edit** and **Delete** are on each route.

### Navigating a route

1. In the Routes list, tap **Navigate** on the route.
2. On the chart, the route guidance (top left) shows **BRG** (bearing) and **DTW** (distance to the waypoint), **XTE** (cross-track error), **ETA WPT** and **ETA END**, and the distance to go.
3. When the boat is within the arrival radius, the next waypoint becomes active by itself. Settings → Alarms → **Route arrival radius** sets the default.
4. Tap **Stop route** to stop.

### Recording a track

1. Open **Tracks** and tap **Start Recording**. Give the track a name and tap **Start**.
2. **Pause** and **Resume** to break and continue the same track.
3. **Stop & Save** to finish.

Select a track to see its details (distance, average and maximum speed, start and end time), pick its **Colour on the chart**, **Export as GPX**, or **Convert to route** to sail it again.

---

## Safety: Man Overboard and Anchor Watch

OpenSail is an aid, not a certified safety device. Read [What the app can't guarantee](#what-the-app-cant-guarantee) before you rely on these alarms.

### Alarms

- **Safety alarms** (man overboard, anchor dragging, anchor watch without a position) sound a siren and fill the screen in red. Tap **Silence** to stop the sound; the feature that raised the alarm keeps showing its state.
- **Instrument alerts** (for example the shallow-water alarm) beep and show a banner until you tap **Acknowledge**. Set them in Settings → Alarms → **Instrument Alerts**: a minimum and maximum for depth, speed and wind speed.
- The sounds are made by the app itself, so they work offline.
- A browser only allows sound after you have touched the app once. Any tap is enough; **Settings → Alarms → Test alarm** also lets you check the volume.
- While an alarm sounds, or a man overboard or anchor watch is on, OpenSail keeps the screen on. If the device can't, the app tells you.
- **Android app:** with the screen off, alarms come as notifications that ring like an alarm clock. Tap **Silence** on the notification, or open the app.

### Man Overboard (MOB)

1. Tap the red **MOB** button (bottom left, on every page and in full screen).
2. The position is recorded at once and the alarm sounds. If the last fix was more than 10 seconds old, the app says the spot may be off. Without any fix, it takes the next one.
3. Tap **Silence**. The MAN OVERBOARD panel stays on screen with the **bearing** and **distance** back to the spot, which way to turn, the time since the MOB and the MOB position.
4. When the person is back on board, tap **Clear MOB** and then **Tap again to clear**.

An active MOB survives a reload or an app crash.

### Anchor Watch

1. Tap the **anchor** button (bottom left, next to MOB).
2. Set the radius (10–500 m). Take at least the length of the anchor rode plus the boat length. **Settings → Alarms → Anchor watch radius** sets the starting value.
3. Tap **Drop anchor here** when the boat is above the anchor: the watch uses the boat's position at that moment.
4. The panel shows the anchor position, the radius (you can change it while the watch runs) and a log of events with times. Tap **–** to minimise it: the anchor button then shows the distance to the anchor and the status (**Holding**, **DRAGGING**, **NO POSITION**).
5. The position is checked with every fix and at least every 10 seconds:
   - **DRAGGING**: the boat has been outside the circle for at least 3 fixes over 5 seconds. A single GPS jump or a few seconds of jitter at the edge don't raise the alarm. Fixes less accurate than the radius aren't counted.
   - **NO POSITION**: no usable fix for a minute. The watch can't see the boat, so this has its own alarm.
6. To stop, tap **Raise anchor (stop watch)** and then **Tap again to stop the watch**.

The watch and its log survive a reload.

### What the app can't guarantee

- **Browser and Windows app: keep OpenSail open, on screen, and the device awake.** When the app is in the background, the screen is locked, or the device sleeps, GPS updates and alarm checks may stop, and **an alarm may not sound**.
- **Android app:** while an anchor watch, MOB, route, track recording or instrument connection is on, a notification says "OpenSail is running" and the app keeps working with the screen locked. Android, and Samsung, Xiaomi and Huawei in particular, may still stop it to save battery: set Settings › Apps › OpenSail › Battery to **Unrestricted**, and test it at home first. See the [Android app notes](../android/README.md#with-the-screen-off).
- **iPad and iPhone (Safari and home-screen apps):** when the screen locks or you switch apps, iOS stops the page completely: no GPS, no anchor watch, no sound. Set **Settings → Display & Brightness → Auto-Lock** to **Never** while you rely on an alarm, and keep the device on power.
- **Silent switch and volume:** a muted device, the silent switch on an iPhone, or Bluetooth audio to a speaker that's off can silence the alarm. Use **Test alarm** before you need it.
- **GPS accuracy:** a tablet without a GPS chip (for example a Wi-Fi-only iPad) gives a position from Wi-Fi, accurate to tens of metres or worse. That isn't good enough for a small anchor circle; a GPS from your instruments is better.
- **Battery:** GPS, a screen kept on and sound use a lot of power. Keep the device charging during an anchor watch.
- **Not a replacement for a proper watch:** for an overnight anchorage or in bad weather, use a dedicated anchor alarm or keep a watch as well.

---

## Settings

| Section | What's there |
|---|---|
| **Boat & units** | Display (Day, Night, Auto), units (nautical, metric, imperial), speed gauge range |
| **Chart** | Default orientation (north up, heading up), the zoom level used when there's a position |
| **Navigation sources** | GPS Mode (Off, Real GPS, Simulator), where position, course and heading come from, magnetic variation |
| **Alarms** | Instrument alerts, anchor watch radius, route arrival radius, Test alarm |
| **Account** | Only in the browser version: your account, sign out, and for admins the users and invites |
| **About** | The version, what this device supports, Reset All Settings |

Layers and offline charts are on the chart itself, not in Settings.

---

## Not There Yet

These are planned but not built (see the [roadmap](../ROADMAP.md#next-up)):

- **AIS:** the Layers panel has an "AIS targets" switch, but OpenSail doesn't decode AIS yet, so no ships show and there are no collision (CPA) warnings.
- **Logbook:** not yet. Anchor watch and MOB events are kept on the device for it.
- **Weather and tides.**
- **Steering the autopilot:** OpenSail only reads from the autopilot; sending a route to it comes later.
- **Depth data for the coast** (Waddenzee, Zeeland).
- **An iPhone / iPad app** (the browser version works on iOS, with the limits above).

---

## Troubleshooting

### Charts Not Displaying

**Problem**: Grey or empty chart

**Solutions**:
- Without internet, only your downloaded regions show. Check that the area is in Offline charts → Downloaded Regions.
- Check that the layers you expect are on (**Layers**).
- The Rijkswaterstaat depth data only covers Dutch inland waters.

### Position Not Showing

**Problem**: No boat on the chart, the status chip says "No position"

**Solutions**:
- Settings → Navigation sources → GPS Mode → **Real GPS**, and allow the location permission (in the browser's or Android's settings if you said no before).
- Check that location is on for the device.
- A laptop usually has no GPS: use an instrument with GPS. The Pcnautic autopilot sends no position.

### Instruments Not Connecting

**Problem**: No data from the instruments

**Solutions**:
- **Wi-Fi:** check that the device is on the boat's Wi-Fi network. In the browser, check that the bridge is running and says `Connected`.
- **USB / Bluetooth:** only in the Windows app, Chrome and Edge. Check that the instrument is on and the cable is plugged in.
- Check the protocol (most instruments use NMEA 0183).
- Open **Raw data** on the Instruments page to see whether anything comes in.

### No Sound From Alarms

**Solutions**:
- Tap the app once after opening it; the browser only allows sound after a tap.
- Check the volume and the silent switch, and use **Test alarm**.
- On Android, allow OpenSail's notifications.

### App Not Updating

**Problem**: An older version keeps showing

**Solutions**:
- **Browser:** close every OpenSail tab or the installed app and open it again. The new version loads on the next start.
- **Windows and Android:** download and install the newest release. Settings → About shows your version.

### Storage Full

**Problem**: A chart download fails or the browser warns about space

**Solutions**:
- Delete downloaded regions you don't need (Offline charts panel).
- Delete old tracks; export them as GPX first if you want to keep them.

---

## Getting Help

- **GitHub Issues:** report bugs or ask for features at https://github.com/gjvanhalem/OpenSail/issues. Include the version (Settings → About), the device, the browser or app, the steps to reproduce, and a screenshot.
- **Contributing:** OpenSail is open source (MIT). See the [Developer Guide](DEVELOPER_GUIDE.md).

---

## Tips and Best Practices

### Before You Sail

1. Download the charts for your whole trip, at home over Wi-Fi.
2. Connect the instruments and the autopilot at the dock.
3. Test the alarm (Settings → Alarms → Test alarm).
4. Plan and save your route, and check its hazard warnings.
5. On Android, set the battery use to Unrestricted if you'll use the anchor watch.

### While Sailing

1. Keep the device charged and, except with the Android app, OpenSail on screen.
2. Use night mode after dark.
3. Use full screen for the biggest chart.

### After Your Trip

1. Export your tracks as GPX for a backup.
2. Delete old tracks and regions you don't need.

---

## Privacy and Data

- Routes, tracks, settings and downloaded charts are stored on your device only.
- The Windows and Android apps have no accounts. They only download map tiles and charts.
- The browser version's server stores only your account (name, email, role). Your navigation data stays in the browser.
- Position and instrument data are processed on the device and never uploaded.

---

**Happy Sailing! ⛵**
