# Browser Compatibility Detection

This module detects which browser APIs the app can use, so users are told which features are available in their browser.

## Overview

The browser compatibility system detects support for core and device APIs, shows a warning for unsupported features and recommends a browser.

It is about the **browser version** of the app. The Windows app (Tauri, WebView2) and the Android app (Capacitor, Android WebView) are not browsers: `CompatibilityWarning` shows nothing there (`NATIVE_BUILD`), and several browser limits don't apply (see [Native apps](#native-apps)).

## Components

### 1. Feature Detection Utility (`featureDetection.ts`)

Core utility that detects browser API support:

```typescript
import { getBrowserCapabilities, getFeatureSupport } from '@/utils/featureDetection';

// Get all capabilities
const capabilities = getBrowserCapabilities();
console.log(capabilities.webSerial); // true/false

// Get detailed support info with reasons
const features = getFeatureSupport();
console.log(features.webSerial.reason); // Message if not supported
```

**Detected Features:**
- Service Worker (offline app files)
- IndexedDB (local storage)
- Web Serial API (USB instruments)
- Web Bluetooth API (Bluetooth instruments)
- Geolocation API (GPS)
- Notifications API
- PWA Installability

**Helper Functions:**
- `hasMinimumRequirements()` - Service Worker, IndexedDB and Geolocation are available
- `hasDeviceConnectionSupport()` - USB or Bluetooth is available
- `getBrowserInfo()` - Browser name and version
- `getRecommendedBrowser()` - Recommendation for the missing features
- `isSecureContext()` - Running on HTTPS (or localhost)

### 2. Compatibility Warning Component (`CompatibilityWarning.tsx`)

A banner at the top of the app when compatibility issues are detected. Shown in `App.tsx`.

**Features:**
- Critical issues (red banner) for missing core features or no HTTPS
- Warnings (yellow banner) for missing optional features, with browser advice for Firefox and Safari
- Provides browser recommendations
- Not shown if there are no issues, or in the native apps
- Cannot be dismissed if critical issues exist
- A dismissed warning stays dismissed (localStorage key `opensail.compatibilityWarningDismissed`); critical issues show on every load

### 3. Compatibility Info Component (`CompatibilityInfo.tsx`)

Detailed compatibility information on the Settings page (About section).

**Features:**
- Shows browser name and version
- Lists all features with support status
- Displays critical issues and warnings
- Provides browser recommendations

### 4. Compatibility Hook (`useCompatibility.ts`)

React hooks for compatibility information; the status is computed once on mount.

```typescript
import { useCompatibility, useFeatureSupport } from '@/hooks/useCompatibility';

function MyComponent() {
  const compatibility = useCompatibility();

  if (!compatibility.hasMinimumRequirements) {
    return <div>Browser not supported</div>;
  }

  const hasSerial = useFeatureSupport('webSerial');
  return <div>USB Support: {hasSerial ? 'Yes' : 'No'}</div>;
}
```

## Browser Support Matrix

| Feature | Chrome / Edge | Safari | Firefox |
|---------|---------------|--------|---------|
| Service Worker | ✅ | ✅ | ✅ |
| IndexedDB | ✅ | ✅ | ✅ |
| Geolocation | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅ | ✅ |
| Web Serial (USB) | ✅ | ❌ | ❌ |
| Web Bluetooth | ✅ | ❌ | ❌ |
| Notifications | ✅ | ✅ | ✅ |
| Wi-Fi instruments (WebSocket) | ✅ | ✅ | ✅ |

Browsers can't open TCP or UDP sockets. Wi-Fi instruments work in every browser through a WebSocket: to a gateway that offers one, or to the OpenSail bridge (`tools/opensail-bridge`) on `ws://localhost:10110`. A page loaded over HTTPS may only open an unencrypted `ws://` link to localhost.

## Native apps

The Windows and Android apps run the same `pwa/` build (`npm run build:native`) and replace several browser limits:

| Browser limit | Windows app (WebView2) | Android app (WebView) |
|---|---|---|
| No TCP sockets: Wi-Fi only through a WebSocket or the bridge | Direct TCP (Rust) | Direct TCP (Kotlin plugin) |
| Chart archives on other hosts need CORS | Native HTTP | Native HTTP (CapacitorHttp) |
| Page stops in the background or with the screen off | Keeps running when minimised | Foreground service keeps GPS, instruments and anchor watch running; alarms as notifications |
| Geolocation | `navigator.geolocation` (needs Windows location) | `@capacitor/geolocation` (fused location) |
| Web Serial / Web Bluetooth | API present, picker not yet tested on hardware | Not available: use Wi-Fi instruments |
| Service worker | None: files come with the installer | None: files come with the APK |

See `desktop/README.md` and `android/README.md` for details. The platform code is in `src/platform/`.

## Integration Points

### 1. App.tsx
`CompatibilityWarning` is shown at the top level.

### 2. Settings Page
`CompatibilityInfo` in the About section, in the browser only (not in the Windows and Android apps).

### 3. Instrument Manager
Uses `useFeatureSupport('webSerial')` and `useFeatureSupport('webBluetooth')` to disable the USB and Bluetooth options when the APIs are not available. Wi-Fi uses `NativeTcpConnection.isSupported()` to choose between direct TCP (native apps) and WebSocket (browser).

## User Experience Flow

1. **First Load**: User sees compatibility warning banner if issues detected
2. **Critical Issues**: Red banner, cannot be dismissed, app may not function
3. **Warnings**: Yellow banner, can be dismissed, core features work
4. **Settings**: User can view detailed compatibility info anytime
5. **Feature Usage**: Components check support before enabling features

## Security Context

Geolocation, Web Serial, Web Bluetooth, the service worker and the wake lock need a secure context (HTTPS, or localhost). The system checks `window.isSecureContext` and shows a critical error over plain HTTP. The native apps are served from secure origins (`https://tauri.localhost`, `https://localhost`).

## Testing

1. **Chrome/Edge**: All features should be supported
2. **Firefox**: USB and Bluetooth should show as unsupported
3. **Safari**: USB and Bluetooth should show as unsupported
4. **HTTP**: Should show secure context error
