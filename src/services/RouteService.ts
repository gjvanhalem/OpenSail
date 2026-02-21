import { v4 as uuidv4 } from 'uuid';
import { Store } from '@reduxjs/toolkit';
import { RouteService, Route, Waypoint, Position, RouteValidation, RouteWarning } from '../types';
import { RouteRepository } from '../database/RouteRepository';
import {
  addRoute,
  updateRoute as updateRouteAction,
  removeRoute,
  setActiveRoute as setActiveRouteAction,
  setRouteValidation,
  setLoading,
  setError,
} from '../store/slices/routeSlice';

export class RouteServiceImpl implements RouteService {
  private routeRepo = new RouteRepository();
  private activeRouteId: string | null = null;
  private store: Store | null = null;

  setStore(store: Store): void {
    this.store = store;
  }

  async createRoute(waypoints: Waypoint[]): Promise<Route> {
    if (waypoints.length < 2) {
      throw new Error('A route must have at least 2 waypoints');
    }

    if (this.store) {
      this.store.dispatch(setLoading(true));
    }

    try {
      const name = waypoints[0]?.name || 'New Route';
      const route = await this.routeRepo.createRoute(name, waypoints);

      if (this.store) {
        this.store.dispatch(addRoute(route));
        this.store.dispatch(setLoading(false));
      }

      return route;
    } catch (error) {
      if (this.store) {
        this.store.dispatch(setError(error instanceof Error ? error.message : 'Failed to create route'));
        this.store.dispatch(setLoading(false));
      }
      throw error;
    }
  }

  async updateRoute(routeId: string, waypoints: Waypoint[]): Promise<Route> {
    if (this.store) {
      this.store.dispatch(setLoading(true));
    }

    try {
      const route = await this.routeRepo.updateRoute(routeId, waypoints);
      if (!route) {
        throw new Error('Route not found');
      }

      if (this.store) {
        this.store.dispatch(updateRouteAction(route));
        this.store.dispatch(setLoading(false));
      }

      return route;
    } catch (error) {
      if (this.store) {
        this.store.dispatch(setError(error instanceof Error ? error.message : 'Failed to update route'));
        this.store.dispatch(setLoading(false));
      }
      throw error;
    }
  }

  async deleteRoute(routeId: string): Promise<void> {
    if (this.activeRouteId === routeId) {
      this.activeRouteId = null;
    }

    await this.routeRepo.deleteRoute(routeId);

    if (this.store) {
      this.store.dispatch(removeRoute(routeId));
    }
  }

  async calculateRoute(start: Position, end: Position): Promise<Route> {
    const waypoints: Waypoint[] = [
      {
        id: uuidv4(),
        position: start,
        name: 'Start',
        arrivalRadius: 50
      },
      {
        id: uuidv4(),
        position: end,
        name: 'Destination',
        arrivalRadius: 50
      }
    ];

    return this.createRoute(waypoints);
  }

  async validateRoute(route: Route): Promise<RouteValidation> {
    const warnings: RouteWarning[] = [];

    // Validate each leg of the route
    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const current = route.waypoints[i];
      const next = route.waypoints[i + 1];

      // Check for shallow water along the route leg
      const shallowWaterWarnings = await this.checkShallowWater(current, next);
      warnings.push(...shallowWaterWarnings);

      // Check for hazards along the route leg
      const hazardWarnings = await this.checkHazards(current, next);
      warnings.push(...hazardWarnings);

      // Check for restricted areas along the route leg
      const restrictedAreaWarnings = await this.checkRestrictedAreas(current, next);
      warnings.push(...restrictedAreaWarnings);

      // Check for excessively long legs
      const distance = this.calculateDistance(current.position, next.position);
      if (distance > 50) {
        warnings.push({
          type: 'hazard',
          position: current.position,
          message: `Long leg (${distance.toFixed(1)} nm) - consider adding intermediate waypoints for safety`,
          severity: 'low'
        });
      }
    }

    // Remove duplicate warnings at the same position
    const uniqueWarnings = this.deduplicateWarnings(warnings);

    const validation: RouteValidation = {
      isValid: uniqueWarnings.filter(w => w.severity === 'high').length === 0,
      warnings: uniqueWarnings
    };

    // Dispatch validation to Redux
    if (this.store) {
      this.store.dispatch(setRouteValidation({ routeId: route.id, validation }));
    }

