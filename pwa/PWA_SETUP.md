# PWA Infrastructure Setup

This document describes the PWA infrastructure that has been configured for OpenSail.

## What Was Implemented

### 1. Service Worker with Workbox

**Files:**
- `vite.config.ts` - Configured with `vite-plugin-pwa`
- `src/main.tsx` - Service worker registration
- `public/offline.html` - Offline fallback page

**Features:**
- Automatic service worker generation using Workbox
- Cache-first strategy for app shell (HTML, CSS, JS)
- Cache-first strategy for chart tiles with 90-day expiration
- Network-first strategy for API data with cache fallback
- Automatic updates with user notification
- Offline fallback page

**Caching Strategies:**
- **App Shell**: Cache-first, 30-day expiration, max 50 entries
- **Chart Tiles**: Cache-first, 90-day expiration, max 500 entries
- **API Data**: Network-first with 10s timeout, 24-hour expiration, max 100 entries

### 2. Web App Manifest

**Files:**
- `vite.config.ts` - Manifest configuration in VitePWA plugin
- `index.html` - Meta tags for PWA
- `public/icon.svg` - App icon source
- `public/pwa-192x192.png` - 192x192 icon (placeholder)
- `public/pwa-512x512.png` - 512x512 icon (placeholder)
- `public/apple-touch-icon.png` - iOS icon (placeholder)
- `public/mask-icon.svg` - Safari pinned tab icon
- `public/favicon.ico` - Browser favicon (placeholder)

**Configuration:**
- App name: "OpenSail Navigation"
- Short name: "OpenSail"
- Theme color: #0ea5e9 (sky blue)
- Background color: #0c4a6e (dark blue)
- Display mode: standalone
- Orientation: any
- Icons for all required sizes

### 3. PWA Installation Prompt

**Files:**
- `src/hooks/usePWAInstall.ts` - Custom hook for PWA installation
- `src/components/PWAInstallPrompt.tsx` - Installation prompt UI
- `src/vite-env.d.ts` - TypeScript declarations

**Features:**
- Detects PWA installability
- Shows custom install prompt when app is installable
- Handles beforeinstallprompt event
- Tracks installation status
- Dismissible prompt
- Responsive design (mobile and desktop)

## How to Use

### Development

```bash
npm run dev
```

The service worker is enabled in development mode for testing.

### Production Build

```bash
npm run build
```

This generates:
- Optimized production bundle in `dist/`
- Service worker (`dist/sw.js`)
- Web app manifest (`dist/manifest.webmanifest`)

### Testing PWA Features

1. Build the app: `npm run build`
2. Preview locally: `npm run preview`
3. Open in Chrome/Edge at `http://localhost:4173`
4. Check PWA installability in DevTools > Application > Manifest
5. Test offline mode by stopping the server after first load

### Installing the PWA

**Desktop (Chrome/Edge):**
1. Visit the app URL
2. Click the install icon in the address bar, or
3. Use the custom install prompt that appears

**Mobile (Chrome/Safari):**
1. Visit the app URL
2. Tap the share/menu button
3. Select "Add to Home Screen"

## Browser Support

- **Chrome 89+**: Full support
- **Edge 89+**: Full support
- **Safari 15.4+**: Full support
- **Firefox 90+**: Full support

## Requirements Met

This implementation satisfies the following requirements from the spec:

- **Requirement 1.3**: PWA installability with home screen icon
- **Requirement 1.4**: Installation prompt and standalone mode
- **Requirement 1.5**: Standalone mode without browser UI
- **Requirement 2.1**: Service worker caching of critical assets
- **Requirement 2.2**: Offline functionality with cached resources
- **Requirement 2.5**: Background updates and user notifications

## Next Steps

1. **Generate Real Icons**: Replace placeholder PNG files with actual icons generated from `icon.svg`
2. **Test Installation**: Test PWA installation on all target platforms
3. **Customize Offline Page**: Enhance the offline fallback page with more features
4. **Add Update Notification**: Create a better UI for service worker updates
5. **Configure Cache Limits**: Adjust cache sizes based on actual usage patterns

## Notes

- The service worker is automatically updated when new versions are deployed
- Users will be prompted to reload when updates are available
- All PWA features require HTTPS in production
- Icon placeholders need to be replaced with actual PNG files before deployment
