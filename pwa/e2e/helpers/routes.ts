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
