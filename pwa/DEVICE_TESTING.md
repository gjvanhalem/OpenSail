# Device Testing Guide

This guide covers testing the OpenSail PWA on target devices to ensure compatibility and functionality.

## Testing Checklist

Use this checklist when testing on each device:

### ✅ Initial Load
- [ ] App loads successfully
- [ ] No console errors
- [ ] All assets load (images, fonts, icons)
- [ ] Layout renders correctly
- [ ] Navigation menu works

### ✅ PWA Installation
- [ ] Install prompt appears (or manual install available)
- [ ] App installs successfully
- [ ] App icon appears on home screen/desktop
- [ ] App launches in standalone mode (no browser UI)
- [ ] App name displays correctly

### ✅ Offline Functionality
- [ ] App works after going offline
- [ ] Cached pages load
- [ ] Service Worker is active
- [ ] Offline indicator shows when appropriate
- [ ] Data persists across sessions

### ✅ Chart Display
- [ ] Map loads and displays correctly
- [ ] Map is interactive (pan, zoom, rotate)
- [ ] Performance is smooth (no lag)
- [ ] Vessel marker displays
- [ ] Route and track layers work

### ✅ Navigation Features
- [ ] Route planning works
- [ ] Waypoint creation/editing works
- [ ] Track recording works
- [ ] Settings save correctly
- [ ] All screens accessible

### ✅ Device APIs
- [ ] Geolocation works (if available)
- [ ] USB connection available (Chrome/Edge only)
- [ ] Bluetooth connection available (where supported)
- [ ] Feature detection warnings show correctly

### ✅ Responsive Design
- [ ] Layout adapts to screen size
- [ ] Touch targets are adequate (min 44x44px)
- [ ] Text is readable
- [ ] No horizontal scrolling
- [ ] Orientation changes handled

### ✅ Performance
- [ ] Initial load < 3 seconds
- [ ] Interactions feel responsive
- [ ] No memory leaks during extended use
- [ ] Battery usage is reasonable

## Platform-Specific Testing

### Windows Desktop

**Recommended Browsers:** Chrome 89+, Edge 89+

#### Test Environment Setup
1. Open browser (Chrome or Edge)
2. Navigate to deployed URL
3. Open DevTools (F12)
4. Check Console for errors

#### Installation Test
1. Look for install icon in address bar
2. Click to install
3. Verify app appears in Start Menu
4. Launch from Start Menu
5. Verify standalone mode (no browser UI)

#### Feature Tests
- **USB Instruments:** 
  - Connect USB device
  - Go to Settings → Instruments
  - Click "Connect USB Device"
  - Select device from list
  - Verify data reception

- **Geolocation:**
  - Allow location permission when prompted
  - Verify position shows on map
  - Check accuracy indicator

- **Offline Mode:**
  - Load app fully
  - Open DevTools → Network tab
  - Set to "Offline"
  - Refresh page
  - Verify app loads from cache
  - Navigate between routes
  - Verify functionality

#### Screen Sizes to Test
- 1920x1080 (Full HD)
- 1366x768 (Common laptop)
- 2560x1440 (QHD)
- 3840x2160 (4K)

#### Keyboard Navigation
- Tab through interactive elements
- Verify focus indicators
- Test keyboard shortcuts (if any)
- Verify accessibility

### Android Tablet

**Recommended Browser:** Chrome 89+

