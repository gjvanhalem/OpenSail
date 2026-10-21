# E2E Tests with Playwright

This directory contains the end-to-end tests for the app, run with Playwright against the production build.

## Test Coverage

### Chart
- **chart-display.spec.ts**, **chart-controls.spec.ts**, **chart-follow.spec.ts**: map rendering, zoom buttons, Layers panel, instrument strip, following the vessel, north-up / heading-up
- **chart-enc.spec.ts**: inland ENC depth areas and hazards
- **chart-management.spec.ts**: offline chart regions, editions and updates
- **offline.spec.ts**: the app and downloaded charts without a network

### Routes and Tracks
- **route-planning.spec.ts**, **route-navigation.spec.ts**, **route-passage.spec.ts**, **route-hazards.spec.ts**: planning, active navigation, route summary, hazard warnings
- **track-recording.spec.ts**, **track-to-route.spec.ts**: recording, GPX export, colours, converting a track to a route

### Instruments
- **instrument-stub.spec.ts**: the simulator's NMEA 0183, NMEA 2000 and SeaTalk data reaching the display
- **instrument-panels.spec.ts**, **instrument-alerts.spec.ts**, **units.spec.ts**: panels, min/max alerts, units
- **navigation-sources.spec.ts**, **wifi-instruments.spec.ts**: which source each value comes from, Wi-Fi connections and magnetic variation

### Safety
- **man-overboard.spec.ts**, **anchor-watch.spec.ts**, **safety-alarms.spec.ts**

### App and Layout
- **navigation.spec.ts**, **responsive-design.spec.ts**, **phone-layout.spec.ts**: top tabs on wide screens, bottom bar below 1024 px
- **night-mode.spec.ts**, **settings.spec.ts**
- **pwa-installation.spec.ts**, **browser-compatibility.spec.ts**
- **performance.spec.ts**, **stress.spec.ts**: load times, frame rates, large routes and tracks

### Accounts
- **accounts.spec.ts**: setup, sign-in, invites and crew roles on the OpenSail server (`server/node.ts`)

## Projects

`playwright.config.ts` defines these projects:

- **chromium**: every test except `accounts.spec.ts`, against `npm run preview` on port 4173
- **accounts**: only `accounts.spec.ts`, against the OpenSail server on port 4176, with a fresh data folder for each run

CI runs these two. The config also has `firefox`, `webkit`, `Mobile Chrome` and `Mobile Safari` projects, which CI doesn't run.

## Running Tests

### Build the app first
Tests run against the production build in `dist/`:
```bash
npm run build
```

### Run the tests CI runs
```bash
npx playwright test --project=chromium --project=accounts
```

`npm run test:e2e` runs every project, including the browsers CI doesn't run. Playwright starts the preview server and the accounts server itself.

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run specific test file
```bash
npx playwright test --project=chromium route-planning.spec.ts
```

### Run tests matching a pattern
```bash
npx playwright test --project=chromium --grep "route"
```

## Fixtures and Helpers

- **fixtures/test.ts**: import `test` and `expect` from here, not from `@playwright/test`. It answers every request to the external tile servers (OpenFreeMap, OpenSeaMap) locally, so tests never depend on them. `serveChartFixtures()` serves a small ENC region (Stavoren) from `fixtures/charts/`.
- **fixtures/storage-state.json**: starts each test with the browser-compatibility banner dismissed.
- **helpers/**: shared steps for charts, routes and tracks (for example seeding a track straight into IndexedDB).

## Test Structure

```typescript
import { test, expect } from './fixtures/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('does something', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Routes' })).toBeVisible();
  });
});
```

## Debugging Tests

### Debug specific test
```bash
npx playwright test --project=chromium --debug navigation.spec.ts
```

### View test report
```bash
npx playwright show-report
```

### Generate trace
Tests generate traces on the first retry. View them:
```bash
npx playwright show-trace trace.zip
```

## CI/CD Integration

`.github/workflows/pwa-deploy.yml` runs the `chromium` and `accounts` projects on every pull request and push to `main`, with:
- Retries: 2 attempts on failure
- Workers: 1 (sequential execution)
- A 15-minute global timeout
- Screenshots on failure, traces on the first retry, and the HTML report as a build artifact

Headless Chromium runs with `--use-angle=swiftshader`, because its default WebGL backend can't compile one of MapLibre's shaders.

## Known Limitations

1. **Web Serial/Bluetooth**: can't be tested automatically (they need a user gesture and a device). Use the instrument simulator instead.
2. **Geolocation**: mocked or simulated in tests.
3. **Native apps**: these tests cover the browser build. The Windows and Android apps have their own smoke tests in `desktop/smoke/` and `android/smoke/`.

## Adding New Tests

1. Create a new `.spec.ts` file in the `e2e` directory
2. Import `test` and `expect` from `./fixtures/test`
3. Use the helpers for common steps
4. Run it: `npx playwright test --project=chromium your-test.spec.ts`

## Best Practices

- Use semantic selectors (roles, labels) over CSS selectors
- Wait on conditions (`expect.poll`, `toBeVisible`), not fixed timeouts
- Test user workflows, not implementation details
- Keep tests independent and isolated
- Add meaningful test descriptions