    return validation;
  }

  /**
   * Check for shallow water along a route leg
   * This method samples points along the route and checks depth data
   */
  private async checkShallowWater(start: Waypoint, end: Waypoint): Promise<RouteWarning[]> {
    const warnings: RouteWarning[] = [];
    const minSafeDepth = 3.0; // meters - configurable minimum safe depth
    const cautionDepth = 5.0; // meters - depth that triggers caution warning

    // Sample points along the route leg (every 0.5 nm)
    const distance = this.calculateDistance(start.position, end.position);
    const numSamples = Math.max(2, Math.ceil(distance / 0.5));

    for (let i = 0; i <= numSamples; i++) {
      const fraction = i / numSamples;
      const samplePos = this.interpolatePosition(start.position, end.position, fraction);

      // Query depth data from chart (when chart data is available)
      const depth = await this.getDepthAtPosition(samplePos);

      if (depth !== null) {
        if (depth < minSafeDepth) {
          warnings.push({
            type: 'shallow_water',
            position: samplePos,
            message: `Critical: Shallow water detected (${depth.toFixed(1)}m depth). Minimum safe depth is ${minSafeDepth}m`,
            severity: 'high'
          });
        } else if (depth < cautionDepth) {
          warnings.push({
            type: 'shallow_water',
            position: samplePos,
            message: `Caution: Limited depth (${depth.toFixed(1)}m). Proceed with care`,
            severity: 'medium'
          });
        }
      }
    }

    return warnings;
  }

  /**
   * Check for navigation hazards along a route leg
   * Includes rocks, wrecks, obstructions, and other dangers
   */
  private async checkHazards(start: Waypoint, end: Waypoint): Promise<RouteWarning[]> {
    const warnings: RouteWarning[] = [];
    const hazardProximity = 0.1; // nautical miles - how close to check for hazards

    // Get hazards from chart data along the route corridor
    const hazards = await this.getHazardsAlongRoute(start.position, end.position, hazardProximity);

    for (const hazard of hazards) {
      const severity = this.determineHazardSeverity(hazard);
      warnings.push({
        type: 'hazard',
        position: hazard.position,
        message: `${hazard.type}: ${hazard.description}`,
        severity
      });
    }

    return warnings;
  }

  /**
   * Check for restricted or prohibited areas along a route leg
   * Includes military zones, nature reserves, shipping lanes, etc.
   */
  private async checkRestrictedAreas(start: Waypoint, end: Waypoint): Promise<RouteWarning[]> {
    const warnings: RouteWarning[] = [];

    // Get restricted areas from chart data
    const restrictedAreas = await this.getRestrictedAreasAlongRoute(
      start.position,
      end.position
    );

    for (const area of restrictedAreas) {
      const severity = area.prohibited ? 'high' : 'medium';
      warnings.push({
        type: 'restricted_area',
        position: area.position,
        message: `${area.prohibited ? 'Prohibited' : 'Restricted'} area: ${area.name}. ${area.description}`,
        severity
      });
    }

    return warnings;
  }

  /**
   * Get depth at a specific position from chart data
   * Returns null if no depth data is available
   */
  private async getDepthAtPosition(position: Position): Promise<number | null> {
    // TODO: Integrate with ChartManager to query actual depth data
    // For now, return null to indicate no chart data available
    // When chart data is available, this should:
    // 1. Query the chart tile for the position
    // 2. Extract depth contour or sounding data
    // 3. Interpolate if necessary
    return null;
  }

  /**
   * Get navigation hazards along a route corridor
   */
  private async getHazardsAlongRoute(
    start: Position,
    end: Position,
    corridorWidth: number
  ): Promise<Array<{ type: string; position: Position; description: string; severity: string }>> {
    // TODO: Integrate with ChartManager to query actual hazard data
    // For now, return empty array
    // When chart data is available, this should:
    // 1. Define a corridor polygon around the route leg
    // 2. Query chart features (rocks, wrecks, obstructions)
    // 3. Return hazards within the corridor
    return [];
  }

  /**
   * Get restricted areas along a route
   */
  private async getRestrictedAreasAlongRoute(
    start: Position,
    end: Position
  ): Promise<Array<{ name: string; position: Position; description: string; prohibited: boolean }>> {
    // TODO: Integrate with ChartManager to query actual restricted area data
    // For now, return empty array
    // When chart data is available, this should:
    // 1. Query chart features for restricted areas
    // 2. Check if route intersects with any areas
    // 3. Return details of affected areas
    return [];
  }

  /**
   * Interpolate a position between two points
   */
  private interpolatePosition(start: Position, end: Position, fraction: number): Position {
    const lat = start.latitude + (end.latitude - start.latitude) * fraction;
    const lon = start.longitude + (end.longitude - start.longitude) * fraction;

    return {
      latitude: lat,
      longitude: lon,
      accuracy: Math.max(start.accuracy, end.accuracy),
      timestamp: Date.now()
    };
  }

  /**
   * Determine hazard severity based on hazard type
   */
  private determineHazardSeverity(hazard: {
    type: string;
    severity: string;
  }): 'low' | 'medium' | 'high' {
    // Map hazard severity from chart data to our severity levels
    if (hazard.severity === 'critical' || hazard.type === 'rock' || hazard.type === 'wreck') {
      return 'high';
    } else if (hazard.severity === 'moderate' || hazard.type === 'obstruction') {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Remove duplicate warnings at the same position
   */
  private deduplicateWarnings(warnings: RouteWarning[]): RouteWarning[] {
    const seen = new Map<string, RouteWarning>();

    for (const warning of warnings) {
      const key = `${warning.type}-${warning.position.latitude.toFixed(4)}-${warning.position.longitude.toFixed(4)}`;

      const existing = seen.get(key);
      if (!existing || this.compareSeverity(warning.severity, existing.severity) > 0) {
        seen.set(key, warning);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Compare severity levels (higher number = more severe)
   */
  private compareSeverity(a: 'low' | 'medium' | 'high', b: 'low' | 'medium' | 'high'): number {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[a] - levels[b];
  }

  async getActiveRoute(): Promise<Route | null> {
    if (!this.activeRouteId) return null;
    return this.routeRepo.getRoute(this.activeRouteId);
  }

  async setActiveRoute(routeId: string): Promise<void> {
    const route = await this.routeRepo.getRoute(routeId);
    if (!route) {
      throw new Error('Route not found');
    }
    this.activeRouteId = routeId;

    if (this.store) {
      this.store.dispatch(setActiveRouteAction(routeId));
    }
  }

  async clearActiveRoute(): Promise<void> {
    this.activeRouteId = null;

    if (this.store) {
      this.store.dispatch(setActiveRouteAction(null));
    }
  }

  async exportRoute(routeId: string, format: 'gpx' | 'kml'): Promise<string> {
    const route = await this.routeRepo.getRoute(routeId);
    if (!route) {
      throw new Error('Route not found');
    }

    if (format === 'gpx') {
      return this.exportToGPX(route);
    } else {
      return this.exportToKML(route);
    }
  }

  async getAllRoutes(): Promise<Route[]> {
    return this.routeRepo.getAllRoutes();
  }

  async getRoute(routeId: string): Promise<Route | null> {
    return this.routeRepo.getRoute(routeId);
  }

  async calculateDistanceBetween(start: Position, end: Position): Promise<number> {
    return this.calculateDistance(start, end);
  }

  async calculateBearing(start: Position, end: Position): Promise<number> {
    return this.calculateBearingInternal(start, end);
  }

  /**
   * Get visual warning markers for display on chart
   * Returns warnings grouped by severity for rendering
   */
  async getRouteWarningMarkers(routeId: string): Promise<{
    high: RouteWarning[];
    medium: RouteWarning[];
    low: RouteWarning[];
  }> {
    const route = await this.routeRepo.getRoute(routeId);
    if (!route) {
      throw new Error('Route not found');
    }

    const validation = await this.validateRoute(route);

    return {
      high: validation.warnings.filter(w => w.severity === 'high'),
      medium: validation.warnings.filter(w => w.severity === 'medium'),
      low: validation.warnings.filter(w => w.severity === 'low')
    };
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

  private calculateBearingInternal(start: Position, end: Position): number {
    const lat1 = this.toRad(start.latitude);
    const lat2 = this.toRad(end.latitude);
    const dLon = this.toRad(end.longitude - start.longitude);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearing = Math.atan2(y, x);

    return ((bearing * 180) / Math.PI + 360) % 360;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private exportToGPX(route: Route): string {
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="OpenSail">
  <rte>
    <name>${this.escapeXml(route.name)}</name>
`;

    for (const wp of route.waypoints) {
      gpx += `    <rtept lat="${wp.position.latitude}" lon="${wp.position.longitude}">
      <name>${this.escapeXml(wp.name)}</name>
      <desc>${this.escapeXml(wp.description || '')}</desc>
    </rtept>
`;
    }

    gpx += `  </rte>
</gpx>`;

    return gpx;
  }

  private exportToKML(route: Route): string {
    let coords = '';
    for (const wp of route.waypoints) {
      coords += `${wp.position.longitude},${wp.position.latitude},0 `;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${this.escapeXml(route.name)}</name>
    <Placemark>
      <name>${this.escapeXml(route.name)}</name>
      <LineString>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const createRouteService = (): RouteService => {
  return new RouteServiceImpl();
};
