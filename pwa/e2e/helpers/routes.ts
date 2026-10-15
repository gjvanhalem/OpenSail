import type { Page } from '@playwright/test';

export interface WaypointInput {
  name: string;
  latitude: string;
  longitude: string;
}

export async function addWaypoint(page: Page, waypoint: WaypointInput) {
  await page.getByRole('button', { name: 'Add waypoint' }).click();
  await page.getByLabel('Waypoint name').fill(waypoint.name);
  await page.getByLabel('Latitude').fill(waypoint.latitude);
  await page.getByLabel('Longitude').fill(waypoint.longitude);
  await page.getByRole('button', { name: 'Save waypoint' }).click();
}

/** Create a route on the Routes page, entering each waypoint by hand */
export async function createRoute(page: Page, name: string, waypoints: WaypointInput[]) {
  await page.getByRole('button', { name: 'New Route' }).click();
  await page.getByLabel('Route Name').fill(name);
  for (const waypoint of waypoints) {
    await addWaypoint(page, waypoint);
  }
  await page.getByRole('button', { name: 'Save Route' }).click();
  await page.getByRole('heading', { name, exact: true }).waitFor();
}

export interface SeedRoute {
  id: string;
  name: string;
  waypoints: { latitude: number; longitude: number }[];
}

/**
 * Put routes straight into the app's IndexedDB, the way RouteRepository
 * stores them. Open a page of the app first, so the database exists; reload
 * afterwards so the app reads them.
 */
export async function seedRoutes(page: Page, routes: SeedRoute[]) {
  await page.evaluate(async (routes) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('NavigationDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('routes', 'readwrite');
      const store = tx.objectStore('routes');
      routes.forEach((route, r) => {
        const created = new Date(Date.UTC(2026, 9, 1) + r * 60_000);
        store.put({
          id: route.id,
          name: route.name,
          waypoints: route.waypoints.map((p, i) => ({
            id: `${route.id}-wp${i}`,
            name: `WP${i + 1}`,
            position: { ...p, accuracy: 0, timestamp: 0 },
            arrivalRadius: 0.1,
          })),
          totalDistance: route.waypoints.length - 1,
          estimatedDuration: (route.waypoints.length - 1) / 5,
          createdAt: created,
          updatedAt: created,
        });
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, routes);
}

/** `count` waypoints zig-zagging north from 52°N 4°E, about 1 nm apart */
export function zigZag(count: number): { latitude: number; longitude: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    latitude: 52 + i * 0.0118,
    longitude: 4 + (i % 2) * 0.0193,
  }));
}
