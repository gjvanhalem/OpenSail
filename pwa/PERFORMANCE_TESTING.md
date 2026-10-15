# Performance Testing Guide

This guide covers all performance testing for the OpenSail PWA, including Lighthouse audits, E2E performance tests, load time measurements, and chart rendering verification.

## Requirements

Based on the PWA Migration requirements (7.1, 7.3, 7.5):

- **Initial Load Time:** < 2 seconds on 4G connection
- **Time to Interactive:** < 3 seconds
- **UI Response Time:** < 100ms
- **Chart Rendering:** 60 FPS during interactions
- **PWA Launch Time:** < 1 second (installed)
- **Lighthouse Performance Score:** > 80
- **Lighthouse PWA Score:** > 90

## Quick Start

### Run All Performance Tests

```bash
cd pwa
npm run test:performance
```

This will:
1. Build the production bundle
2. Run Lighthouse audits on all pages
3. Generate a performance report

### Run E2E Performance Tests

```bash
npm run test:e2e:performance
```

This runs Playwright tests that verify:
- Load time metrics
- UI responsiveness
- Chart rendering FPS
- Memory usage
- Bundle sizes
- Offline performance

### Run Lighthouse Only

```bash
npm run lighthouse
```

## Test Categories

### 1. Load Time Metrics

**What:** Measures how quickly the app loads and becomes interactive

**Tests:**
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3s
- Initial page load < 2s

**How to Run:**
```bash
npm run test:e2e:performance -- --grep "Load Time"
```

**Expected Results:**
- Home page loads in < 2s
- Chart view loads in < 2s
- All pages become interactive in < 3s

### 2. UI Responsiveness

**What:** Verifies the UI responds quickly to user interactions

**Tests:**
- Button clicks respond in < 100ms
- Navigation between pages is smooth
- No janky animations or transitions

**How to Run:**
```bash
npm run test:e2e:performance -- --grep "UI Responsiveness"
```

**Expected Results:**
- All interactions respond within 100ms
- Average navigation time < 500ms

### 3. Chart Rendering Performance

**What:** Verifies the map renders at 60 FPS during interactions

**Tests:**
- Idle rendering maintains 60 FPS
- Pan gestures maintain > 55 FPS
- Zoom operations maintain > 55 FPS
- Minimum FPS never drops below 30

**How to Run:**
```bash
npm run test:e2e:performance -- --grep "Chart Rendering"
```

**Expected Results:**
- Average FPS > 55 during all interactions
- Minimum FPS > 30 (no severe frame drops)

**Note:** These tests measure actual frame rates during map interactions. If tests fail:
1. Check for unnecessary re-renders
2. Verify debouncing on position updates
3. Review map layer complexity
4. Test on actual hardware (tablets)

### 4. Offline Functionality

**What:** Tests performance when running offline from cache

**Tests:**
- Offline load time < 1s (from cache)
- Offline navigation is smooth
- Service Worker caching works correctly

**How to Run:**
```bash
npm run test:e2e -- offline.spec.ts
npm run test:e2e:performance -- --grep "Offline Performance"
```

**Expected Results:**
- Cached pages load faster than online (< 1s)
- All cached routes accessible offline
- No network errors when offline

### 5. Memory and Resource Usage

**What:** Ensures the app doesn't leak memory or use excessive resources

**Tests:**
- Memory doesn't increase > 50% after multiple navigations
- Large datasets render efficiently
- No memory leaks in components

**How to Run:**
```bash
npm run test:e2e:performance -- --grep "Memory"
```

**Expected Results:**
- Memory usage stays stable
- Track lists render in < 1s
- No significant memory growth

### 6. Bundle Size and Code Splitting

**What:** Verifies optimal bundle sizes and lazy loading

**Tests:**
- Total initial JS < 1MB
- Route components are lazy loaded
- Vendor chunks are properly split

**How to Run:**
```bash
npm run test:e2e:performance -- --grep "Bundle Size"
npm run build
```

**Expected Results:**
- Initial bundle < 1MB
- Additional chunks loaded on navigation
- Vendor chunks separated (react, redux, maplibre)

## Lighthouse Audits

### Running Lighthouse

Lighthouse audits are configured in `../lighthouserc.json` and test:
- Performance
- Accessibility
- Best Practices
- SEO
- PWA compliance

**Run Lighthouse:**
```bash
npm run lighthouse
```

**View Reports:**
Reports are saved in `.lighthouseci/` directory. Open the HTML files in a browser.

### Lighthouse Thresholds

Configured in `lighthouserc.json`:

| Category | Threshold | Requirement |
|----------|-----------|-------------|
| Performance | > 80 | Warn |
| Accessibility | > 90 | Error |
| Best Practices | > 90 | Warn |
| SEO | > 90 | Warn |
| PWA | > 90 | Warn |

