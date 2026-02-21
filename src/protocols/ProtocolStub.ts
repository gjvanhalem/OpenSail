import { Subject, interval, Observable } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import {
  ProtocolStub,
  StubConfig,
  SimulationScenario,
  DepthProfile,
  WindProfile,
  SpeedProfile,
  InstrumentData,
  InstrumentDataType,
  Position,
  AISTarget
} from '../types';
import { NMEA0183Parser } from './NMEA0183Parser';

export class ProtocolStubSimulator implements ProtocolStub {
  private config: StubConfig | null = null;
  private isRunning = false;
  private stopSignal = new Subject<void>();
  private dataSubject = new Subject<InstrumentData>();
  private currentScenario: SimulationScenario | null = null;

  private currentPositionIndex = 0;
  private currentDepthIndex = 0;
  private currentWindVariation = 0;
  private aisTargets: AISTarget[] = [];

  start(config: StubConfig): void {
    if (this.isRunning) {
      this.stop();
    }

    this.config = config;
    this.isRunning = true;
    this.stopSignal = new Subject<void>();

    const intervalMs = 1000 / config.updateRate;

    interval(intervalMs)
      .pipe(takeUntil(this.stopSignal))
      .subscribe(() => {
        if (this.config?.protocols.includes('nmea0183')) {
          this.generateNMEA0183Data();
        }
        if (this.config?.protocols.includes('nmea2000')) {
          this.generateNMEA2000Data();
        }
        if (this.config?.protocols.includes('seatalk')) {
          this.generateSeaTalkData();
        }
      });
  }

  stop(): void {
    this.isRunning = false;
    this.stopSignal.next();
    this.stopSignal.complete();
  }

  setScenario(scenario: SimulationScenario): void {
    this.currentScenario = scenario;
    this.currentPositionIndex = 0;
    this.currentDepthIndex = 0;
    this.currentWindVariation = 0;

    if (scenario.aisTargets) {
      this.aisTargets = scenario.aisTargets;
    }
  }

  updateValue(dataType: InstrumentDataType, value: unknown): void {
    const instrumentData: InstrumentData = {
      type: dataType,
      value,
      unit: this.getUnitForType(dataType),
      timestamp: Date.now(),
      source: 'stub'
    };

    this.dataSubject.next(instrumentData);
  }

  getDataStream(): Observable<InstrumentData> {
    return this.dataSubject.asObservable();
  }

  private generateNMEA0183Data(): void {
    if (!this.currentScenario) return;

    const parser = new NMEA0183Parser();

    if (this.currentScenario.gpsTrack) {
      const track = this.currentScenario.gpsTrack;
      if (this.currentPositionIndex < track.length) {
        const pos = track[this.currentPositionIndex];
        const gga = this.generateGGA(pos);
        const rmc = this.generateRMC(pos);

        this.emitData(parser.parseToInstrumentData(parser.parse(gga)!));
        this.emitData(parser.parseToInstrumentData(parser.parse(rmc)!));

        this.currentPositionIndex = (this.currentPositionIndex + 1) % track.length;
      }
    }

    if (this.currentScenario.depth) {
      this.emitDepthData(this.currentScenario.depth);
    }

    if (this.currentScenario.wind) {
      this.emitWindData(this.currentScenario.wind);
    }

    if (this.currentScenario.speed) {
      this.emitSpeedData(this.currentScenario.speed);
    }

    if (this.aisTargets.length > 0) {
      this.emitAISData();
    }
  }

  private generateNMEA2000Data(): void {
    if (!this.currentScenario) return;

    const depth = this.currentScenario.depth;
    if (depth && this.currentDepthIndex < depth.values.length) {
      const depthValue = depth.values[this.currentDepthIndex];
      const pgn128267 = this.generateNMEA2000Depth(depthValue);

      const data: InstrumentData = {
        type: InstrumentDataType.Depth,
        value: { depth: depthValue },
        unit: 'm',
        timestamp: Date.now(),
        source: 'nmea2000'
      };

      this.emitData(data);
      this.currentDepthIndex = (this.currentDepthIndex + 1) % depth.values.length;
    }

    if (this.currentScenario.wind) {
      const wind = this.currentScenario.wind;
      const pgn130306 = this.generateNMEA2000Wind(wind.speed, wind.direction);

      const data: InstrumentData = {
        type: InstrumentDataType.Wind,
        value: { speed: wind.speed, direction: wind.direction },
        unit: 'm/s',
        timestamp: Date.now(),
        source: 'nmea2000'
      };

      this.emitData(data);
    }
  }

