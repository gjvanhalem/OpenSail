import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';

/**
 * The shared alarm system (Phase 4): a Web Audio siren, a full-screen alert
 * and a screen wake lock for safety alarms, and a beep for instrument alerts.
 * The app reports what it plays on <html> (data-alarm-sound, data-alarm-audio,
 * data-wake-lock), since a test can't listen.
 */

const html = (page: Page) => page.locator('html');
const overlay = (page: Page) => page.getByRole('alertdialog');

test.describe('Alarm system', () => {
  test('a test alarm sounds and fills the screen until it is silenced', async ({ page }) => {
    await page.goto('/settings');
    await expect(html(page)).toHaveAttribute('data-alarm-sound', 'off');

    await page.getByRole('button', { name: 'Test alarm' }).click();
    await expect(overlay(page)).toBeVisible();
    await expect(overlay(page)).toContainText('Test alarm');
    await expect(html(page)).toHaveAttribute('data-alarm-sound', 'alarm');
    // The tap unlocked audio, so the siren is actually playing
    await expect(html(page)).toHaveAttribute('data-alarm-audio', 'running');
    // The screen is kept on (or the browser said why not)
    await expect(html(page)).toHaveAttribute('data-wake-lock', /^(held|denied|unsupported)$/);

    // It covers the whole viewport
    const box = await overlay(page).boundingBox();
    const viewport = page.viewportSize()!;
    expect(box?.width).toBe(viewport.width);
    expect(box?.height).toBe(viewport.height);

    await overlay(page).getByRole('button', { name: 'Silence' }).click();
    await expect(overlay(page)).toBeHidden();
    await expect(html(page)).toHaveAttribute('data-alarm-sound', 'off');
    await expect(html(page)).toHaveAttribute('data-wake-lock', 'off');
  });

  test('the full-screen alert also shows in fullscreen mode', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
    await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible();

    await page.getByRole('button', { name: 'Test alarm' }).click();
    await expect(overlay(page)).toBeVisible();
    await overlay(page).getByRole('button', { name: 'Silence' }).click();
    await expect(overlay(page)).toBeHidden();
  });

  test('an instrument alert beeps until it is acknowledged', async ({ page }) => {
    await page.goto('/instruments');
    await page.getByRole('button', { name: 'Simulator', exact: true }).click();
    await page.getByRole('button', { name: 'Start Simulator' }).click();
    await page.getByLabel('Realistic variation').uncheck();

    await page.getByLabel('Depth (m)').fill('2');
    const banner = page.getByRole('alert').filter({ hasText: 'Depth' });
    await expect(banner).toBeVisible();
    await expect(html(page)).toHaveAttribute('data-alarm-sound', 'warning');
    // A beep, not the full-screen alert
    await expect(overlay(page)).toBeHidden();

    await banner.getByRole('button', { name: 'Acknowledge' }).click();
    await expect(html(page)).toHaveAttribute('data-alarm-sound', 'off');
  });
});
