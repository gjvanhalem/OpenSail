import { db, type Waypoint } from '../db';
import { BaseRepository } from './Repository';

export class WaypointRepository extends BaseRepository<Waypoint> {
  protected getTable() {
    return db.waypoints;
  }

  protected generateId(): string {
    return `waypoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get all waypoints for a specific route
  async getByRouteId(routeId: string): Promise<Waypoint[]> {
    return await db.waypoints
      .where('routeId')
      .equals(routeId)
      .toArray();
  }

  // Search waypoints by name
  async searchByName(query: string): Promise<Waypoint[]> {
    const lowerQuery = query.toLowerCase();
    return await db.waypoints
      .filter(waypoint => waypoint.name.toLowerCase().includes(lowerQuery))
      .toArray();
  }

  // Delete all waypoints for a route
  async deleteByRouteId(routeId: string): Promise<void> {
    await db.waypoints
      .where('routeId')
      .equals(routeId)
      .delete();
  }

  // Get waypoints within a geographic area
  async getInBounds(
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number
  ): Promise<Waypoint[]> {
    return await db.waypoints
      .filter(waypoint =>
        waypoint.position.latitude >= minLat &&
        waypoint.position.latitude <= maxLat &&
        waypoint.position.longitude >= minLon &&
        waypoint.position.longitude <= maxLon
      )
      .toArray();
  }

  // Bulk create waypoints for a route
  async bulkCreate(waypoints: Omit<Waypoint, 'id'>[]): Promise<Waypoint[]> {
    const waypointsWithIds = waypoints.map(wp => ({
      ...wp,
      id: this.generateId()
    }));
    await db.waypoints.bulkAdd(waypointsWithIds);
    return waypointsWithIds;
  }
}

export const waypointRepository = new WaypointRepository();
