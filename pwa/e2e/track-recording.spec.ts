import { test, expect } from '@playwright/test';

test.describe('Track Recording', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tracks');
  });

  test('should start track recording', async ({ page }) => {
    // Look for start/record button
    const startButton = page.getByRole('button', { name: /start|record|new track/i });
    
    if (await startButton.isVisible()) {
      await startButton.click();
      
      // Should show recording indicator
      const recordingIndicator = page.getByText(/recording|active/i);
      await expect(recordingIndicator).toBeVisible({ timeout: 5000 });
    }
  });

  test('should stop track recording', async ({ page }) => {
    // Start recording first
    const startButton = page.getByRole('button', { name: /start|record|new track/i });
    
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      // Stop recording
      const stopButton = page.getByRole('button', { name: /stop|end/i });
      await stopButton.click();
      
      // Should show stopped state
      const stoppedIndicator = page.getByText(/stopped|completed/i);
      await expect(stoppedIndicator).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display recorded tracks', async ({ page }) => {
    // Should show tracks list or empty state
    const tracksList = page.locator('[class*="track"], [data-testid="tracks-list"]');
    const emptyState = page.getByText(/no tracks|empty/i);
    
    const hasContent = await tracksList.isVisible().catch(() => false) ||
                      await emptyState.isVisible().catch(() => false);
    
    expect(hasContent).toBeTruthy();
  });

  test('should persist tracks after page reload', async ({ page }) => {
    // Start and stop a track
    const startButton = page.getByRole('button', { name: /start|record|new track/i });
    
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      const stopButton = page.getByRole('button', { name: /stop|end/i });
      await stopButton.click();
      await page.waitForTimeout(1000);
      
      // Get track count
      const trackItems = page.locator('[class*="track-item"], [data-testid*="track"]');
      const initialCount = await trackItems.count();
      
      // Reload page
      await page.reload();
      
      // Verify tracks still exist
      const newCount = await trackItems.count();
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    }
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
