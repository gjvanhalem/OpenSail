import { trackRepository } from '@/database/repositories/TrackRepository';
import type { Track, TrackPoint } from '@/database/db';
import type { Position } from '@/models';
import { calculateDistance } from '@/utils/calculations';

export interface TrackRecorderConfig {
  minDistanceThreshold: number; // Minimum distance in nautical miles to record a point
  minTimeThreshold: number; // Minimum time in seconds between points
  autoSave: boolean; // Auto-save to IndexedDB periodically
  autoSaveInterval: number; // Auto-save interval in seconds
}

const DEFAULT_CONFIG: TrackRecorderConfig = {
  minDistanceThreshold: 0.01, // ~18 meters
  minTimeThreshold: 5, // 5 seconds
  autoSave: true,
  autoSaveInterval: 30, // 30 seconds
};

export class TrackRecorder {
  private currentTrack: Track | null = null;
  private isRecording = false;
  private isPaused = false;
  private config: TrackRecorderConfig;
  private autoSaveTimer: number | null = null;
  private lastPoint: TrackPoint | null = null;
  private uncompressedPoints: TrackPoint[] = [];

  constructor(config: Partial<TrackRecorderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start recording a new track
   */
  async start(name: string): Promise<string> {
    if (this.isRecording) {
      throw new Error('Track recording already in progress');
    }

    const trackId = this.generateTrackId();
    const now = new Date();

    this.currentTrack = {
      id: trackId,
      name,
      points: { compressed: true, data: '[]' },
      startTime: now,
      endTime: now,
      distance: 0,
      maxSpeed: 0,
      avgSpeed: 0,
    };

    this.uncompressedPoints = [];
    this.lastPoint = null;
    this.isRecording = true;
    this.isPaused = false;

    // Start auto-save timer if enabled
    if (this.config.autoSave) {
      this.startAutoSave();
    }

    return trackId;
  }

  /**
   * Stop recording and save the track
   */
  async stop(): Promise<Track | null> {
    if (!this.isRecording || !this.currentTrack) {
      return null;
    }

    this.isRecording = false;
    this.isPaused = false;

    // Stop auto-save timer
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    // Update end time
    this.currentTrack.endTime = new Date();

    // Compress and save final track
    this.currentTrack.points = this.compressPoints(this.uncompressedPoints);

    // Save to database
    const savedTrack = await trackRepository.create(this.currentTrack);

    // Clear current track
    this.currentTrack = null;
    this.uncompressedPoints = [];
    this.lastPoint = null;

    return savedTrack;
  }

  /**
   * Pause recording
   */
  pause(): void {
    if (!this.isRecording) {
      throw new Error('No track recording in progress');
    }
    this.isPaused = true;
  }

  /**
   * Resume recording
   */
  resume(): void {
    if (!this.isRecording) {
      throw new Error('No track recording in progress');
    }
    this.isPaused = false;
  }

  /**
   * Add a position point to the current track
   */
  addPoint(position: Position, speed: number, heading: number): boolean {
    if (!this.isRecording || this.isPaused || !this.currentTrack) {
      return false;
    }

    const trackPoint: TrackPoint = {
      latitude: position.latitude,
      longitude: position.longitude,
      speed,
      heading,
      timestamp: new Date(position.timestamp),
    };

    // Check if point should be recorded based on thresholds
    if (!this.shouldRecordPoint(trackPoint)) {
      return false;
    }

    // Add point to uncompressed array
    this.uncompressedPoints.push(trackPoint);

    // Update track statistics
    this.updateTrackStatistics(trackPoint);

    // Update last point
    this.lastPoint = trackPoint;

    return true;
  }

  /**
   * Get current track status
   */
  getStatus(): {
    isRecording: boolean;
    isPaused: boolean;
    currentTrack: Track | null;
    pointCount: number;
  } {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      currentTrack: this.currentTrack,
      pointCount: this.uncompressedPoints.length,
    };
  }

  /**
   * Get current track points (uncompressed)
   */
  getCurrentPoints(): TrackPoint[] {
    return [...this.uncompressedPoints];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TrackRecorderConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart auto-save if interval changed
    if (this.isRecording && this.config.autoSave && this.autoSaveTimer) {
      this.stopAutoSave();
      this.startAutoSave();
    }
  }

  /**
   * Check if a point should be recorded based on thresholds
   */
  private shouldRecordPoint(point: TrackPoint): boolean {
    if (!this.lastPoint) {
      return true; // Always record first point
    }

    // Check time threshold
    const timeDiff = (point.timestamp.getTime() - this.lastPoint.timestamp.getTime()) / 1000;
    if (timeDiff < this.config.minTimeThreshold) {
      return false;
    }

    // Check distance threshold
    const distance = calculateDistance(
      {
        latitude: this.lastPoint.latitude,
        longitude: this.lastPoint.longitude,
        accuracy: 0,
        timestamp: this.lastPoint.timestamp.getTime(),
      },
      {
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: 0,
        timestamp: point.timestamp.getTime(),
      }
    );

    return distance >= this.config.minDistanceThreshold;
  }

  /**
   * Update track statistics with new point
   */
  private updateTrackStatistics(point: TrackPoint): void {
    if (!this.currentTrack) return;

    // Update max speed
    if (point.speed > this.currentTrack.maxSpeed) {
      this.currentTrack.maxSpeed = point.speed;
    }

    // Calculate total distance
    if (this.lastPoint) {
      const segmentDistance = calculateDistance(
        {
          latitude: this.lastPoint.latitude,
          longitude: this.lastPoint.longitude,
          accuracy: 0,
          timestamp: this.lastPoint.timestamp.getTime(),
        },
        {
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy: 0,
          timestamp: point.timestamp.getTime(),
        }
      );
      this.currentTrack.distance += segmentDistance;
    }

    // Calculate average speed
    const totalSpeed = this.uncompressedPoints.reduce((sum, p) => sum + p.speed, 0);
    this.currentTrack.avgSpeed = totalSpeed / this.uncompressedPoints.length;
  }

  /**
   * Compress track points for storage
   */
  private compressPoints(points: TrackPoint[]): { compressed: boolean; data: string } {
    return {
      compressed: true,
      data: JSON.stringify(points),
    };
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(() => {
      this.autoSaveTrack();
    }, this.config.autoSaveInterval * 1000);
  }

  /**
   * Stop auto-save timer
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Auto-save current track to database
   */
  private async autoSaveTrack(): Promise<void> {
    if (!this.currentTrack || !this.isRecording) {
      return;
    }

    try {
      // Create a copy with compressed points
      const trackToSave = {
        ...this.currentTrack,
        points: this.compressPoints(this.uncompressedPoints),
        endTime: new Date(),
      };

      // Check if track exists in database
      const existingTrack = await trackRepository.getById(this.currentTrack.id!);

      if (existingTrack) {
        // Update existing track
        await trackRepository.update(this.currentTrack.id!, trackToSave);
      } else {
        // Create new track
        await trackRepository.create(trackToSave);
      }

      console.log(`Auto-saved track ${this.currentTrack.id} with ${this.uncompressedPoints.length} points`);
    } catch (error) {
      console.error('Failed to auto-save track:', error);
    }
  }

  /**
   * Generate unique track ID
   */
  private generateTrackId(): string {
    return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const trackRecorder = new TrackRecorder();
