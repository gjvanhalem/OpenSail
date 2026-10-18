import { defineConfig, devices } from '@playwright/test';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** The OpenSail server with accounts (server/node.ts), for e2e/accounts.spec.ts */
const ACCOUNTS_PORT = 4176;
export const ACCOUNTS_SETUP_CODE = 'e2e-setup-code';

/**
 * Playwright configuration for E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Fail fast instead of letting a broken run time out test by test
  globalTimeout: process.env.CI ? 15 * 60 * 1000 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Start with the browser-compatibility banner dismissed: on browsers without
    // Web Bluetooth/Serial (Linux CI Chromium) it overlays the navigation bar
    storageState: 'e2e/fixtures/storage-state.json',
  },

  projects: [
    {
      name: 'chromium',
      testIgnore: /accounts\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Headless Chromium's default WebGL (ANGLE on SwiftShader Vulkan) fails to
        // compile one of MapLibre's shaders and loses the WebGL context on the
        // first frame; ANGLE's own SwiftShader backend doesn't
        launchOptions: { args: ['--use-angle=swiftshader'] },
      },
    },
    {
      // The production server with sign-in, users and invites
      name: 'accounts',
      testMatch: /accounts\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${ACCOUNTS_PORT}`,
        launchOptions: { args: ['--use-angle=swiftshader'] },
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: [
    {
      command: 'npm run preview',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      // Serves the same build; a fresh data folder per run, so setup starts empty
      command: 'node ../server/node.ts',
      url: `http://localhost:${ACCOUNTS_PORT}/healthz`,
      reuseExistingServer: false,
      timeout: 60 * 1000,
      env: {
        PORT: String(ACCOUNTS_PORT),
        DIST_DIR: 'dist',
        CHARTS_DIR: 'e2e/fixtures/charts',
        DATA_DIR: path.join(tmpdir(), `opensail-e2e-${process.pid}-${Date.now()}`),
        OPENSAIL_SETUP_CODE: ACCOUNTS_SETUP_CODE,
      },
    },
  ],
});
