import { v4 as uuidv4 } from 'uuid';
import {
  LogbookService,
  LogbookEntry,
  LogbookFilter,
  Voyage,
  Position
} from '../types';
import { LogbookRepository } from '../database/LogbookRepository';

export class LogbookServiceImpl implements LogbookService {
  private logbookRepo = new LogbookRepository();
  private currentVoyageId: string | null = null;
  private voyageStartPosition: Position | null = null;
  private voyageStartTime: Date | null = null;
  private currentPosition: Position | null = null;
  private maxSpeed = 0;
  private totalDistance = 0;
  private speedReadings: number[] = [];
  
  // Automatic voyage detection settings
  private readonly MOVEMENT_THRESHOLD_SPEED = 1.0; // knots - speed above which we consider vessel moving
  private readonly STATIONARY_TIMEOUT = 300000; // 5 minutes in milliseconds
  private readonly AUTO_DETECTION_ENABLED = true;
  private lastMovementTime: number | null = null;
  private isMoving = false;

  async startVoyage(): Promise<string> {
    if (this.currentVoyageId) {
      // Auto-end previous voyage
      await this.endVoyage();
    }

    this.voyageStartTime = new Date();
    this.voyageStartPosition = this.currentPosition || {
      latitude: 0,
      longitude: 0,
      accuracy: 0,
      timestamp: Date.now()
    };
    this.maxSpeed = 0;
    this.totalDistance = 0;
    this.speedReadings = [];

    // Create voyage in database
    const voyage = await this.logbookRepo.startVoyage(this.voyageStartPosition);
    this.currentVoyageId = voyage.id;

    console.log(`Started voyage: ${this.currentVoyageId}`);
    return this.currentVoyageId;
  }

  async endVoyage(): Promise<void> {
    if (!this.currentVoyageId) {
      throw new Error('No voyage in progress');
    }

    const endPosition = this.currentPosition || {
      latitude: 0,
      longitude: 0,
      accuracy: 0,
      timestamp: Date.now()
    };

    // Calculate final voyage statistics
    const stats = this.calculateVoyageStatistics();

    // End voyage in repository with statistics
    await this.logbookRepo.endVoyage(
      this.currentVoyageId, 
      endPosition,
      stats.distance,
      stats.avgSpeed,
      this.maxSpeed
    );

    console.log(`Ended voyage: ${this.currentVoyageId} (${stats.distance.toFixed(2)} nm, ${stats.avgSpeed.toFixed(1)} kn avg, ${(stats.duration / 3600).toFixed(1)} hours)`);
    this.currentVoyageId = null;
    this.voyageStartPosition = null;
    this.voyageStartTime = null;
    this.maxSpeed = 0;
    this.totalDistance = 0;
    this.speedReadings = [];
    this.lastMovementTime = null;
    this.isMoving = false;
  }

  async addEntry(entry: Omit<LogbookEntry, 'id' | 'voyageId' | 'timestamp'>): Promise<void> {
    if (!this.currentVoyageId) {
      throw new Error('No voyage in progress');
    }

    const logEntry: LogbookEntry = {
      id: uuidv4(),
      voyageId: this.currentVoyageId,
      timestamp: new Date(),
      ...entry
    };

    await this.logbookRepo.addEntry(logEntry);
  }

  async getEntries(filter?: LogbookFilter): Promise<LogbookEntry[]> {
    return this.logbookRepo.getEntries(filter);
  }

  async exportLogbook(format: 'csv' | 'pdf'): Promise<string> {
    const entries = await this.logbookRepo.getEntries();

    if (format === 'csv') {
      return this.exportToCSV(entries);
    } else {
      // PDF export would require a PDF library
      throw new Error('PDF export not yet implemented');
    }
  }

  // Public methods for updating voyage data
  setCurrentPosition(position: Position): void {
    const prevPosition = this.currentPosition;
    this.currentPosition = position;

    // Update voyage statistics if in progress
    if (this.currentVoyageId && prevPosition) {
      const distance = this.calculateDistance(prevPosition, position);
      this.totalDistance += distance;
    }
  }

  updateSpeed(speed: number): void {
    if (this.currentVoyageId) {
      this.speedReadings.push(speed);
      if (speed > this.maxSpeed) {
        this.maxSpeed = speed;
      }
    }

    // Automatic voyage detection
    if (this.AUTO_DETECTION_ENABLED) {
      this.detectVoyageState(speed);
    }
  }

