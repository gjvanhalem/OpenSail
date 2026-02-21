import { db, type AISTarget } from '../db';

// AIS Repository doesn't extend BaseRepository because it uses MMSI as key
// and has different semantics (upsert instead of create)
export class AISRepository {
  private readonly TTL_HOURS = 24; // Time-to-live for AIS targets

  // Get all AIS targets
  async getAll(): Promise<AISTarget[]> {
    return await db.aisTargets.toArray();
  }

  // Get target by ID (MMSI)
  async getById(mmsi: string): Promise<AISTarget | undefined> {
    return await db.aisTargets.get(mmsi);
  }

  // Delete target by ID (MMSI)
  async delete(mmsi: string): Promise<void> {
    await db.aisTargets.delete(mmsi);
  }

  // Get count of all targets
  async count(): Promise<number> {
    return await db.aisTargets.count();
  }

  // Create or update AIS target (MMSI is the key)
  async upsert(target: AISTarget): Promise<AISTarget> {
    const existing = await this.getById(target.mmsi);
    
    if (existing) {
      // Update existing target
      await db.aisTargets.update(target.mmsi, {
        ...target,
        lastUpdate: new Date()
      });
      return { ...target, lastUpdate: new Date() };
    } else {
      // Create new target
      await db.aisTargets.add({
        ...target,
        lastUpdate: new Date()
      });
      return { ...target, lastUpdate: new Date() };
    }
  }

  // Get all active targets (updated within TTL)
  async getActiveTargets(): Promise<AISTarget[]> {
    const cutoffTime = new Date(Date.now() - this.TTL_HOURS * 60 * 60 * 1000);
    return await db.aisTargets
      .where('lastUpdate')
      .above(cutoffTime)
      .toArray();
  }

  // Get targets within geographic bounds
  async getInBounds(
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number
  ): Promise<AISTarget[]> {
    const activeTargets = await this.getActiveTargets();
    return activeTargets.filter(target =>
      target.latitude >= minLat &&
      target.latitude <= maxLat &&
      target.longitude >= minLon &&
      target.longitude <= maxLon
    );
  }

  // Get targets with CPA warnings
  async getTargetsWithCPA(maxDistance: number): Promise<AISTarget[]> {
    const activeTargets = await this.getActiveTargets();
    return activeTargets.filter(
      target => target.cpaDistance !== undefined && target.cpaDistance <= maxDistance
    );
  }

  // Clean up expired targets (older than TTL)
  async cleanupExpired(): Promise<number> {
    const cutoffTime = new Date(Date.now() - this.TTL_HOURS * 60 * 60 * 1000);
    const expiredTargets = await db.aisTargets
      .where('lastUpdate')
      .below(cutoffTime)
      .toArray();
    
    await db.aisTargets
      .where('lastUpdate')
      .below(cutoffTime)
      .delete();
    
    return expiredTargets.length;
  }

  // Get target by MMSI
  async getByMMSI(mmsi: string): Promise<AISTarget | undefined> {
    return await this.getById(mmsi);
  }

  // Search targets by name or call sign
  async search(query: string): Promise<AISTarget[]> {
    const lowerQuery = query.toLowerCase();
    const activeTargets = await this.getActiveTargets();
    return activeTargets.filter(
      target =>
        target.name.toLowerCase().includes(lowerQuery) ||
        target.callSign.toLowerCase().includes(lowerQuery)
    );
  }

  // Get targets by vessel type
  async getByVesselType(vesselType: number): Promise<AISTarget[]> {
    const activeTargets = await this.getActiveTargets();
    return activeTargets.filter(target => target.vesselType === vesselType);
  }

  // Update CPA information for a target
  async updateCPA(mmsi: string, cpaDistance: number, cpaTime: number): Promise<void> {
    await db.aisTargets.update(mmsi, {
      cpaDistance,
      cpaTime
    });
  }

  // Clear all AIS targets
  async clearAll(): Promise<void> {
    await db.aisTargets.clear();
  }

  // Get count of active targets
  async getActiveCount(): Promise<number> {
    const cutoffTime = new Date(Date.now() - this.TTL_HOURS * 60 * 60 * 1000);
    return await db.aisTargets
      .where('lastUpdate')
      .above(cutoffTime)
      .count();
  }
}

export const aisRepository = new AISRepository();