#### Test Environment Setup
1. Open Chrome browser
2. Navigate to deployed URL
3. Open Chrome DevTools via desktop (chrome://inspect)

#### Installation Test
1. Tap menu (⋮) → "Install app" or "Add to Home screen"
2. Confirm installation
3. Verify icon on home screen
4. Launch from home screen
5. Verify standalone mode

#### Feature Tests
- **Bluetooth Instruments:**
  - Go to Settings → Instruments
  - Tap "Connect Bluetooth Device"
  - Pair with device
  - Verify data reception

- **Geolocation:**
  - Allow location permission
  - Verify GPS position on map
  - Test while moving (if possible)

- **Touch Gestures:**
  - Pinch to zoom on map
  - Two-finger rotate
  - Swipe to pan
  - Long press for context menu

- **Offline Mode:**
  - Enable Airplane mode
  - Launch app
  - Verify offline functionality
  - Test data persistence

#### Devices to Test
- Samsung Galaxy Tab (various sizes)
- Google Pixel Tablet
- Amazon Fire Tablet
- Other popular Android tablets

#### Screen Sizes
- 7-inch tablets (portrait/landscape)
- 10-inch tablets (portrait/landscape)
- 12-inch tablets (portrait/landscape)

#### Android Versions
- Android 10+
- Android 11+
- Android 12+
- Latest Android version

### iPad / iOS

**Browser:** Safari 15.4+

#### Test Environment Setup
1. Open Safari
2. Navigate to deployed URL
3. Use Safari Web Inspector (connect to Mac)

#### Installation Test
1. Tap Share button
2. Select "Add to Home Screen"
3. Confirm installation
4. Verify icon on home screen
5. Launch from home screen
6. Verify standalone mode

#### Feature Tests
- **Bluetooth Instruments (Limited):**
  - Note: Web Bluetooth support is limited
  - Test if available in your iOS version
  - Document any limitations

- **Geolocation:**
  - Allow location permission
  - Verify GPS position
  - Test accuracy

- **Touch Gestures:**
  - Pinch to zoom
  - Two-finger rotate
  - Swipe to pan
  - Test gesture responsiveness

- **Offline Mode:**
  - Enable Airplane mode
  - Launch app
  - Verify offline functionality

#### Devices to Test
- iPad (9th gen or later)
- iPad Air
- iPad Pro (11-inch and 12.9-inch)
- iPad Mini

#### iOS Versions
- iOS 15.4+
- iOS 16+
- iOS 17+
- Latest iOS version

#### Known Limitations
- No Web Serial API (USB not supported)
- Limited Web Bluetooth support
- Some PWA features may be restricted
- Background processing limited

### Mobile Phones (Secondary)

While tablets are the primary target, test on phones for backup navigation:

#### Android Phone
- Chrome browser
- Test core features
- Verify responsive layout
- Check touch target sizes

#### iPhone
- Safari browser
- Test core features
- Verify responsive layout
- Check iOS-specific behavior

## Browser Compatibility Matrix

| Feature | Chrome/Edge | Safari iOS | Firefox | Notes |
|---------|-------------|------------|---------|-------|
| PWA Install | ✅ | ✅ | ✅ | All support |
| Service Worker | ✅ | ✅ | ✅ | All support |
| IndexedDB | ✅ | ✅ | ✅ | All support |
| Geolocation | ✅ | ✅ | ✅ | All support |
| Web Serial | ✅ | ❌ | ❌ | Chrome/Edge only |
| Web Bluetooth | ✅ | Limited | ❌ | Limited on iOS |
| Mapbox GL JS | ✅ | ✅ | ✅ | All support |
| Offline Mode | ✅ | ✅ | ✅ | All support |

## Testing Tools

### Browser DevTools

**Chrome/Edge DevTools:**
- Application tab: Check Service Worker, Cache Storage, IndexedDB
- Network tab: Monitor requests, test offline mode
- Performance tab: Profile rendering performance
- Lighthouse: Run PWA audit

**Safari Web Inspector:**
- Storage tab: Check IndexedDB, Cache
- Network tab: Monitor requests
- Timelines: Profile performance

### Remote Debugging

**Android:**
```bash
# Enable USB debugging on device
# Connect via USB
# Open chrome://inspect in desktop Chrome
# Click "Inspect" on your device
```

**iOS:**
```bash
# Enable Web Inspector on iOS device
# Connect to Mac via USB
# Open Safari → Develop → [Your Device]
# Select the page to inspect
```

### Testing Checklist Script

Create a simple test report:

```javascript
// Run in browser console
const testReport = {
  device: navigator.userAgent,
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  online: navigator.onLine,
  serviceWorker: 'serviceWorker' in navigator,
  indexedDB: 'indexedDB' in window,
  geolocation: 'geolocation' in navigator,
  bluetooth: 'bluetooth' in navigator,
  serial: 'serial' in navigator,
  standalone: window.matchMedia('(display-mode: standalone)').matches
};

console.table(testReport);
```

## Common Issues and Solutions

### Issue: PWA Not Installing

**Symptoms:** No install prompt appears

**Solutions:**
1. Verify HTTPS is enabled
2. Check manifest.webmanifest is valid
3. Ensure Service Worker is registered
4. Check browser console for errors
5. Try manual install (browser menu)

**Chrome/Edge:** Menu → Install [App Name]
**Safari iOS:** Share → Add to Home Screen

### Issue: Offline Mode Not Working

**Symptoms:** App doesn't load when offline

**Solutions:**
1. Check Service Worker is active (DevTools → Application)
2. Verify cache storage has content
3. Test with DevTools offline mode first
4. Check for Service Worker errors
5. Clear cache and reload

### Issue: Map Not Loading

**Symptoms:** Blank map or error message

**Solutions:**
1. Verify Mapbox token is set
2. Check network requests for 401 errors
3. Verify CSP headers allow Mapbox domains
4. Check browser console for errors
5. Test with different network connection

### Issue: Poor Performance

**Symptoms:** Laggy interactions, slow rendering

**Solutions:**
1. Check device hardware capabilities
2. Profile with DevTools Performance tab
3. Verify no memory leaks
4. Check for excessive re-renders
5. Test with fewer map layers

### Issue: USB/Bluetooth Not Available

**Symptoms:** Connection options not showing

**Solutions:**
1. Verify browser support (Chrome/Edge for USB)
2. Check feature detection warnings
3. Ensure HTTPS is enabled
4. Try different browser
5. Check device permissions

## Performance Benchmarks

Target performance metrics for each device:

### Desktop (Windows)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 2.5s
- Map rendering: 60 FPS
- Memory usage: < 200MB

### Tablet (Android/iPad)
- First Contentful Paint: < 2s
- Time to Interactive: < 3s
- Map rendering: 60 FPS (30 FPS acceptable)
- Memory usage: < 150MB

### Phone (Backup)
- First Contentful Paint: < 2.5s
- Time to Interactive: < 4s
- Map rendering: 30 FPS
- Memory usage: < 100MB

## Accessibility Testing

Test with assistive technologies:

### Screen Readers
- **Windows:** NVDA or JAWS
- **macOS:** VoiceOver
- **iOS:** VoiceOver
- **Android:** TalkBack

### Keyboard Navigation
- Tab through all interactive elements
- Verify focus indicators
- Test keyboard shortcuts
- Ensure no keyboard traps

### Visual
- Test with high contrast mode
- Verify color contrast ratios
- Test with zoom (200%+)
- Check text scaling

## Test Report Template

Use this template to document testing results:

```markdown
# Device Test Report

**Date:** [Date]
**Tester:** [Name]
**Build Version:** [Version/Commit]

## Device Information
- **Device:** [Device name]
- **OS:** [OS and version]
- **Browser:** [Browser and version]
- **Screen Size:** [Width x Height]

## Test Results

### Installation
- [ ] Pass / [ ] Fail / [ ] N/A
**Notes:** 

### Offline Mode
- [ ] Pass / [ ] Fail / [ ] N/A
**Notes:** 

### Chart Display
- [ ] Pass / [ ] Fail / [ ] N/A
**Notes:** 

### Navigation Features
- [ ] Pass / [ ] Fail / [ ] N/A
**Notes:** 

### Device APIs
- [ ] Pass / [ ] Fail / [ ] N/A
**Notes:** 

### Performance
- [ ] Pass / [ ] Fail / [ ] N/A
**Notes:** 

## Issues Found
1. [Issue description]
2. [Issue description]

## Screenshots
[Attach screenshots if relevant]

## Overall Assessment
- [ ] Ready for production
- [ ] Minor issues (acceptable)
- [ ] Major issues (needs fixes)

**Summary:** 
```

## Automated Testing

Complement manual testing with automated tests:

```bash
# Run E2E tests on different browsers
cd pwa

# Chromium (simulates Chrome/Edge)
npm run test:e2e:chromium

# WebKit (simulates Safari)
npm run test:e2e:webkit

# Firefox
npm run test:e2e:firefox

# All browsers
npm run test:e2e
```

## Continuous Testing

Set up regular testing schedule:

1. **Pre-deployment:** Test on all target devices
2. **Post-deployment:** Smoke test on production
3. **Weekly:** Regression testing on key devices
4. **Monthly:** Full compatibility testing
5. **After updates:** Test affected features

## Documentation

Document all testing results:
- Keep test reports in project repository
- Track issues in issue tracker
- Update compatibility matrix
- Share findings with team
- Update user documentation with known issues

## Next Steps

After completing device testing:
1. Document all issues found
2. Prioritize fixes (critical vs. nice-to-have)
3. Update compatibility documentation
4. Inform users of any limitations
5. Plan for future improvements
