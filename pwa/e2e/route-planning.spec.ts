import { test, expect, type Page } from '@playwright/test';

interface WaypointInput {
  name: string;
  latitude: string;
  longitude: string;
}

const DEFAULT_WAYPOINTS: WaypointInput[] = [
  { name: 'Amsterdam', latitude: '52.3676', longitude: '4.9041' },
  { name: 'IJmuiden', latitude: '52.4621', longitude: '4.6050' },
];

async function addWaypoint(page: Page, waypoint: WaypointInput) {
  await page.getByRole('button', { name: 'Add waypoint' }).click();
  await page.getByLabel('Waypoint name').fill(waypoint.name);
  await page.getByLabel('Latitude').fill(waypoint.latitude);
  await page.getByLabel('Longitude').fill(waypoint.longitude);
  await page.getByRole('button', { name: 'Save waypoint' }).click();
}

// A route needs a name and at least two waypoints before it can be saved
async function createRoute(page: Page, name: string, waypoints = DEFAULT_WAYPOINTS) {
  await page.getByRole('button', { name: 'New Route' }).click();
  await page.getByLabel('Route Name').fill(name);
  for (const waypoint of waypoints) {
    await addWaypoint(page, waypoint);
  }
  await page.getByRole('button', { name: 'Save Route' }).click();
}

test.describe('Route Planning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/routes');
  });

  test('should create a new route', async ({ page }) => {
    await createRoute(page, 'Test Route');

    // Planner closes and the route appears in the list
    await expect(page.getByRole('heading', { name: 'New Route' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Test Route' })).toBeVisible();
  });

  test('should not save a route without waypoints', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await page.getByLabel('Route Name').fill('Empty Route');

    await expect(page.getByRole('button', { name: 'Save Route' })).toBeDisabled();
  });

  test('should add waypoints to a route', async ({ page }) => {
    await createRoute(page, 'Waypoint Test Route');

    const routeCard = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: 'Waypoint Test Route' }) })
      .filter({ has: page.getByRole('button', { name: 'Edit' }) })
      .last();
    await expect(routeCard.getByText('2 waypoints')).toBeVisible();

    // Open route for editing; its waypoints are listed in the planner
    await routeCard.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Route' })).toBeVisible();
    // Scope to the planner: waypoint names are also shown as map marker labels
    const planner = page.getByRole('region', { name: 'Route planner' });
    await expect(planner.getByText('Amsterdam')).toBeVisible();
    await expect(planner.getByText('IJmuiden')).toBeVisible();

    // Add a third waypoint and save
    await addWaypoint(page, { name: 'Den Helder', latitude: '52.9563', longitude: '4.7608' });
    await expect(page.getByText('Waypoints (3)')).toBeVisible();
    await page.getByRole('button', { name: 'Save Route' }).click();

    await expect(routeCard.getByText('3 waypoints')).toBeVisible();
  });

  test('should add a waypoint by clicking the map', async ({ page }) => {
    await page.getByRole('button', { name: 'New Route' }).click();
    await expect(page.getByText('Waypoints (0)')).toBeVisible();

    // Clicks do not depend on map tiles loading (CI runs with a placeholder token)
    const map = page.getByRole('region', { name: 'Map' });
    await expect(map).toBeVisible();
    await map.click({ position: { x: 100, y: 200 } });
    await map.click({ position: { x: 150, y: 250 } });

    const planner = page.getByRole('region', { name: 'Route planner' });
    await expect(planner.getByText('Waypoints (2)')).toBeVisible();
    await expect(planner.getByText('Waypoint 1')).toBeVisible();
    await expect(planner.getByText('Waypoint 2')).toBeVisible();
  });

  test('should delete a route', async ({ page }) => {
    await createRoute(page, 'Route to Delete');
    await expect(page.getByRole('heading', { name: 'Route to Delete' })).toBeVisible();

    // Deletion is confirmed with a native confirm() dialog
    page.once('dialog', (dialog) => dialog.accept());
    const routeCard = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: 'Route to Delete' }) })
      .filter({ has: page.getByRole('button', { name: 'Delete' }) })
      .last();
    await routeCard.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('heading', { name: 'Route to Delete' })).toBeHidden();
    await expect(page.getByText('No routes yet')).toBeVisible();
  });

  test('should persist routes after page reload', async ({ page }) => {
    await createRoute(page, 'Persistent Route');
    await expect(page.getByRole('heading', { name: 'Persistent Route' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Persistent Route' })).toBeVisible();
  });
});
