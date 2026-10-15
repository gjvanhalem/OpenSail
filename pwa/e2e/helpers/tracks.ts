import type { Page } from '@playwright/test';

export interface SeedTrackPoint {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
}

/**
 * Put a recorded track straight into the app's IndexedDB, the way
 * TrackRepository stores it. Open a page of the app first, so the database
 * exists; reload afterwards so the app reads it.
 */
export async function seedTrack(
  page: Page,
  track: { id: string; name: string; points: SeedTrackPoint[]; avgSpeed?: number }
) {
  await page.evaluate(async ({ id, name, points, avgSpeed }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('NavigationDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('tracks', 'readwrite');
      tx.objectStore('tracks').put({
        id,
        name,
        points: { compressed: true, data: JSON.stringify(points) },
        startTime: new Date(points[0].timestamp),
        endTime: new Date(points[points.length - 1].timestamp),
        distance: 0,
        maxSpeed: avgSpeed ?? 5,
        avgSpeed: avgSpeed ?? 5,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, { ...track, avgSpeed: track.avgSpeed ?? 5 });
}

/** North 1.2 nm then east 1.48 nm, a point every ~20 m with a few metres of wobble */
export function lShapedTrack(): SeedTrackPoint[] {
  const start = Date.UTC(2026, 9, 15, 8, 0, 0);
  const points: SeedTrackPoint[] = [];
  const wobble = (i: number) => Math.sin(i * 1.7) * 0.00007;
  const add = (latitude: number, longitude: number, heading: number) =>
    points.push({
      latitude,
      longitude,
      speed: 5,
      heading,
      timestamp: new Date(start + points.length * 10_000).toISOString(),
    });
  for (let i = 0; i <= 100; i++) add(52 + i * 0.0002, 4 + wobble(i), 0);
  for (let i = 1; i <= 100; i++) add(52.02 + wobble(i), 4 + i * 0.0004, 90);
  return points;
}
