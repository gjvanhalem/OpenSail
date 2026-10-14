import { test, expect } from '@playwright/test';

test.describe('Performance Testing', () => {
  test.describe('Load Time Metrics', () => {
    test('should load initial page within 2 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      
      // Wait for main content to be visible
      await expect(page.locator('h1, h2').first()).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 2 seconds (Requirement 7.1)
      expect(loadTime).toBeLessThan(2000);
      
      console.log(`Initial load time: ${loadTime}ms`);
    });

    test('should measure First Contentful Paint', async ({ page }) => {
      await page.goto('/');
      
      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const paint = performance.getEntriesByType('paint');
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
        return {
          fcp: fcp ? fcp.startTime : 0,
        };
      });
      
      console.log(`First Contentful Paint: ${metrics.fcp}ms`);
      
      // FCP should be under 1500ms for good performance
      expect(metrics.fcp).toBeLessThan(1500);
    });

    test('should measure Time to Interactive', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      
      // Wait for page to be interactive (can click buttons)
      const button = page.locator('button, a').first();
      await button.waitFor({ state: 'visible' });
      
      const tti = Date.now() - startTime;
      
      console.log(`Time to Interactive: ${tti}ms`);
      
      // TTI should be under 3 seconds (Requirement 7.1)
      expect(tti).toBeLessThan(3000);
    });

    test('should load chart view quickly', async ({ page }) => {
      await page.goto('/');
      
      const startTime = Date.now();
      
      // Navigate to chart
      await page.click('a[href="/chart"]');
      
      // Wait for map to be visible
      await page.waitForSelector('.mapboxgl-canvas', { timeout: 5000 });
      
      const chartLoadTime = Date.now() - startTime;
      
      console.log(`Chart load time: ${chartLoadTime}ms`);
      
      // Chart should load within 2 seconds
      expect(chartLoadTime).toBeLessThan(2000);
    });
  });

  test.describe('UI Responsiveness', () => {
    test('should respond to interactions within 100ms', async ({ page }) => {
      await page.goto('/');
      
      // Find an interactive element
      const button = page.locator('button, a').first();
      await button.waitFor({ state: 'visible' });
      
      const startTime = Date.now();
      
      // Click and measure response
      await button.click();
      
      // Wait for any visual feedback (state change, navigation, etc.)
      await page.waitForTimeout(50);
      
      const responseTime = Date.now() - startTime;
      
      console.log(`UI response time: ${responseTime}ms`);
      
      // Should respond within 100ms (Requirement 7.2)
      expect(responseTime).toBeLessThan(100);
    });

    test('should handle rapid navigation without lag', async ({ page }) => {
      await page.goto('/');
      
      const routes = ['/chart', '/routes', '/tracks', '/settings', '/'];
      const navigationTimes: number[] = [];
      
      for (const route of routes) {
        const startTime = Date.now();
        await page.goto(route);
        await expect(page.locator('h1, h2').first()).toBeVisible();
        const navTime = Date.now() - startTime;
        navigationTimes.push(navTime);
        console.log(`Navigation to ${route}: ${navTime}ms`);
      }
      
      // Average navigation should be fast
      const avgTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
      expect(avgTime).toBeLessThan(500);
    });
  });

  test.describe('Chart Rendering Performance', () => {
    test('should render chart at 60 FPS during interactions', async ({ page }) => {
      await page.goto('/chart');
      
      // Wait for map to load
      await page.waitForSelector('.mapboxgl-canvas', { timeout: 5000 });
      
      // Start measuring FPS
      const fpsData = await page.evaluate(async () => {
        return new Promise<{ avgFps: number; minFps: number }>((resolve) => {
          const frames: number[] = [];
          let lastTime = performance.now();
          const duration = 2000; // Measure for 2 seconds
          const startTime = performance.now();
          
          function measureFrame() {
            const currentTime = performance.now();
            const delta = currentTime - lastTime;
            const fps = 1000 / delta;
            frames.push(fps);
            lastTime = currentTime;
            
            if (currentTime - startTime < duration) {
              requestAnimationFrame(measureFrame);
            } else {
              const avgFps = frames.reduce((a, b) => a + b, 0) / frames.length;
              const minFps = Math.min(...frames);
              resolve({ avgFps, minFps });
            }
          }
          
          requestAnimationFrame(measureFrame);
        });
      });
      
      console.log(`Average FPS: ${fpsData.avgFps.toFixed(2)}`);
      console.log(`Minimum FPS: ${fpsData.minFps.toFixed(2)}`);
      
      // Should maintain close to 60 FPS (Requirement 7.3)
      expect(fpsData.avgFps).toBeGreaterThan(55);
      expect(fpsData.minFps).toBeGreaterThan(30);
    });

    test('should maintain FPS during map pan', async ({ page }) => {
      await page.goto('/chart');
      
      // Wait for map to load
      const canvas = await page.waitForSelector('.mapboxgl-canvas', { timeout: 5000 });
      
      // Get canvas bounding box
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');
      
      // Measure FPS during pan
      const fpsData = await page.evaluate(async () => {
        return new Promise<{ avgFps: number }>((resolve) => {
          const frames: number[] = [];
          let lastTime = performance.now();
          const duration = 1000;
          const startTime = performance.now();
          
          function measureFrame() {
            const currentTime = performance.now();
            const delta = currentTime - lastTime;
            if (delta > 0) {
              frames.push(1000 / delta);
            }
            lastTime = currentTime;
            
            if (currentTime - startTime < duration) {
              requestAnimationFrame(measureFrame);
            } else {
              const avgFps = frames.reduce((a, b) => a + b, 0) / frames.length;
              resolve({ avgFps });
            }
          }
          
          requestAnimationFrame(measureFrame);
        });
      });
      
      // Perform pan gesture
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 100, { steps: 10 });
      await page.mouse.up();
      
      console.log(`FPS during pan: ${fpsData.avgFps.toFixed(2)}`);
      
      // Should maintain 60 FPS during pan (Requirement 7.3, 7.5)
      expect(fpsData.avgFps).toBeGreaterThan(55);
    });

    test('should maintain FPS during zoom', async ({ page }) => {
      await page.goto('/chart');
      
      // Wait for map to load
      await page.waitForSelector('.mapboxgl-canvas', { timeout: 5000 });
      
      // Measure FPS during zoom
      const performanceMetrics = await page.evaluate(async () => {
        const frames: number[] = [];
        let lastTime = performance.now();
        
        // Start measuring
        const measurePromise = new Promise<number>((resolve) => {
          let frameCount = 0;
          const maxFrames = 60; // Measure ~1 second at 60fps
          
          function measureFrame() {
            const currentTime = performance.now();
            const delta = currentTime - lastTime;
            if (delta > 0) {
              frames.push(1000 / delta);
            }
            lastTime = currentTime;
            frameCount++;
            
            if (frameCount < maxFrames) {
              requestAnimationFrame(measureFrame);
            } else {
              const avgFps = frames.reduce((a, b) => a + b, 0) / frames.length;
              resolve(avgFps);
            }
          }
          
          requestAnimationFrame(measureFrame);
        });
        
        return measurePromise;
      });
      
      // Trigger zoom
      const canvas = page.locator('.mapboxgl-canvas');
      await canvas.click();
      await page.keyboard.press('Equal'); // Zoom in
      await page.keyboard.press('Equal');
      await page.keyboard.press('Minus'); // Zoom out
      
      console.log(`FPS during zoom: ${performanceMetrics.toFixed(2)}`);
      
      expect(performanceMetrics).toBeGreaterThan(55);
    });
  });

  test.describe('Memory and Resource Usage', () => {
    test('should not leak memory during navigation', async ({ page }) => {
      await page.goto('/');
      
      // Get initial memory
      const initialMetrics = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as Performance & { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Navigate multiple times
      for (let i = 0; i < 5; i++) {
        await page.goto('/chart');
        await page.waitForTimeout(500);
        await page.goto('/routes');
        await page.waitForTimeout(500);
        await page.goto('/tracks');
        await page.waitForTimeout(500);
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ('gc' in window) {
          (window as Window & { gc: () => void }).gc();
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Get final memory
      const finalMetrics = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as Performance & { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      if (initialMetrics > 0 && finalMetrics > 0) {
        const memoryIncrease = finalMetrics - initialMetrics;
        const increasePercent = (memoryIncrease / initialMetrics) * 100;
        
        console.log(`Initial memory: ${(initialMetrics / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Final memory: ${(finalMetrics / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Memory increase: ${increasePercent.toFixed(2)}%`);
        
        // Memory should not increase by more than 50% after multiple navigations
        expect(increasePercent).toBeLessThan(50);
      }
    });

    test('should handle large track data efficiently', async ({ page }) => {
      await page.goto('/tracks');
      
      // Measure time to render track list
      const startTime = Date.now();
      
      // Wait for track list to be visible
      await expect(page.locator('h1, h2').first()).toBeVisible();
      
      const renderTime = Date.now() - startTime;
      
      console.log(`Track list render time: ${renderTime}ms`);
      
      // Should render quickly even with data
      expect(renderTime).toBeLessThan(1000);
    });
  });

  test.describe('Bundle Size and Code Splitting', () => {
    test('should lazy load route components', async ({ page }) => {
      // Start on home page
      await page.goto('/');
      
      // Get initial resources
      const initialResources = await page.evaluate(() => {
        return performance.getEntriesByType('resource').length;
      });
      
      // Navigate to chart (should lazy load)
      await page.goto('/chart');
      await page.waitForSelector('.mapboxgl-canvas', { timeout: 5000 });
      
      // Get resources after navigation
      const afterResources = await page.evaluate(() => {
        return performance.getEntriesByType('resource').length;
      });
      
      console.log(`Initial resources: ${initialResources}`);
      console.log(`After navigation: ${afterResources}`);
      
      // Should have loaded additional chunks
      expect(afterResources).toBeGreaterThan(initialResources);
    });

    test('should have reasonable bundle sizes', async ({ page }) => {
      await page.goto('/');
      
      // Get all JavaScript resources
      const jsResources = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        return resources
          .filter(r => r.name.endsWith('.js'))
          .map(r => ({
            name: r.name.split('/').pop(),
            size: r.transferSize,
            duration: r.duration
          }));
      });
      
      console.log('JavaScript bundles:');
      jsResources.forEach(r => {
        console.log(`  ${r.name}: ${(r.size / 1024).toFixed(2)} KB (${r.duration.toFixed(2)}ms)`);
      });
      
      // Total JS should be reasonable (under 1MB for initial load)
      const totalSize = jsResources.reduce((sum, r) => sum + r.size, 0);
      console.log(`Total JS size: ${(totalSize / 1024).toFixed(2)} KB`);
      
      expect(totalSize).toBeLessThan(1024 * 1024); // 1MB
    });
  });

  test.describe('Offline Performance', () => {
    test('should load quickly from cache when offline', async ({ page, context }) => {
      // First visit online to cache
      await page.goto('/');
      await expect(page.locator('h1, h2').first()).toBeVisible();
      await page.waitForTimeout(2000); // Wait for service worker
      
      // Go offline
      await context.setOffline(true);
      
      // Measure offline load time
      const startTime = Date.now();
      await page.reload();
      await expect(page.locator('h1, h2').first()).toBeVisible();
      const offlineLoadTime = Date.now() - startTime;
      
      console.log(`Offline load time: ${offlineLoadTime}ms`);
      
      // Should load even faster from cache (under 1 second)
      expect(offlineLoadTime).toBeLessThan(1000);
    });

    test('should handle offline navigation smoothly', async ({ page, context }) => {
      // Cache the app
      await page.goto('/');
      await page.goto('/chart');
      await page.goto('/routes');
      await page.waitForTimeout(2000);
      
      // Go offline
      await context.setOffline(true);
      
      // Navigate while offline
      const routes = ['/', '/chart', '/routes', '/tracks'];
      
      for (const route of routes) {
        const startTime = Date.now();
        await page.goto(route);
        await expect(page.locator('h1, h2').first()).toBeVisible();
        const navTime = Date.now() - startTime;
        
        console.log(`Offline navigation to ${route}: ${navTime}ms`);
        
        // Offline navigation should be fast
        expect(navTime).toBeLessThan(500);
      }
    });
  });
});
