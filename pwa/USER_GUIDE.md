# OpenSail User Guide

Welcome to OpenSail, a Progressive Web App for marine navigation. This guide will help you get started and make the most of the application.

## Table of Contents

1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Offline Usage](#offline-usage)
4. [Connecting Instruments](#connecting-instruments)
5. [Navigation Features](#navigation-features)
6. [Troubleshooting](#troubleshooting)

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
3. Create and save your route
4. Verify GPS position is accurate
5. Check storage space is sufficient

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
