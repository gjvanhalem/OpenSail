import { v4 as uuidv4 } from 'uuid';
import { SafetyService, MOBMarker, AnchorWatch, Position } from '../types';

export class SafetyServiceImpl implements SafetyService {
  private mobMarker: MOBMarker | null = null;
  private anchorWatch: AnchorWatch | null = null;
  private currentPosition: Position | null = null;
  private anchorWatchInterval: ReturnType<typeof setInterval> | null = null;
  private alarmCallback: ((message: string) => void) | null = null;

  activateMOB(position: Position): MOBMarker {
    const marker: MOBMarker = {
      id: uuidv4(),
      position: { ...position },
      timestamp: new Date(),
      active: true
    };

    this.mobMarker = marker;

    // Trigger alarm
    this.triggerAlarm('MAN OVERBOARD! Position marked.');

    console.log('MOB activated at:', position);
    return marker;
  }

  getMOBMarker(): MOBMarker | null {
    return this.mobMarker;
  }

  clearMOB(): void {
    if (this.mobMarker) {
      this.mobMarker.active = false;
      console.log('MOB marker cleared');
    }
    this.mobMarker = null;
  }

  calculateBearingToMOB(): number | null {
    if (!this.mobMarker || !this.currentPosition) {
      return null;
    }

    return this.calculateBearing(this.currentPosition, this.mobMarker.position);
  }

  calculateDistanceToMOB(): number | null {
    if (!this.mobMarker || !this.currentPosition) {
      return null;
    }

    return this.calculateDistance(this.currentPosition, this.mobMarker.position);
  }

  startAnchorWatch(radius: number, position: Position): AnchorWatch {
    // Stop existing anchor watch if any
    this.stopAnchorWatch();

    const watch: AnchorWatch = {
      id: uuidv4(),
      centerPosition: { ...position },
      radius,
      active: true,
      alarmTriggered: false
    };

    this.anchorWatch = watch;

    // Start monitoring every 10 seconds
    this.anchorWatchInterval = setInterval(() => {
      this.checkAnchorWatch();
    }, 10000);

    console.log(`Anchor watch started at ${position.latitude}, ${position.longitude} with radius ${radius}m`);
    return watch;
  }

  stopAnchorWatch(): void {
    if (this.anchorWatchInterval) {
      clearInterval(this.anchorWatchInterval);
      this.anchorWatchInterval = null;
    }

    if (this.anchorWatch) {
      this.anchorWatch.active = false;
      console.log('Anchor watch stopped');
    }

    this.anchorWatch = null;
  }

  getAnchorWatch(): AnchorWatch | null {
    return this.anchorWatch;
  }

  updateAnchorWatchRadius(radius: number): void {
    if (!this.anchorWatch) {
      throw new Error('No anchor watch active');
    }

    if (radius < 10 || radius > 500) {
      throw new Error('Anchor watch radius must be between 10 and 500 meters');
    }

    this.anchorWatch.radius = radius;
    this.anchorWatch.alarmTriggered = false; // Reset alarm when radius changes
    console.log(`Anchor watch radius updated to ${radius}m`);
  }

  setCurrentPosition(position: Position): void {
    this.currentPosition = position;
  }

  // Set callback for alarm notifications
  setAlarmCallback(callback: (message: string) => void): void {
    this.alarmCallback = callback;
  }

  private checkAnchorWatch(): void {
    if (!this.anchorWatch || !this.anchorWatch.active || !this.currentPosition) {
      return;
    }

    const distance = this.calculateDistanceInMeters(
      this.anchorWatch.centerPosition,
      this.currentPosition
    );

    if (distance > this.anchorWatch.radius) {
      if (!this.anchorWatch.alarmTriggered) {
        this.anchorWatch.alarmTriggered = true;
        const message = `ANCHOR WATCH ALARM! Vessel has moved ${distance.toFixed(0)}m from anchor position (limit: ${this.anchorWatch.radius}m)`;
        this.triggerAlarm(message);
        console.warn(message);
      }
    } else {
      // Reset alarm if back within radius
      if (this.anchorWatch.alarmTriggered) {
        this.anchorWatch.alarmTriggered = false;
        console.log('Vessel back within anchor watch radius');
      }
    }
  }

  private triggerAlarm(message: string): void {
    if (this.alarmCallback) {
      this.alarmCallback(message);
    } else {
      // Default alarm behavior - could play sound, show notification, etc.
      console.error('ALARM:', message);
    }
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    // Returns distance in nautical miles
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

  private calculateDistanceInMeters(pos1: Position, pos2: Position): number {
    // Returns distance in meters
    const R = 6371000; // Earth radius in meters
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

  private calculateBearing(start: Position, end: Position): number {
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
}

export const createSafetyService = (): SafetyService => {
  return new SafetyServiceImpl();
};
