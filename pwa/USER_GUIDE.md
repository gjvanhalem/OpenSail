# OpenSail User Guide

Welcome to OpenSail, a Progressive Web App for marine navigation. This guide will help you get started and make the most of the application.

## Table of Contents

1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Offline Usage](#offline-usage)
4. [Connecting Instruments](#connecting-instruments)
5. [Navigation Features](#navigation-features)
6. [Safety: Man Overboard and Anchor Watch](#safety-man-overboard-and-anchor-watch)
7. [Troubleshooting](#troubleshooting)

---

## Installation

### Accessing OpenSail

OpenSail is a Progressive Web App (PWA) that works in your browser. You can:
- **Use it directly** in your browser without installation
- **Install it** as a standalone app for a native-like experience

### Browser Requirements

For the best experience, use:
- **Chrome 89+** or **Edge 89+** (Windows, Android) - Full features including USB and Bluetooth
- **Safari 15.4+** (iOS/iPadOS) - Core features, limited Bluetooth support
- **Firefox 90+** - Core features, no device connections

### Installing as a PWA

#### On Windows (Chrome/Edge)
1. Open OpenSail in Chrome or Edge
2. Look for the install icon (⊕) in the address bar
3. Click "Install" when prompted
4. The app will open in a standalone window
5. Find the app icon on your desktop or Start menu

#### On Android (Chrome)
1. Open OpenSail in Chrome
2. Tap the menu (⋮) and select "Install app" or "Add to Home screen"
3. Confirm the installation
4. Find the app icon on your home screen

#### On iOS/iPadOS (Safari)
1. Open OpenSail in Safari
2. Tap the Share button (□↑)
3. Scroll down and tap "Add to Home Screen"
4. Name the app and tap "Add"
5. Find the app icon on your home screen

---

## Getting Started

### First Launch

When you first open OpenSail:
1. The app will cache essential files for offline use
2. You'll see the main chart view
3. Grant location permissions when prompted to see your position

### Main Interface

The interface consists of:
- **Chart View**: Main map display showing your position and surroundings
- **Navigation Bar**: Top bar with app controls and settings
- **Sidebar**: Collapsible panel for routes, tracks, and instruments
- **Instrument Panel**: Customizable gauges showing navigation data

### Basic Navigation

- **Pan**: Click and drag on the chart
- **Zoom**: Use mouse wheel, pinch gesture, or +/- buttons
- **Rotate**: Hold Ctrl/Cmd and drag (desktop) or two-finger rotate (mobile)
- **Fullscreen**: Click the fullscreen icon for maximum chart area

---

## Offline Usage

OpenSail is designed to work completely offline once you've downloaded the necessary data.

### Downloading Charts for Offline Use

1. **Select Region**:
   - Navigate to the area you want to download
   - Click the "Download Charts" button in the sidebar
   - Use the rectangle tool to select the region

2. **Choose Zoom Levels**:
   - Select minimum and maximum zoom levels
   - Higher zoom levels = more detail but larger download
   - Recommended: Zoom 8-14 for coastal navigation

3. **Start Download**:
   - Click "Download"
   - Monitor progress in the notification area
   - Downloads continue in the background

4. **Manage Downloaded Regions**:
   - View all downloaded regions in Settings > Offline Charts
   - Delete regions you no longer need to free up space
   - Check storage usage and available space

### What Works Offline

✅ **Available Offline**:
- Chart display (for downloaded regions)
- Route planning and navigation
- Track recording
- Instrument data display
- Logbook entries
- All saved routes and waypoints

❌ **Requires Internet**:
- Downloading new chart regions
- Weather forecasts
- Tide and current data
- Chart updates

### Storage Management

- OpenSail uses your browser's storage (IndexedDB)
- Typical storage: 50MB - 500MB depending on downloaded charts
- Check storage usage in Settings > Storage
- Clear old tracks and unused chart regions to free space

---

## Connecting Instruments

OpenSail can connect to marine instruments via USB or Bluetooth to display real-time navigation data.

### Supported Protocols

- **NMEA0183**: Most common marine protocol (GPS, depth, wind, etc.)
- **NMEA2000**: Modern CAN bus protocol
- **SeaTalk**: Raymarine proprietary protocol

### USB Connection (Chrome/Edge only)

1. **Connect Your Instrument**:
   - Plug USB cable from instrument to computer/tablet
   - Ensure drivers are installed (usually automatic)

2. **Connect in OpenSail**:
   - Open Settings > Instruments
   - Click "Connect USB Device"
   - Select your device from the list
   - Click "Connect"

3. **Configure Protocol**:
   - Select the protocol (NMEA0183, NMEA2000, or SeaTalk)
   - Set baud rate (typically 4800 or 38400 for NMEA0183)
   - Data should start flowing immediately

### Bluetooth Connection (Chrome/Edge/Safari)

1. **Pair Your Instrument**:
   - Enable Bluetooth on your device
   - Put instrument in pairing mode (consult instrument manual)

2. **Connect in OpenSail**:
   - Open Settings > Instruments
   - Click "Connect Bluetooth Device"
   - Select your instrument from the list
   - Click "Pair"

3. **Configure Protocol**:
   - Select the protocol
   - Data should start flowing immediately

### Troubleshooting Connections

**Device not appearing**:
- Ensure device is powered on and in range
- Check USB cable is properly connected
- Try unplugging and reconnecting
- Restart the browser

**No data received**:
- Verify correct protocol is selected
- Check baud rate matches instrument settings
- Ensure instrument is transmitting data
- Try disconnecting and reconnecting

**Connection drops**:
- Check USB cable quality
- Ensure Bluetooth device stays in range
- Check for interference from other devices
- Enable auto-reconnect in settings

### Viewing Instrument Data

Once connected, instrument data appears in:
- **Instrument Panel**: Customizable gauges (speed, depth, wind, heading)
- **Chart View**: Your position updates in real-time
- **Navigation Data**: Course, speed, and heading indicators

---

## Navigation Features

### Route Planning

1. **Create a New Route**:
   - Click "Routes" in the sidebar
   - Click "New Route"
   - Click on the chart to add waypoints
   - Right-click or long-press to finish

2. **Edit Waypoints**:
   - Click on a waypoint to select it
   - Drag to move position
   - Click the edit icon to change name/notes
   - Delete unwanted waypoints

3. **Route Information**:
   - Total distance
   - Estimated time (based on average speed)
   - Bearing between waypoints
   - Waypoint list with coordinates

4. **Navigate a Route**:
   - Select a route from the list
   - Click "Activate"
   - Follow the route line on the chart
   - See distance and bearing to next waypoint

### Track Recording

1. **Start Recording**:
   - Click "Tracks" in the sidebar
   - Click "Start Recording"
   - Your position is logged automatically

2. **Pause/Resume**:
   - Click "Pause" to temporarily stop recording
   - Click "Resume" to continue the same track

3. **Stop Recording**:
   - Click "Stop" to finish the track
   - Name your track
   - Track is saved automatically

4. **View Tracks**:
   - See all recorded tracks in the Tracks list
   - Click a track to display it on the chart
   - View track statistics (distance, duration, average speed)

5. **Export Tracks**:
   - Select a track
   - Click "Export"
   - Choose GPX format
   - Save to your device

### AIS (Automatic Identification System)

If your instrument provides AIS data:
- Other vessels appear as icons on the chart
- Click a vessel to see details (name, MMSI, course, speed)
- CPA (Closest Point of Approach) warnings for collision risk
- Targets automatically expire after 24 hours

### Logbook

1. **Create Entry**:
   - Click "Logbook" in the sidebar
   - Click "New Entry"
   - Position and time are recorded automatically
   - Add notes, weather observations, engine hours

2. **View Entries**:
   - Browse all logbook entries
   - Filter by date or location
   - Export logbook to CSV

## Safety: Man Overboard and Anchor Watch

OpenSail is an aid to navigation, not a certified safety device. Read
[What a browser can't guarantee](#what-a-browser-cant-guarantee) before you rely on these alarms.

### Alarms

- **Safety alarms** (man overboard, anchor dragging, anchor watch without a position) sound a
  siren and fill the screen in red. Tap **Silence** to stop the sound; the feature that raised the
  alarm keeps showing its state.
- **Instrument alerts** (for example the shallow-water alarm) beep and show a banner until you tap
  **Acknowledge**.
- The sounds are generated by the app itself, so they work offline.
- Browsers only allow sound after you have touched the app once. Any tap or key press is enough;
  **Settings → Alarms → Test alarm** also lets you check the volume.
- While an alarm sounds, or a man overboard or anchor watch is active, OpenSail asks the browser to
  keep the screen on (Screen Wake Lock). If the browser can't do that, the app tells you.

### Man Overboard (MOB)

1. Tap the red **MOB** button (bottom left, on every page and in fullscreen mode), or **Man
   Overboard** in the sidebar.
2. The current position is recorded at once and the alarm sounds. If the last fix was more than
   10 seconds old, the app says the spot may be off. Without any fix, it takes the next one.
3. Tap **Silence**. The MOB panel stays on screen with the **bearing** and **distance** back to the
   spot, which way to turn, the time since the MOB and the MOB position.
4. When the person is back on board, tap **Clear MOB** and then **Tap again to clear**.

An active MOB survives a reload or an app crash.

### Anchor Watch

1. Open **Anchor Watch** in the sidebar.
2. Set the radius (10–500 m). Take at least the length of the anchor rode plus the boat length.
   **Settings → Alarms → Anchor watch radius** sets the starting value.
3. Tap **Drop anchor here** when the boat is above the anchor: the watch uses the boat's position at
   that moment as the anchor.
4. The panel shows the distance from the anchor, the status and a log of events with times. Tap
   **–** to shrink it to a status button.
5. The position is checked with every fix and at least every 10 seconds:
   - **DRAGGING**: the boat has been outside the circle for at least 3 fixes over 5 seconds. A single
     GPS jump or a few seconds of jitter at the edge don't raise the alarm. Fixes less accurate than
     the radius aren't counted.
   - **NO POSITION**: no usable fix for a minute. The watch can't see the boat, so this has its own
     alarm.
6. To stop, tap **Raise anchor (stop watch)** and then **Tap again to stop the watch**.

The watch and its log survive a reload. The events are kept on the device for the logbook.

### What a browser can't guarantee

OpenSail runs in a web browser, and browsers limit what a page can do when it isn't on screen.

- **Keep the app open, on screen, and the device awake.** When the tab is in the background, the
  screen is locked, or the device sleeps, browsers slow down or stop the page. Then GPS updates and
  alarm checks may stop, and **an alarm may not sound**.
- **iPad and iPhone (Safari and home-screen apps):** when the screen locks or you switch apps, iOS
  suspends the page completely: no GPS, no anchor watch, no sound. Set **Settings → Display &
  Brightness → Auto-Lock** to **Never** while you rely on an alarm, and keep the device on power.
- **Silent switch and volume:** a muted device, the ring/silent switch on iPhone, or Bluetooth audio
  connected to a speaker that's off can silence the alarm. Use **Test alarm** before you need it.
- **Screen Wake Lock:** supported by current Chrome, Edge and Safari (iOS 16.4 and later). On other
  browsers, or with battery saver on, the screen can still turn off. The app tells you when the lock
  isn't available.
- **Browser GPS:** a phone or tablet without a GPS chip (for example a Wi-Fi-only iPad) gives a position
  from Wi-Fi with an accuracy of tens of metres or worse. That isn't good enough for a small anchor
  circle; a GPS from your instruments (NMEA) is better.
- **Battery:** GPS, a screen kept on and audio use a lot of power. Keep the device charging during an
  anchor watch.
- **Not a replacement for a proper watch:** for an overnight anchorage or in bad weather, use a
  dedicated anchor alarm or keep a watch as well.

---

## Troubleshooting

### App Won't Load

**Problem**: White screen or loading forever

**Solutions**:
- Check your internet connection (first load requires internet)
- Clear browser cache and reload
- Try a different browser
- Check if browser is up to date

### Charts Not Displaying

**Problem**: Gray tiles or missing charts

**Solutions**:
- Check internet connection (if not downloaded for offline)
- Verify you've downloaded charts for this region
- Check storage quota isn't exceeded
- Try zooming in/out to different levels

### Position Not Showing

**Problem**: No vessel marker on chart

**Solutions**:
- Grant location permissions in browser settings
- Ensure GPS is enabled on your device
- Check if location services are working in other apps
- Try connecting a GPS instrument via USB/Bluetooth

### Instruments Not Connecting

**Problem**: Can't connect USB or Bluetooth devices

**Solutions**:
- **USB**: Only works in Chrome/Edge, not Safari/Firefox
- **Bluetooth**: Limited support in Safari, not available in Firefox
- Check device is powered on and in range
- Verify correct protocol is selected
- Try restarting the browser
- Check browser permissions for Serial/Bluetooth APIs

### App Running Slowly

**Problem**: Laggy chart or slow response

**Solutions**:
- Close other browser tabs
- Reduce number of visible tracks/routes
- Clear old AIS targets
- Disable animations in settings
- Try a more powerful device

### Storage Full

**Problem**: "Storage quota exceeded" error

**Solutions**:
- Delete old tracks you don't need
- Remove downloaded chart regions
- Clear AIS history
- Export and delete old logbook entries

### App Not Updating

**Problem**: Not seeing new features

**Solutions**:
- Close and reopen the app
- Clear browser cache
- Uninstall and reinstall PWA
- Check for browser updates

### Data Not Syncing

**Problem**: Changes not appearing on other devices

**Solutions**:
- OpenSail stores data locally by default
- Cloud sync is optional (configure in Settings)
- Export/import routes manually between devices
- Use same browser account for sync

---

## Getting Help

### Resources

- **GitHub Issues**: Report bugs or request features
- **Documentation**: Full technical documentation in the repository
- **Community**: Join discussions and share tips

### Reporting Issues

When reporting a problem, include:
- Browser and version
- Device type (Windows/Android/iOS)
- Steps to reproduce the issue
- Screenshots if applicable
- Console errors (F12 > Console tab)

### Contributing

OpenSail is open source! Contributions welcome:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation
- Share your experience

---

## Tips and Best Practices

### Before Going Offshore

1. Download all charts for your planned route
2. Test instrument connections while at dock
3. Test the alarm sound (Settings → Alarms → Test alarm)
4. Create and save your route
5. Verify GPS position is accurate
6. Check storage space is sufficient

### While Sailing

1. Keep the app open for continuous track recording
2. Monitor battery level on your device
3. Use fullscreen mode for better visibility
4. Check AIS targets regularly
5. Make logbook entries at regular intervals

### After Your Trip

1. Export tracks for backup
2. Review and clean up old data
3. Update charts if needed
4. Share interesting routes with the community

---

## Privacy and Data

- All data is stored locally on your device by default
- No data is sent to external servers unless you enable cloud sync
- Location data is only used for navigation display
- Instrument data is processed locally
- You control all your navigation data

---

**Happy Sailing! ⛵**
