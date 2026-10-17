import type { Position } from '@/models';
import { reportNavigation, setGPSActive } from '@/store/slices/navigationSlice';
import { calculateBearing } from '@/utils/calculations';
import type { AppDispatch } from '@/store';

export interface SimulatedTrack {
  name: string;
  description: string;
  waypoints: Position[];
  speed: number; // knots
}

/** Waypoints from [latitude, longitude] pairs, all on the water */
function trackPoints(points: Array<[number, number]>): Position[] {
  return points.map(([latitude, longitude]) => ({
    latitude,
    longitude,
    accuracy: 5,
    timestamp: Date.now(),
  }));
}

export interface GPSSimulatorConfig {
  updateInterval?: number; // milliseconds
  track?: SimulatedTrack;
}

/**
 * GPS Simulator for development and testing
 * Generates realistic GPS position updates along predefined tracks
 */
export class GPSSimulator {
  private dispatch: AppDispatch | null = null;
  private intervalId: number | null = null;
  private isActive = false;
  private currentTrack: SimulatedTrack | null = null;
  private currentWaypointIndex = 0;
  private currentPosition: Position | null = null;
  private progress = 0; // 0-1 between current and next waypoint
  private updateInterval: number;

  constructor(config: GPSSimulatorConfig = {}) {
    this.updateInterval = config.updateInterval ?? 1000; // 1 second default
    this.currentTrack = config.track ?? null;
  }

  /**
   * Initialize the simulator with Redux dispatch
   */
  public initialize(dispatch: AppDispatch): void {
    this.dispatch = dispatch;
  }

  /**
   * Start the GPS simulator
   */
  public start(track?: SimulatedTrack): void {
    if (!this.dispatch) {
      throw new Error('GPSSimulator not initialized. Call initialize() first.');
    }

    if (this.isActive) {
      console.warn('GPSSimulator is already active');
      return;
    }

    if (track) {
      this.currentTrack = track;
    }

    if (!this.currentTrack || this.currentTrack.waypoints.length < 2) {
      throw new Error('GPSSimulator requires a track with at least 2 waypoints');
    }

    // Reset state
    this.currentWaypointIndex = 0;
    this.progress = 0;
    this.currentPosition = this.currentTrack.waypoints[0];

    // Start simulation loop
    this.isActive = true;
    this.dispatch(setGPSActive(true));

    // Send initial position
    this.updatePosition();

    // Start interval
    this.intervalId = window.setInterval(() => {
      this.updatePosition();
    }, this.updateInterval);

    console.log('GPSSimulator started:', this.currentTrack.name);
  }

