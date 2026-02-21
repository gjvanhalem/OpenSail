import { v4 as uuidv4 } from "uuid";
import { Route, Waypoint, Position } from "../types";
import { getDatabase } from "./index";

export class RouteRepository {
  async createRoute(name: string, waypoints: Waypoint[]): Promise<Route> {
    const db = await getDatabase();
    const id = uuidv4();
    const now = Date.now();

    const totalDistance = this.calculateTotalDistance(waypoints);
    const estimatedDuration = this.calculateDuration(totalDistance);

    await db.run(
      `INSERT INTO routes (id, name, total_distance, estimated_duration, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, totalDistance, estimatedDuration, now, now],
    );

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const wpId = wp.id || uuidv4();

      await db.run(
        `INSERT INTO waypoints (id, route_id, position_lat, position_lon, name, description, arrival_radius, sequence_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wpId,
          id,
          wp.position.latitude,
          wp.position.longitude,
          wp.name,
          wp.description || null,
          wp.arrivalRadius || 50,
          i,
        ],
      );
    }

    return {
      id,
      name,
      waypoints,
      totalDistance,
      estimatedDuration,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async updateRoute(
    routeId: string,
    waypoints: Waypoint[],
  ): Promise<Route | null> {
    const db = await getDatabase();
    const now = Date.now();

    const totalDistance = this.calculateTotalDistance(waypoints);
    const estimatedDuration = this.calculateDuration(totalDistance);

    await db.run(
      `UPDATE routes SET name = ?, total_distance = ?, estimated_duration = ?, updated_at = ? WHERE id = ?`,
      [
        waypoints[0]?.name || "Route",
        totalDistance,
        estimatedDuration,
        now,
        routeId,
      ],
    );

    await db.run(`DELETE FROM waypoints WHERE route_id = ?`, [routeId]);

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const wpId = wp.id || uuidv4();

      await db.run(
        `INSERT INTO waypoints (id, route_id, position_lat, position_lon, name, description, arrival_radius, sequence_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wpId,
          routeId,
          wp.position.latitude,
          wp.position.longitude,
          wp.name,
          wp.description || null,
          wp.arrivalRadius || 50,
          i,
        ],
      );
    }

    return this.getRoute(routeId);
  }

  async deleteRoute(routeId: string): Promise<void> {
    const db = await getDatabase();
    await db.run(`DELETE FROM waypoints WHERE route_id = ?`, [routeId]);
    await db.run(`DELETE FROM routes WHERE id = ?`, [routeId]);
  }

  async getRoute(routeId: string): Promise<Route | null> {
    const db = await getDatabase();

    const route = await db.get<{
      id: string;
      name: string;
      total_distance: number;
      estimated_duration: number;
      created_at: number;
      updated_at: number;
    }>(`SELECT * FROM routes WHERE id = ?`, [routeId]);

    if (!route) return null;

    const waypoints = await this.getWaypointsForRoute(routeId);

    return {
      id: route.id,
      name: route.name,
      waypoints,
      totalDistance: route.total_distance,
      estimatedDuration: route.estimated_duration,
      createdAt: new Date(route.created_at),
      updatedAt: new Date(route.updated_at),
    };
  }

  async getAllRoutes(): Promise<Route[]> {
    const db = await getDatabase();

    const routes = await db.all<{
      id: string;
      name: string;
      total_distance: number;
      estimated_duration: number;
      created_at: number;
      updated_at: number;
    }>(`SELECT * FROM routes ORDER BY updated_at DESC`);

    const result: Route[] = [];

    for (const route of routes) {
      const waypoints = await this.getWaypointsForRoute(route.id);
      result.push({
        id: route.id,
        name: route.name,
        waypoints,
        totalDistance: route.total_distance,
        estimatedDuration: route.estimated_duration,
        createdAt: new Date(route.created_at),
        updatedAt: new Date(route.updated_at),
      });
    }

    return result;
  }

  async getWaypointsForRoute(routeId: string): Promise<Waypoint[]> {
    const db = await getDatabase();

    const waypoints = await db.all<{
      id: string;
      position_lat: number;
      position_lon: number;
      name: string;
      description: string | null;
      arrival_radius: number;
      sequence_order: number;
    }>(`SELECT * FROM waypoints WHERE route_id = ? ORDER BY sequence_order`, [
      routeId,
    ]);

    return waypoints.map((wp) => ({
      id: wp.id,
      position: {
        latitude: wp.position_lat,
        longitude: wp.position_lon,
        accuracy: 0,
        timestamp: 0,
      },
      name: wp.name,
      description: wp.description || undefined,
      arrivalRadius: wp.arrival_radius,
    }));
  }

  private calculateTotalDistance(waypoints: Waypoint[]): number {
    let distance = 0;

    for (let i = 1; i < waypoints.length; i++) {
      distance += this.calculateDistance(
        waypoints[i - 1].position,
        waypoints[i].position,
      );
    }

    return distance;
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    const R = 3440.065;
    const dLat = this.toRad(pos2.latitude - pos1.latitude);
    const dLon = this.toRad(pos2.longitude - pos1.longitude);
    const lat1 = this.toRad(pos1.latitude);
    const lat2 = this.toRad(pos2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private calculateDuration(distanceNm: number): number {
    const avgSpeedKnots = 5;
    return Math.round((distanceNm / avgSpeedKnots) * 3600);
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