  /**
   * Automatically detect voyage start/end based on vessel movement
   * Starts voyage when speed exceeds threshold
   * Ends voyage when vessel is stationary for STATIONARY_TIMEOUT
   */
  private detectVoyageState(speed: number): void {
    const now = Date.now();
    const wasMoving = this.isMoving;
    this.isMoving = speed >= this.MOVEMENT_THRESHOLD_SPEED;

    if (this.isMoving) {
      this.lastMovementTime = now;

      // Auto-start voyage if not already started
      if (!this.currentVoyageId && !wasMoving) {
        console.log(`Auto-starting voyage (speed: ${speed.toFixed(1)} kn)`);
        this.startVoyage().catch(err => 
          console.error('Failed to auto-start voyage:', err)
        );
      }
    } else if (this.currentVoyageId && this.lastMovementTime) {
      // Check if vessel has been stationary long enough to end voyage
      const stationaryDuration = now - this.lastMovementTime;
      if (stationaryDuration >= this.STATIONARY_TIMEOUT) {
        console.log(`Auto-ending voyage (stationary for ${(stationaryDuration / 60000).toFixed(1)} minutes)`);
        this.endVoyage().catch(err => 
          console.error('Failed to auto-end voyage:', err)
        );
      }
    }
  }

  /**
   * Calculate voyage statistics including distance, average speed, and duration
   */
  private calculateVoyageStatistics(): { distance: number; avgSpeed: number; duration: number } {
    const distance = this.totalDistance;
    const avgSpeed = this.speedReadings.length > 0
      ? this.speedReadings.reduce((sum, s) => sum + s, 0) / this.speedReadings.length
      : 0;
    const duration = this.voyageStartTime
      ? (Date.now() - this.voyageStartTime.getTime()) / 1000 // duration in seconds
      : 0;

    return { distance, avgSpeed, duration };
  }

  async addWaypointEntry(waypointName: string): Promise<void> {
    await this.addEntry({
      type: 'waypoint',
      position: this.currentPosition,
      notes: `Passed waypoint: ${waypointName}`
    });
  }

  async addNoteEntry(note: string): Promise<void> {
    await this.addEntry({
      type: 'note',
      position: this.currentPosition,
      notes: note
    });
  }

  async addEventEntry(event: string): Promise<void> {
    await this.addEntry({
      type: 'event',
      position: this.currentPosition,
      notes: event
    });
  }

  /**
   * Get current voyage information including real-time statistics
   */
  async getCurrentVoyage(): Promise<Voyage | null> {
    if (!this.currentVoyageId) {
      return null;
    }

    const voyage = await this.logbookRepo.getVoyage(this.currentVoyageId);
    if (!voyage) return null;

    // Add real-time statistics
    const stats = this.calculateVoyageStatistics();
    return {
      ...voyage,
      distance: stats.distance,
      avgSpeed: stats.avgSpeed,
      maxSpeed: this.maxSpeed
    };
  }

  /**
   * Get all voyages with optional filtering
   */
  async getVoyages(filter?: { startDate?: Date; endDate?: Date }): Promise<Voyage[]> {
    return this.logbookRepo.getVoyages(filter);
  }

  /**
   * Check if a voyage is currently in progress
   */
  isVoyageInProgress(): boolean {
    return this.currentVoyageId !== null;
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    const R = 3440.065; // Earth radius in nautical miles
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

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private exportToCSV(entries: LogbookEntry[]): string {
    const headers = [
      'Timestamp',
      'Type',
      'Latitude',
      'Longitude',
      'Distance (nm)',
      'Avg Speed (kn)',
      'Max Speed (kn)',
      'Notes'
    ];

    let csv = headers.join(',') + '\n';

    for (const entry of entries) {
      const row = [
        entry.timestamp.toISOString(),
        entry.type,
        entry.position?.latitude.toFixed(6) || '',
        entry.position?.longitude.toFixed(6) || '',
        entry.distance?.toFixed(2) || '',
        entry.avgSpeed?.toFixed(1) || '',
        entry.maxSpeed?.toFixed(1) || '',
        `"${(entry.notes || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\n';
    }

    return csv;
  }
}

export const createLogbookService = (): LogbookService => {
  return new LogbookServiceImpl();
};