  /**
   * Stop the GPS simulator
   */
  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isActive = false;
    if (this.dispatch) {
      this.dispatch(setGPSActive(false));
    }
    console.log('GPSSimulator stopped');
  }

  /**
   * Check if simulator is active
   */
  public getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Name of the track being simulated, if any
   */
  public getTrackName(): string | null {
    return this.currentTrack?.name ?? null;
  }

  /**
   * Get current simulated position
   */
  public getCurrentPosition(): Position | null {
    return this.currentPosition;
  }

  /**
   * Set a new track
   */
  public setTrack(track: SimulatedTrack): void {
    const wasActive = this.isActive;
    if (wasActive) {
      this.stop();
    }
    this.currentTrack = track;
    if (wasActive) {
      this.start();
    }
  }

  /**
   * Get available predefined tracks
   */
  public static getPredefinedTracks(): SimulatedTrack[] {
    return [
      GPSSimulator.createHarborTrack(),
      GPSSimulator.createCoastalTrack(),
      GPSSimulator.createOpenWaterTrack(),
    ];
  }

  /**
   * Update position along the track
   */
  private updatePosition(): void {
    if (!this.currentTrack || !this.dispatch) return;

    const waypoints = this.currentTrack.waypoints;
    if (this.currentWaypointIndex >= waypoints.length - 1) {
      // Reached end of track, loop back to start
      this.currentWaypointIndex = 0;
      this.progress = 0;
    }

    const start = waypoints[this.currentWaypointIndex];
    const end = waypoints[this.currentWaypointIndex + 1];

    // Interpolate position
    this.currentPosition = this.interpolatePosition(start, end, this.progress);

    // Dispatch to Redux, with course and speed over ground like a real GPS
    this.dispatch(
      reportNavigation('gps', {
        position: this.currentPosition,
        course: calculateBearing(start, end),
        speedOverGround: this.currentTrack.speed,
      })
    );

    // Calculate progress increment based on speed
    // Speed is in knots, convert to meters per second: 1 knot = 0.514444 m/s
    const speedMps = this.currentTrack.speed * 0.514444;
    const distancePerUpdate = speedMps * (this.updateInterval / 1000);
    const totalDistance = this.calculateDistance(start, end);
    const progressIncrement = distancePerUpdate / totalDistance;

    this.progress += progressIncrement;

    // Move to next waypoint if we've passed current one
    if (this.progress >= 1.0) {
      this.currentWaypointIndex++;
      this.progress = 0;
    }
  }

  /**
   * Interpolate position between two points
   */
  private interpolatePosition(start: Position, end: Position, progress: number): Position {
    const lat = start.latitude + (end.latitude - start.latitude) * progress;
    const lon = start.longitude + (end.longitude - start.longitude) * progress;

    return {
      latitude: lat,
      longitude: lon,
      accuracy: 5 + Math.random() * 5, // 5-10m accuracy
      timestamp: Date.now(),
      altitude: start.altitude ?? 0,
    };
  }

  /**
   * Calculate distance between two positions in meters (Haversine formula)
   */
  private calculateDistance(pos1: Position, pos2: Position): number {
    const R = 6371000; // Earth's radius in meters
    const lat1 = (pos1.latitude * Math.PI) / 180;
    const lat2 = (pos2.latitude * Math.PI) / 180;
    const deltaLat = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
    const deltaLon = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Create a harbor navigation track: out of Stavoren onto the IJsselmeer.
   * Stavoren is inside the inland ENC area, so the chart shows depths here.
   */
  public static createHarborTrack(): SimulatedTrack {
    return {
      name: 'Harbor Navigation',
      description: 'Out of Stavoren harbour onto the IJsselmeer, with turns and slow speed',
      speed: 3, // 3 knots
      waypoints: trackPoints([
        [52.8872, 5.3570],
        [52.8869, 5.3545],
        [52.8865, 5.3537],
        [52.8862, 5.3528],
        [52.8858, 5.3500],
        [52.8835, 5.3440],
        [52.8790, 5.3380],
      ]),
    };
  }

  /**
   * Create a coastal navigation track: north along the Frisian IJsselmeer coast
   */
  public static createCoastalTrack(): SimulatedTrack {
    return {
      name: 'Coastal Cruise',
      description: 'Stavoren to Hindeloopen along the Frisian IJsselmeer coast at moderate speed',
      speed: 6, // 6 knots
      waypoints: trackPoints([
        [52.8770, 5.3370],
        [52.8960, 5.3420],
        [52.9150, 5.3540],
        [52.9330, 5.3720],
        [52.9420, 5.3820],
      ]),
    };
  }

  /**
   * Create an open water passage track: across the IJsselmeer to Enkhuizen
   */
  public static createOpenWaterTrack(): SimulatedTrack {
    return {
      name: 'Open Water Passage',
      description: 'Stavoren to Enkhuizen across the IJsselmeer at cruising speed',
      speed: 7.5, // 7.5 knots
      waypoints: trackPoints([
        [52.8770, 5.3370],
        [52.8350, 5.3100],
        [52.7900, 5.2950],
        [52.7450, 5.2950],
        [52.7150, 5.3000],
      ]),
    };
  }
}

// Singleton instance
let gpsSimulatorInstance: GPSSimulator | null = null;

/**
 * Get or create the singleton GPSSimulator instance
 */
export function getGPSSimulator(config?: GPSSimulatorConfig): GPSSimulator {
  if (!gpsSimulatorInstance) {
    gpsSimulatorInstance = new GPSSimulator(config);
  }
  return gpsSimulatorInstance;
}
