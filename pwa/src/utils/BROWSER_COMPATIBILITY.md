# Browser Compatibility Detection

This module provides comprehensive browser feature detection for the PWA, ensuring users are informed about which features are available in their browser.

## Overview

The browser compatibility system detects support for critical PWA and device APIs, displays warnings for unsupported features, and provides recommendations for optimal browser choices.

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
console.log(features.webSerial.reason); // Error message if not supported
```

**Detected Features:**
- Service Worker (offline functionality)
- IndexedDB (local storage)
- Web Serial API (USB instruments)
- Web Bluetooth API (Bluetooth instruments)
- Geolocation API (GPS)
- Notifications API (alerts)
- PWA Installability

**Helper Functions:**
- `hasMinimumRequirements()` - Check if core features are available
- `hasDeviceConnectionSupport()` - Check if USB or Bluetooth is available
- `getBrowserInfo()` - Get browser name and version
- `isSecureContext()` - Check if running on HTTPS

### 2. Compatibility Warning Component (`CompatibilityWarning.tsx`)

Displays a dismissible banner at the top of the app when compatibility issues are detected.

**Features:**
- Shows critical issues (red banner) for missing core features
- Shows warnings (yellow banner) for missing optional features
- Provides browser recommendations
- Auto-dismisses if no issues detected
- Cannot be dismissed if critical issues exist

**Usage:**
```tsx
import { CompatibilityWarning } from '@/components/CompatibilityWarning';

function App() {
  return (
    <>
      <CompatibilityWarning />
      {/* Rest of app */}
    </>
  );
}
```

### 3. Compatibility Info Component (`CompatibilityInfo.tsx`)

Displays detailed compatibility information in the Settings page.

**Features:**
- Shows browser name and version
- Lists all features with support status
- Displays critical issues and warnings
- Provides browser recommendations

**Usage:**
```tsx
import { CompatibilityInfo } from '@/components/CompatibilityInfo';

function SettingsPage() {
  return (
    <div>
      {/* Other settings */}
      <CompatibilityInfo />
    </div>
  );
}
```

### 4. Compatibility Hook (`useCompatibility.ts`)

React hook for accessing compatibility information in components.

```typescript
import { useCompatibility, useFeatureSupport } from '@/hooks/useCompatibility';

function MyComponent() {
  const compatibility = useCompatibility();
  
  // Check overall status
  if (!compatibility.hasMinimumRequirements) {
    return <div>Browser not supported</div>;
  }
  
  // Check specific feature
  const hasSerial = useFeatureSupport('webSerial');
  
  return <div>USB Support: {hasSerial ? 'Yes' : 'No'}</div>;
}
```

## Browser Support Matrix

| Feature | Chrome/Edge 89+ | Safari 15.4+ | Firefox 90+ |
|---------|----------------|--------------|-------------|
| Service Worker | ✅ | ✅ | ✅ |
| IndexedDB | ✅ | ✅ | ✅ |
| Geolocation | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅ | ✅ |
| Web Serial (USB) | ✅ | ❌ | ❌ |
| Web Bluetooth | ✅ | Limited | ❌ |
| Notifications | ✅ | ✅ | ✅ |

## Integration Points

### 1. App.tsx
The `CompatibilityWarning` component is displayed at the top level to catch users immediately when they open the app.

### 2. Settings Page
The `CompatibilityInfo` component provides detailed information for users who want to understand their browser's capabilities.

### 3. Instrument Manager
Uses `useFeatureSupport` hook to disable USB/Bluetooth connection buttons when APIs are not available and shows inline warnings.

## User Experience Flow

1. **First Load**: User sees compatibility warning banner if issues detected
2. **Critical Issues**: Red banner, cannot be dismissed, app may not function
3. **Warnings**: Yellow banner, can be dismissed, core features work
4. **Settings**: User can view detailed compatibility info anytime
5. **Feature Usage**: Components check support before enabling features

## Recommendations

The system provides context-aware browser recommendations:

- **Missing Device APIs**: Recommends Chrome 89+ or Edge 89+
- **Missing Core Features**: Recommends updating browser
- **All Features Supported**: No recommendations shown

## Security Context

All PWA features require HTTPS (secure context). The system checks `window.isSecureContext` and shows a critical error if the app is accessed via HTTP.

## Testing

To test compatibility detection:

1. **Chrome/Edge**: All features should be supported
2. **Firefox**: Device APIs should show as unsupported
3. **Safari**: USB should be unsupported, Bluetooth limited
4. **HTTP**: Should show secure context error

## Future Enhancements

Potential improvements:
- Detect specific browser versions for more targeted recommendations
- Add fallback options for unsupported features (file upload, manual data entry)
- Store user's dismissal preference in localStorage
- Add telemetry to track browser usage patterns
