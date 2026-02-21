import { db, type Route } from '../db';
import { BaseRepository } from './Repository';

export class RouteRepository extends BaseRepository<Route> {
  protected getTable() {
    return db.routes;
  }

  protected generateId(): string {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get routes sorted by creation date
  async getAllSorted(order: 'asc' | 'desc' = 'desc'): Promise<Route[]> {
    const routes = await db.routes.orderBy('createdAt').toArray();
    return order === 'desc' ? routes.reverse() : routes;
  }

  // Search routes by name
  async searchByName(query: string): Promise<Route[]> {
    const lowerQuery = query.toLowerCase();
    return await db.routes
      .filter(route => route.name.toLowerCase().includes(lowerQuery))
      .toArray();
  }

  // Get routes within a date range
  async getByDateRange(startDate: Date, endDate: Date): Promise<Route[]> {
    return await db.routes
      .where('createdAt')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  // Update route with automatic updatedAt timestamp
  async update(id: string, item: Partial<Route>): Promise<Route> {
    const updateData = {
      ...item,
      updatedAt: new Date()
    };
    return await super.update(id, updateData);
  }

  // Create route with automatic timestamps
  async create(item: Omit<Route, 'id'>): Promise<Route> {
    const now = new Date();
    const routeData = {
      ...item,
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now
    };
    return await super.create(routeData);
  }
}

export const routeRepository = new RouteRepository();
