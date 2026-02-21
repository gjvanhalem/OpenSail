import { v4 as uuidv4 } from 'uuid';
import {
  TrackService,
  Track,
  TrackPoint,
  TrackFilter,
  Position,
  Route,
  Waypoint
} from '../types';
import { TrackRepository } from '../database/TrackRepository';

export class TrackServiceImpl implements TrackService {
  private trackRepo = new TrackRepository();
  private currentTrackId: string | null = null;
  private recordingInterval: ReturnType<typeof setInterval> | null = null;
  private currentPosition: Position | null = null;
  private trackPoints: TrackPoint[] = [];

  async startRecording(name: string): Promise<string> {
    if (this.currentTrackId) {
      throw new Error('Track recording already in progress');
    }

    const trackId = uuidv4();
    this.currentTrackId = trackId;
    this.trackPoints = [];

    // Create track in database with current position or default
    const startPosition = this.currentPosition || {
      latitude: 0,
      longitude: 0,
      accuracy: 0,
      timestamp: Date.now()
    };

    await this.trackRepo.startRecording(name, startPosition);

    // Start recording position every 10 seconds
    this.recordingInterval = setInterval(() => {
      if (this.currentPosition) {
        this.recordTrackPoint();
      }
    }, 10000);

    console.log(`Started recording track: ${name} (${trackId})`);
    return trackId;
  }

  async stopRecording(): Promise<void> {
    if (!this.currentTrackId) {
      throw new Error('No track recording in progress');
    }

    // Stop the recording interval
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }

    // Save final track point if available
    if (this.currentPosition) {
      this.recordTrackPoint();
    }

    // Stop recording in repository (will calculate statistics)
    await this.trackRepo.stopRecording(this.currentTrackId);

    console.log(`Stopped recording track: ${this.currentTrackId}`);
    this.currentTrackId = null;
    this.trackPoints = [];
  }

  async getTrack(trackId: string): Promise<Track | null> {
    return this.trackRepo.getTrack(trackId);
  }

  async getTracks(filter?: TrackFilter): Promise<Track[]> {
    return this.trackRepo.getTracks(filter);
  }

  async exportTrack(trackId: string, format: 'gpx' | 'kml'): Promise<string> {
    const track = await this.trackRepo.getTrack(trackId);
    if (!track) {
      throw new Error('Track not found');
    }

    if (format === 'gpx') {
      return this.exportToGPX(track);
    } else {
      return this.exportToKML(track);
    }
  }

  async convertToRoute(trackId: string): Promise<Route> {
    const track = await this.trackRepo.getTrack(trackId);
    if (!track) {
      throw new Error('Track not found');
    }

    // Sample waypoints from track (every 10th point or significant course changes)
    const waypoints: Waypoint[] = [];
    const samplingInterval = Math.max(1, Math.floor(track.points.length / 20)); // Max 20 waypoints

    for (let i = 0; i < track.points.length; i += samplingInterval) {
      const point = track.points[i];
      waypoints.push({
        id: uuidv4(),
        position: point.position,
        name: `WP${waypoints.length + 1}`,
        arrivalRadius: 50
      });
    }

    // Ensure last point is included
    if (track.points.length > 0) {
      const lastPoint = track.points[track.points.length - 1];
      waypoints.push({
        id: uuidv4(),
        position: lastPoint.position,
        name: `WP${waypoints.length + 1}`,
        arrivalRadius: 50
      });
    }

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistance += this.calculateDistance(
        waypoints[i].position,
        waypoints[i + 1].position
      );
    }

    const route: Route = {
      id: uuidv4(),
      name: `Route from ${track.name}`,
      waypoints,
      totalDistance,
      estimatedDuration: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return route;
  }

  async deleteTrack(trackId: string): Promise<void> {
    await this.trackRepo.deleteTrack(trackId);
  }

  async compressOldTracks(): Promise<number> {
    return this.trackRepo.compressOldTracks();
  }

  async exportTrackToFile(trackId: string, format: 'gpx' | 'kml', filePath: string): Promise<void> {
    const exportData = await this.exportTrack(trackId, format);
    
    // In a real implementation, this would use react-native-fs to write the file
    // For now, we'll just log it
    console.log(`Exporting track to ${filePath}`);
    console.log(`Export data length: ${exportData.length} bytes`);
    
    // Example with react-native-fs:
    // const RNFS = require('react-native-fs');
    // await RNFS.writeFile(filePath, exportData, 'utf8');
  }

  // Public method to update current position from GPS
  setCurrentPosition(position: Position): void {
    this.currentPosition = position;
  }

  private recordTrackPoint(): void {
    if (!this.currentPosition || !this.currentTrackId) return;

    const trackPoint: TrackPoint = {
      position: { ...this.currentPosition },
      speed: 0, // Should be calculated from position changes
      heading: 0, // Should be calculated from position changes
      timestamp: new Date()
    };

    // Calculate speed and heading if we have previous point
    if (this.trackPoints.length > 0) {
      const prevPoint = this.trackPoints[this.trackPoints.length - 1];
      const timeDiff = (trackPoint.timestamp.getTime() - prevPoint.timestamp.getTime()) / 1000; // seconds
      const distance = this.calculateDistance(prevPoint.position, trackPoint.position);
      trackPoint.speed = distance / (timeDiff / 3600); // knots
      trackPoint.heading = this.calculateBearing(prevPoint.position, trackPoint.position);
    }

    this.trackPoints.push(trackPoint);

    // Save to database
    this.trackRepo.addTrackPoint(this.currentTrackId, trackPoint).catch(err => {
      console.error('Failed to save track point:', err);
    });
  }

  private calculateTrackStatistics(points: TrackPoint[]): {
    distance: number;
    maxSpeed: number;
    avgSpeed: number;
  } {
    if (points.length === 0) {
      return { distance: 0, maxSpeed: 0, avgSpeed: 0 };
    }

    let totalDistance = 0;
    let maxSpeed = 0;
    let totalSpeed = 0;

    for (let i = 1; i < points.length; i++) {
      const distance = this.calculateDistance(points[i - 1].position, points[i].position);
      totalDistance += distance;

      if (points[i].speed > maxSpeed) {
        maxSpeed = points[i].speed;
      }
      totalSpeed += points[i].speed;
    }

    const avgSpeed = points.length > 1 ? totalSpeed / (points.length - 1) : 0;

    return { distance: totalDistance, maxSpeed, avgSpeed };
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

  private exportToGPX(track: Track): string {
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="OpenSail">
  <trk>
    <name>${this.escapeXml(track.name)}</name>
    <trkseg>
`;

    for (const point of track.points) {
      gpx += `      <trkpt lat="${point.position.latitude}" lon="${point.position.longitude}">
        <time>${point.timestamp.toISOString()}</time>
        <speed>${point.speed}</speed>
        <course>${point.heading}</course>
      </trkpt>
`;
    }

    gpx += `    </trkseg>
  </trk>
</gpx>`;

    return gpx;
  }

  private exportToKML(track: Track): string {
    let coords = '';
    for (const point of track.points) {
      coords += `${point.position.longitude},${point.position.latitude},0 `;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${this.escapeXml(track.name)}</name>
    <Placemark>
      <name>${this.escapeXml(track.name)}</name>
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

export const createTrackService = (): TrackService => {
  return new TrackServiceImpl();
};