  private generateSeaTalkData(): void {
    if (!this.currentScenario) return;

    if (this.currentScenario.depth) {
      const depth =
        this.currentScenario.depth.values[
          this.currentDepthIndex % this.currentScenario.depth.values.length
        ];

      const data: InstrumentData = {
        type: InstrumentDataType.Depth,
        value: { depth },
        unit: 'm',
        timestamp: Date.now(),
        source: 'seatalk'
      };

      this.emitData(data);
    }

    if (this.currentScenario.wind) {
      const wind = this.currentScenario.wind;

      const data: InstrumentData = {
        type: InstrumentDataType.Wind,
        value: {
          speed: wind.speed,
          angle: wind.direction,
          reference: 'apparent'
        },
        unit: 'deg, kn',
        timestamp: Date.now(),
        source: 'seatalk'
      };

      this.emitData(data);
    }
  }

  private generateGGA(position: Position): string {
    const lat = this.formatLatitude(position.latitude);
    const lon = this.formatLongitude(position.longitude);
    const time = new Date(position.timestamp)
      .toISOString()
      .split('T')[1]
      .replace(/[.:]/g, '')
      .slice(0, 9);
    const quality = 1;
    const satellites = 8;
    const hdop = 1.0;
    const altitude = 10.0;

    const sentence = `GPGGA,${time},${lat},N,${lon},E,${quality},${satellites},${hdop},${altitude},M,46.9,M,,*`;
    const checksum = this.calculateChecksum(sentence);
    return `$${sentence}${checksum}`;
  }

  private generateRMC(position: Position): string {
    const lat = this.formatLatitude(position.latitude);
    const lon = this.formatLongitude(position.longitude);
    const time = new Date(position.timestamp)
      .toISOString()
      .split('T')[1]
      .replace(/[.:]/g, '')
      .slice(0, 9);
    const status = 'A';
    const speed = 5.0;
    const course = 0.0;
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');

    const sentence = `GPRMC,${time},${status},${lat},N,${lon},E,${speed.toFixed(1)},${course.toFixed(1)},${date},,A*`;
    const checksum = this.calculateChecksum(sentence);
    return `$${sentence}${checksum}`;
  }

  private generateNMEA2000Depth(depth: number): Buffer {
    const depthInt = Math.round(depth * 100);
    const data = Buffer.alloc(8);
    data.writeUInt32BE(depthInt, 0);
    data.writeInt16BE(0, 4);
    data[6] = 0;
    return data;
  }

  private generateNMEA2000Wind(speed: number, direction: number): Buffer {
    const speedInt = Math.round(speed * 100);
    const angleInt = Math.round(direction * 10000);
    const data = Buffer.alloc(8);
    data.writeUInt16BE(angleInt, 0);
    data.writeUInt16BE(speedInt, 2);
    data[4] = 1;
    return data;
  }

  private emitDepthData(depthProfile: DepthProfile): void {
    if (this.currentDepthIndex < depthProfile.values.length) {
      const depth = depthProfile.values[this.currentDepthIndex];

      const data: InstrumentData = {
        type: InstrumentDataType.Depth,
        value: depth,
        unit: 'm',
        timestamp: Date.now(),
        source: 'stub'
      };

      this.emitData(data);
      this.currentDepthIndex++;
    }
  }

  private emitWindData(windProfile: WindProfile): void {
    this.currentWindVariation = (Math.random() - 0.5) * windProfile.variation * 2;
    const speed = windProfile.speed + this.currentWindVariation;
    const direction = windProfile.direction + (Math.random() - 0.5) * 10;

    const data: InstrumentData = {
      type: InstrumentDataType.Wind,
      value: { speed, direction },
      unit: 'kn',
      timestamp: Date.now(),
      source: 'stub'
    };

    this.emitData(data);
  }

  private emitSpeedData(speedProfile: SpeedProfile): void {
    const variation = (Math.random() - 0.5) * speedProfile.variation * 2;
    const speed = speedProfile.speed + variation;

    const data: InstrumentData = {
      type: InstrumentDataType.Speed,
      value: speed,
      unit: 'kn',
      timestamp: Date.now(),
      source: 'stub'
    };

    this.emitData(data);
  }

  private emitAISData(): void {
    this.aisTargets.forEach(target => {
      target.position.latitude += (Math.random() - 0.5) * 0.001;
      target.position.longitude += (Math.random() - 0.5) * 0.001;
      target.lastUpdate = new Date();
      target.history.push({ ...target.position });

      if (target.history.length > 10) {
        target.history.shift();
      }

      const data: InstrumentData = {
        type: InstrumentDataType.AIS,
        value: target,
        unit: '',
        timestamp: Date.now(),
        source: 'stub'
      };

      this.emitData(data);
    });
  }