**Key Metrics:**
- First Contentful Paint < 2s
- Largest Contentful Paint < 3s
- Cumulative Layout Shift < 0.1
- Total Blocking Time < 300ms

### Interpreting Results

**Performance Score < 80:**
- Check bundle sizes
- Review render-blocking resources
- Optimize images
- Verify Service Worker caching

**PWA Score < 90:**
- Check manifest.json
- Verify Service Worker registration
- Ensure HTTPS in production
- Check installability

**Accessibility < 90:**
- Review color contrast
- Check ARIA labels
- Verify keyboard navigation
- Test with screen readers

## Device Testing

Performance should be tested on actual target devices:

### Windows Desktop
- **Browser:** Chrome or Edge
- **Connection:** Fast WiFi
- **Expected:** All metrics easily met

### Android Tablet
- **Browser:** Chrome
- **Connection:** 4G or WiFi
- **Expected:** May be slower, but should meet thresholds

### iPad
- **Browser:** Safari
- **Connection:** WiFi
- **Expected:** Similar to Android, watch for Safari-specific issues

### Testing Procedure

1. **Install PWA** on device
2. **Test cold start:** Clear cache, measure first load
3. **Test warm start:** Measure subsequent loads
4. **Test offline:** Enable airplane mode, verify functionality
5. **Test chart:** Pan, zoom, verify smooth 60 FPS
6. **Test with data:** Create routes/tracks, verify performance

## Performance Monitoring

### During Development

```bash
# Run dev server with performance monitoring
npm run dev

# In browser DevTools:
# 1. Open Performance tab
# 2. Record interaction
# 3. Check for long tasks (> 50ms)
# 4. Verify 60 FPS in frames view
```

### Before Release

```bash
# Full performance audit
npm run test:performance

# E2E performance tests
npm run test:e2e:performance

# Check bundle sizes
npm run build
# Review dist/ folder sizes
```

### In Production

Consider adding:
- Real User Monitoring (RUM)
- Core Web Vitals tracking
- Error tracking (Sentry, etc.)
- Performance budgets in CI/CD

## Troubleshooting

### Chart FPS < 60

**Symptoms:** Choppy map interactions, frame drops

**Solutions:**
1. Check for unnecessary re-renders (React DevTools Profiler)
2. Verify position updates are debounced
3. Reduce map layer complexity
4. Check for memory leaks
5. Test on actual hardware (may be test environment)

### Load Time > 2s

**Symptoms:** Slow initial page load

**Solutions:**
1. Check bundle sizes (`npm run build`)
2. Verify code splitting is working
3. Review Service Worker cache strategy
4. Check for render-blocking resources
5. Optimize images and assets

### Memory Leaks

**Symptoms:** Memory usage grows over time

**Solutions:**
1. Check event listener cleanup
2. Verify component unmounting
3. Review Redux subscriptions
4. Check IndexedDB connections
5. Use Chrome DevTools Memory Profiler

### Offline Issues

**Symptoms:** App doesn't work offline

**Solutions:**
1. Verify Service Worker registration
2. Check cache strategy in `vite.config.ts`
3. Test with DevTools offline mode
4. Check browser console for errors
5. Verify HTTPS in production

## Performance Budgets

Recommended budgets to maintain:

| Metric | Budget | Current |
|--------|--------|---------|
| Initial JS | < 500 KB | Check with `npm run build` |
| Initial CSS | < 100 KB | Check with `npm run build` |
| Total Initial | < 1 MB | Check with `npm run build` |
| FCP | < 1.5s | Run Lighthouse |
| LCP | < 2.5s | Run Lighthouse |
| TTI | < 3s | Run Lighthouse |
| CLS | < 0.1 | Run Lighthouse |

## Continuous Integration

Add to CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Build
  run: cd pwa && npm run build

- name: Run Performance Tests
  run: cd pwa && npm run test:e2e:performance

- name: Run Lighthouse
  run: cd pwa && npm run lighthouse

- name: Check Bundle Size
  run: |
    cd pwa
    npm run build
    # Add bundle size check script
```

## Resources

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals](https://web.dev/vitals/)
- [Playwright Performance Testing](https://playwright.dev/docs/test-performance)
- [React Performance](https://react.dev/learn/render-and-commit)
- [MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/)

## Next Steps

1. ✅ Run initial performance audit: `npm run test:performance`
2. ✅ Run E2E performance tests: `npm run test:e2e:performance`
3. ✅ Review Lighthouse reports
4. ✅ Test on actual devices (Windows, Android, iPad)
5. ✅ Address any failing metrics
6. ✅ Set up performance monitoring in CI/CD
7. ✅ Establish performance budgets

---

*Last updated: Task 20.3 - Performance Testing Implementation*
