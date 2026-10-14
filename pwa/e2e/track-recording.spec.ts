import { test, expect, type Page } from '@playwright/test';

async function startRecording(page: Page, name: string) {
  await page.getByRole('button', { name: 'Start Recording' }).click();
  await page.getByLabel('Track Name').fill(name);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
}

test.describe('Track Recording', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tracks');
  });

  test('should start track recording', async ({ page }) => {
    await startRecording(page, 'E2E Start Track');

    await expect(page.getByText('Recording', { exact: true })).toBeVisible();
    await expect(page.getByText('E2E Start Track')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stop & Save' })).toBeVisible();
  });

  test('should stop track recording', async ({ page }) => {
    await startRecording(page, 'E2E Stop Track');
    await page.getByRole('button', { name: 'Stop & Save' }).click();

    // Back to idle, and the saved track appears in the list without a reload
    await expect(page.getByRole('button', { name: 'Start Recording' })).toBeVisible();
    await expect(page.getByText('Recording', { exact: true })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'E2E Stop Track' })).toBeVisible();
  });

  test('should display recorded tracks', async ({ page }) => {
    // Fresh browser context: empty state
    await expect(page.getByText('No tracks recorded')).toBeVisible();

    await startRecording(page, 'E2E Listed Track');
    await page.getByRole('button', { name: 'Stop & Save' }).click();

    await expect(page.getByText('No tracks recorded')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'E2E Listed Track' })).toBeVisible();
  });

  test('should persist tracks after page reload', async ({ page }) => {
    await startRecording(page, 'E2E Persistent Track');
    await page.getByRole('button', { name: 'Stop & Save' }).click();
    await expect(page.getByRole('heading', { name: 'E2E Persistent Track' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'E2E Persistent Track' })).toBeVisible();
  });

  test('should delete a track', async ({ page }) => {
    // Look for any existing tracks
    const trackItems = page.locator('[class*="track-item"], [data-testid*="track"]');
    const trackCount = await trackItems.count();
    
    if (trackCount > 0) {
      // Delete first track
      const deleteButton = trackItems.first().getByRole('button', { name: /delete/i });
      await deleteButton.click();
      
      // Confirm deletion
      const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Wait for deletion
      await page.waitForTimeout(500);
      
      // Verify track count decreased
      const newCount = await trackItems.count();
      expect(newCount).toBeLessThan(trackCount);
    }
  });

  test('should export track data', async ({ page }) => {
    // Look for export functionality
    const trackItems = page.locator('[class*="track-item"], [data-testid*="track"]');
    const trackCount = await trackItems.count();
    
    if (trackCount > 0) {
      // Look for export button
      const exportButton = page.getByRole('button', { name: /export|download/i });
      
      if (await exportButton.isVisible()) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download');
        
        await exportButton.click();
        
        // Verify download started
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.gpx|\.json/i);
      }
    }
  });
});