  private emitData(data: InstrumentData | null): void {
    if (data) {
      this.dataSubject.next(data);
    }
  }

  private formatLatitude(lat: number): string {
    const abs = Math.abs(lat);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    return `${deg.toString().padStart(2, '0')}${min.toFixed(4).padStart(7, '0')}`;
  }

  private formatLongitude(lon: number): string {
    const abs = Math.abs(lon);
    const deg = Math.floor(abs);
    const min = (abs - deg) * 60;
    return `${deg.toString().padStart(3, '0')}${min.toFixed(4).padStart(7, '0')}`;
  }

  private calculateChecksum(sentence: string): string {
    let checksum = 0;
    for (let i = 0; i < sentence.length; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    return checksum.toString(16).toUpperCase().padStart(2, '0');
  }

  private getUnitForType(dataType: InstrumentDataType): string {
    switch (dataType) {
      case InstrumentDataType.Depth:
        return 'm';
      case InstrumentDataType.Speed:
        return 'kn';
      case InstrumentDataType.Wind:
        return 'kn';
      case InstrumentDataType.Heading:
        return 'deg';
      case InstrumentDataType.Temperature:
        return 'K';
      default:
        return '';
    }
  }
}

export const createProtocolStub = (): ProtocolStub => {
  return new ProtocolStubSimulator();
};

export const testScenarios: Record<string, SimulationScenario> = {
  coastalNavigation: {
    name: 'Coastal Navigation',
    gpsTrack: generateCoastalTrack(),
    depth: { values: [5, 8, 12, 15, 20], interval: 10 },
    wind: { speed: 15, direction: 270, variation: 10 },
    speed: { speed: 6.5, variation: 5 }
  },
  harborApproach: {
    name: 'Harbor Approach',
    gpsTrack: generateHarborApproachTrack(),
    depth: { values: [20, 15, 10, 8, 5, 3], interval: 5 },
    wind: { speed: 8, direction: 180, variation: 15 },
    speed: { speed: 3.0, variation: 10 },
    aisTargets: generateHarborTraffic()
  },
  openWater: {
    name: 'Open Water Passage',
    gpsTrack: generateOpenWaterTrack(100),
    depth: { values: [50, 60, 70, 80], interval: 60 },
    wind: { speed: 20, direction: 315, variation: 5 },
    speed: { speed: 7.5, variation: 3 }
  }
};

function generateCoastalTrack(): Position[] {
  const track: Position[] = [];
  const startLat = 52.5;
  const startLon = 5.0;

  for (let i = 0; i < 3600; i++) {
    const t = i / 100;
    track.push({
      latitude: startLat + Math.sin(t * 0.1) * 0.1,
      longitude: startLon + t * 0.01,
      accuracy: 5,
      timestamp: Date.now() + i * 1000
    });
  }

  return track;
}

function generateHarborApproachTrack(): Position[] {
  const track: Position[] = [];
  const startLat = 52.1;
  const startLon = 4.4;

  for (let i = 0; i < 600; i++) {
    const progress = i / 600;
    track.push({
      latitude: startLat + progress * 0.05,
      longitude: startLon + progress * 0.1 + Math.sin(progress * Math.PI * 2) * 0.01,
      accuracy: 3,
      timestamp: Date.now() + i * 1000
    });
  }

  return track;
}

function generateOpenWaterTrack(nm: number): Position[] {
  const track: Position[] = [];
  const startLat = 50.0;
  const startLon = -10.0;

  const points = nm * 60;
  const latStep = nm / points;

  for (let i = 0; i < points; i++) {
    track.push({
      latitude: startLat + i * latStep,
      longitude: startLon,
      accuracy: 10,
      timestamp: Date.now() + i * 1000
    });
  }

  return track;
}

function generateHarborTraffic(): AISTarget[] {
  return [
    {
      mmsi: '123456789',
      name: 'CARGO VESSEL',
      callSign: 'ABC',
      position: {
        latitude: 52.12,
        longitude: 4.42,
        accuracy: 10,
        timestamp: Date.now()
      },
      course: 90,
      speed: 5,
      heading: 90,
      vesselType: 70,
      length: 150,
      width: 25,
      lastUpdate: new Date(),
      history: []
    },
    {
      mmsi: '987654321',
      name: 'FERRY',
      callSign: 'XYZ',
      position: {
        latitude: 52.13,
        longitude: 4.41,
        accuracy: 10,
        timestamp: Date.now()
      },
      course: 270,
      speed: 8,
      heading: 270,
      vesselType: 50,
      length: 80,
      width: 20,
      lastUpdate: new Date(),
      history: []
    }
  ];
}
