import { test, expect } from '@playwright/test';

test.describe('Route Planning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/routes');
  });

  test('should create a new route', async ({ page }) => {
    // Click create route button
    const createButton = page.getByRole('button', { name: /create|new route/i });
    await createButton.click();
    
    // Fill in route name
    const nameInput = page.getByLabel(/route name|name/i);
    await nameInput.fill('Test Route');
    
    // Save route
    const saveButton = page.getByRole('button', { name: /save|create/i });
    await saveButton.click();
    
    // Verify route appears in list
    await expect(page.getByText('Test Route')).toBeVisible();
  });

  test('should add waypoints to a route', async ({ page }) => {
    // Create a route first
    const createButton = page.getByRole('button', { name: /create|new route/i });
    await createButton.click();
    
    const nameInput = page.getByLabel(/route name|name/i);
    await nameInput.fill('Waypoint Test Route');
    
    const saveButton = page.getByRole('button', { name: /save|create/i });
    await saveButton.click();
    
    // Open route for editing
    await page.getByText('Waypoint Test Route').click();
    
    // Add waypoint
    const addWaypointButton = page.getByRole('button', { name: /add waypoint/i });
    await addWaypointButton.click();
    
    // Fill waypoint details
    await page.getByLabel(/latitude/i).fill('52.3676');
    await page.getByLabel(/longitude/i).fill('4.9041');
    await page.getByLabel(/waypoint name/i).fill('Amsterdam');
    
    // Save waypoint
    await page.getByRole('button', { name: /save waypoint/i }).click();
    
    // Verify waypoint appears
    await expect(page.getByText('Amsterdam')).toBeVisible();
  });

  test('should delete a route', async ({ page }) => {
    // Create a route
    const createButton = page.getByRole('button', { name: /create|new route/i });
    await createButton.click();
    
    const nameInput = page.getByLabel(/route name|name/i);
    await nameInput.fill('Route to Delete');
    
    const saveButton = page.getByRole('button', { name: /save|create/i });
    await saveButton.click();
    
    // Delete the route
    const routeItem = page.getByText('Route to Delete').locator('..');
    await routeItem.getByRole('button', { name: /delete/i }).click();
    
    // Confirm deletion
    await page.getByRole('button', { name: /confirm|yes/i }).click();
    
    // Verify route is gone
    await expect(page.getByText('Route to Delete')).not.toBeVisible();
  });

  test('should persist routes after page reload', async ({ page }) => {
    // Create a route
    const createButton = page.getByRole('button', { name: /create|new route/i });
    await createButton.click();
    
    const nameInput = page.getByLabel(/route name|name/i);
    await nameInput.fill('Persistent Route');
    
    const saveButton = page.getByRole('button', { name: /save|create/i });
    await saveButton.click();
    
    // Verify route exists
    await expect(page.getByText('Persistent Route')).toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Verify route still exists
    await expect(page.getByText('Persistent Route')).toBeVisible();
  });
});
