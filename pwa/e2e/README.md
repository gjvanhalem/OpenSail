# E2E Tests with Playwright

This directory contains end-to-end tests for the PWA using Playwright.

## Test Coverage

### User Workflows
- **navigation.spec.ts**: Tests navigation between pages and browser history
- **route-planning.spec.ts**: Tests route creation, waypoint management, and persistence
- **track-recording.spec.ts**: Tests track recording, display, and export functionality
- **chart-display.spec.ts**: Tests map rendering, interaction, and vessel position display
- **settings.spec.ts**: Tests settings management and persistence

### PWA Features
- **pwa-installation.spec.ts**: Tests PWA manifest, service worker, and installability
- **offline.spec.ts**: Tests offline functionality and data caching

### Cross-Platform
- **responsive-design.spec.ts**: Tests responsive layout across different screen sizes
- **browser-compatibility.spec.ts**: Tests feature detection and browser-specific behavior

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests for specific browser
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### Run specific test file
```bash
npx playwright test navigation.spec.ts
```

### Run tests matching a pattern
```bash
npx playwright test --grep "route"
```

## Test Requirements

1. **Build the app first**: Tests run against the production build
   ```bash
   npm run build
   ```

2. **Preview server**: Tests automatically start the preview server, but you can run it manually:
   ```bash
   npm run preview
   ```

## Browser Support

Tests run on multiple browsers by default:
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)
- Mobile Chrome (Pixel 5 emulation)
- Mobile Safari (iPhone 12 emulation)

## Test Structure

Each test file follows this pattern:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

## Debugging Tests

### Debug specific test
```bash
npx playwright test --debug navigation.spec.ts
```

### View test report
```bash
npx playwright show-report
```

### Generate trace
Tests automatically generate traces on first retry. View them:
```bash
npx playwright show-trace trace.zip
```

## CI/CD Integration

Tests are configured for CI environments:
- Retries: 2 attempts on failure
- Workers: 1 (sequential execution)
- Screenshots: Captured on failure
- Traces: Captured on first retry

## Known Limitations

1. **Web Serial/Bluetooth**: Cannot be fully tested in automated tests (requires user interaction)
2. **Geolocation**: Mocked in tests, may not reflect real device behavior
3. **Service Worker**: May require additional wait time in some browsers
4. **IndexedDB**: Cleared between test runs for isolation

## Adding New Tests

1. Create a new `.spec.ts` file in the `e2e` directory
2. Import test utilities: `import { test, expect } from '@playwright/test';`
3. Write test cases following the existing patterns
4. Run tests to verify: `npm run test:e2e`

## Best Practices

- Use semantic selectors (roles, labels) over CSS selectors
- Add appropriate waits for async operations
- Test user workflows, not implementation details
- Keep tests independent and isolated
- Use page object pattern for complex pages
- Add meaningful test descriptions
