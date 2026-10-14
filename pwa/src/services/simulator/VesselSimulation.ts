import type { Position } from '@/models';
import { calculateDestination } from '@/utils/calculations';

/** What the simulated boat and its sensors do. Angles in degrees, speeds in knots. */
export interface SimulationConfig {
  start: { latitude: number; longitude: number };
  /** True heading; the boat also tracks this course (no current or leeway) */
  heading: number;
  /** Speed through water, which is also speed over ground */
  speed: number;
  /** Depth below transducer, metres */
  depth: number;
  /** Apparent wind speed */
  windSpeed: number;
  /** Apparent wind angle, 0-360 clockwise from the bow */
  windAngle: number;
  /** Water temperature, °C */
  waterTemperature: number;
  /** Magnetic variation, east positive */
  variation: number;
  /** Add realistic wander to heading, speed, depth and wind */
  variability: boolean;
}

export interface SimulationState {
  position: Position;
  /** True heading */
  heading: number;
  /** True course over ground */
  course: number;
  speedOverGround: number;
  speedThroughWater: number;
  depth: number;
  windSpeed: number;
  windAngle: number;
  waterTemperature: number;
  variation: number;
  timestamp: number;
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  // Off Hoek van Holland, heading out into the North Sea
  start: { latitude: 51.9925, longitude: 4.0825 },
  heading: 295,
  speed: 6,
  depth: 12,
  windSpeed: 14,
  windAngle: 40,
  waterTemperature: 14,
  variation: 1.5,
  variability: true,
};

/** Small deterministic PRNG (mulberry32), so tests can replay a run */
function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const normalize = (degrees: number) => ((degrees % 360) + 360) % 360;
const SECONDS_PER_HOUR = 3600;

/**
 * A boat moving through the water: dead-reckons position from heading and
 * speed, with optional slow wander on top of the configured values the way
 * real sensors move about.
 */
export class VesselSimulation {
  private config: SimulationConfig;
  private position: Position;
  private elapsed = 0;
  private readonly random: () => number;
  private current: SimulationState;

  constructor(config: Partial<SimulationConfig> = {}, seed = 1, now = Date.now()) {
    this.config = { ...DEFAULT_SIMULATION_CONFIG, ...config };
    this.random = createRandom(seed);
    this.position = { ...this.config.start, accuracy: 3, timestamp: now };
    this.current = this.sample(now);
  }

  get state(): SimulationState {
    return this.current;
  }

  getConfig(): SimulationConfig {
    return { ...this.config };
  }

  /** Change what is simulated; a new start position moves the boat there */
  updateConfig(changes: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...changes };
    if (changes.start) {
      this.position = { ...changes.start, accuracy: 3, timestamp: this.position.timestamp };
    }
    this.current = this.sample(this.position.timestamp);
  }

  /** Advance the boat by dtMs and return the new state */
  step(dtMs: number, now = Date.now()): SimulationState {
    this.elapsed += dtMs / 1000;
    const { course, speedOverGround } = this.current;
    const distanceNm = (speedOverGround * dtMs) / 1000 / SECONDS_PER_HOUR;
    this.position = { ...calculateDestination(this.position, course, distanceNm), accuracy: 3, timestamp: now };
    this.current = this.sample(now);
    return this.current;
  }

  private sample(timestamp: number): SimulationState {
    const c = this.config;
    const t = this.elapsed;
    // Slow swings plus a little sensor noise
    const wander = (amplitude: number, periodSeconds: number, noise: number) =>
      c.variability
        ? amplitude * Math.sin((2 * Math.PI * t) / periodSeconds) + noise * (this.random() - 0.5)
        : 0;

    const heading = normalize(c.heading + wander(3, 20, 1));
    const speed = Math.max(0, c.speed + wander(0.3, 30, 0.1));
    return {
      position: { ...this.position, timestamp },
      heading,
      course: heading,
      speedOverGround: speed,
      speedThroughWater: speed,
      depth: Math.max(0.5, c.depth * (1 + (c.variability ? 0.15 * Math.sin((2 * Math.PI * t) / 60) : 0)) + wander(0, 1, 0.1)),
      windSpeed: Math.max(0, c.windSpeed + wander(2, 15, 0.5)),
      windAngle: normalize(c.windAngle + wander(6, 12, 2)),
      waterTemperature: c.waterTemperature,
      variation: c.variation,
      timestamp,
    };
  }
}
