# Performance Testing Guide

This guide covers the performance tests for the OpenSail app: the Playwright performance tests and the Lighthouse audits.

## Targets

From the original requirements (R7.1, R7.3, R7.5):

- **Initial Load Time:** < 2 seconds
- **Time to Interactive:** < 3 seconds
- **UI Response Time:** < 100ms
- **Chart Rendering:** 60 FPS during interactions
- **Lighthouse Performance Score:** > 80

## E2E Performance Tests

`e2e/performance.spec.ts` runs in the `chromium` Playwright project, so CI runs it on every pull request. Run it locally with:

```bash
npm run build
npx playwright test --project=chromium performance.spec.ts
```

(`npm run test:e2e:performance` does the same for every Playwright project, including the browsers CI doesn't run.)

To run one group, add `--grep`, for example `--grep "Chart Rendering"`.

| Group | What it checks |
|-------|----------------|
| Load Time Metrics | Initial load < 2s, First Contentful Paint < 1.5s, Time to Interactive < 3s, chart page < 2s |
| UI Responsiveness | Interactions respond in < 100ms, average page change < 500ms |
| Chart Rendering Performance | Average > 55 FPS while idle, panning and zooming; 95th-percentile frame < 33 ms |
| Memory and Resource Usage | Memory grows < 50% over repeated navigation, a long track list renders in < 1s |
| Bundle Size and Code Splitting | Pages are lazy loaded, initial JS < 1 MB |
| Offline Performance | Loading from the cache < 1s, offline page changes < 500ms |

The chart tests wait until the map is idle before measuring, and the tile servers are stubbed (see [e2e/README.md](e2e/README.md)), so they measure rendering, not the network.

`e2e/stress.spec.ts` covers large data: a route with 60 waypoints, 100 hours of track and 10+ routes offline.

## Lighthouse Audits

Lighthouse CI is configured in `../lighthouserc.json`. It audits `/`, `/chart`, `/routes` and `/settings` on the preview server, three runs each, with the desktop preset.

**In CI:** the `lighthouse` job in `.github/workflows/pwa-deploy.yml` runs only on manual runs (Actions → PWA Build and Deploy → Run workflow), to save Actions minutes. The reports are uploaded as the `lighthouse-results` artifact.

**Locally:** `@lhci/cli` is not a dependency of the project, so install it first:

```bash
npm install -g @lhci/cli
npm run build
npm run lighthouse
```

`npm run test:performance` builds the app, runs Lighthouse CI and writes a summary to `performance-reports/` (not committed). Reports are saved in `.lighthouseci/`.

### Lighthouse Thresholds

| Category | Threshold | Level |
|----------|-----------|-------|
| Performance | > 80 | Warn |
| Accessibility | > 90 | Error |
| Best Practices | > 90 | Warn |
| SEO | > 90 | Warn |
| PWA | > 90 | Warn |

**Key Metrics (warn):**
- First Contentful Paint < 2s
- Largest Contentful Paint < 3s
- Cumulative Layout Shift < 0.1
- Total Blocking Time < 300ms

## Device Testing

Automated tests run in headless Chromium with a software WebGL renderer. Check the chart on real hardware before a release, especially on the devices sailors use on board:

- **Windows laptop or tablet:** the Windows app, or Chrome / Edge
- **Android tablet or phone:** the Android app, or Chrome

### Testing Procedure

1. **Cold start:** clear the app data and measure the first load
2. **Offline:** turn off the network, check that downloaded chart regions still show
3. **Chart:** pan and zoom with ENC layers and seamarks on; it should stay smooth
4. **With data:** a long track and several routes
5. **Long session:** leave it running with the GPS simulator and watch memory in DevTools

## Troubleshooting

### Chart FPS < 60

1. Check for unnecessary re-renders (React DevTools Profiler)
2. Check that position updates don't re-render the whole chart page
3. Turn layers off in the Layers panel to find an expensive one
4. Test on real hardware: the CI renderer is slower than a GPU

### Load Time > 2s

1. Check bundle sizes in the `npm run build` output
2. Check that the pages are still lazy loaded (`src/App.tsx`)
3. Look for render-blocking resources

### Memory Leaks

1. Check that event listeners, timers and map listeners are cleaned up
2. Use the Chrome DevTools Memory profiler

### Offline Issues

1. Check the service worker in DevTools → Application
2. Check the caching rules in `vite.config.ts`. Chart tiles are not in the service worker cache: downloaded regions come from IndexedDB through the `opensail://` protocol
3. The native apps have no service worker; they load the app from their package

## Resources

- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals](https://web.dev/vitals/)
- [MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/)
