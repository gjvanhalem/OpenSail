---
inclusion: always
---

# Product Overview

This is an open-source marine navigation system designed as a WinGPS equivalent for modern devices. Built as a Progressive Web App (PWA), the system provides comprehensive navigation functionality for boat operators, including chart display, route planning, instrument integration, and safety features.

## Core Capabilities

- Display vector nautical charts with real-time vessel position
- Plan and navigate routes with multiple waypoints
- Integrate with marine instruments via NMEA0183, NMEA2000, and SeaTalk protocols
- Track other vessels using AIS (Automatic Identification System)
- Operate fully offline using cached charts and data
- Record vessel tracks and maintain electronic logbook
- Provide safety features: anchor watch, man overboard marker
- Display weather forecasts, tide, and current information

## Target Platform

**Progressive Web App (PWA)** that runs on:
- **Windows**: Desktop and laptop computers (Chrome, Edge recommended)
- **Android**: Tablets and phones (Chrome recommended)
- **iOS/iPadOS**: Tablets and phones (Safari, limited device API support)

The PWA approach provides:
- **No Installation Required**: Access via web browser
- **Optional Installation**: Install as standalone app from browser
- **Automatic Updates**: Always get the latest version
- **Offline-First**: Full functionality without internet
- **Cross-Platform**: Single codebase for all devices
- **No App Store**: Direct deployment, no approval process

## Browser Requirements

### Recommended (Full Features)
- Chrome 89+ or Edge 89+ for complete functionality including USB and Bluetooth instrument connections

### Supported (Core Features)
- Safari 15.4+ (iOS/iPadOS) - Core navigation features, limited Bluetooth, no USB
- Firefox 90+ - Core navigation features, no device connections

### Key Features by Browser
| Feature | Chrome/Edge | Safari | Firefox |
|---------|-------------|--------|---------|
| Chart Display | ✅ | ✅ | ✅ |
| Route Planning | ✅ | ✅ | ✅ |
| Track Recording | ✅ | ✅ | ✅ |
| Offline Mode | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅ | ✅ |
| USB Instruments | ✅ | ❌ | ❌ |
| Bluetooth Instruments | ✅ | Limited | ❌ |

## Use Cases

### Primary Use Case: Tablet Navigation
- Install PWA on Android or iPad tablet
- Pre-download charts for sailing region
- Connect instruments via Bluetooth or USB
- Use offline while sailing
- Record tracks and maintain logbook

### Secondary Use Case: Desktop Planning
- Access via browser on Windows laptop
- Plan routes with full keyboard/mouse
- Download charts for upcoming trip
- Export routes to tablet
- Review tracks and logbook entries

### Tertiary Use Case: Phone Backup
- Quick access on phone for reference
- View current position and nearby vessels
- Check route progress
- Emergency navigation if tablet fails

## Competitive Advantages

1. **No Platform Lock-in**: Works on any modern device
2. **Easy Updates**: Automatic, no app store delays
3. **Simple Development**: Standard web technologies
4. **Lower Barrier**: No app installation required
5. **Cost Effective**: No app store fees
6. **Open Source**: Community contributions welcome
7. **Privacy Focused**: All data stored locally by default

## Target Users

- **Recreational Sailors**: Weekend sailors with tablets
- **Coastal Cruisers**: Day sailors and coastal passages
- **Budget-Conscious Boaters**: Free alternative to commercial apps
- **Tech-Savvy Mariners**: Comfortable with web apps and PWAs
- **Multi-Device Users**: Want same app on laptop and tablet
