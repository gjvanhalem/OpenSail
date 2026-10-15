import type { ProtocolType } from '@/store/slices/instrumentsSlice';
import {
  VesselSimulation,
  type SimulationConfig,
  type SimulationState,
} from '@/services/simulator/VesselSimulation';
import { encodeNMEA0183, encodeNMEA2000, encodeSeaTalk } from '@/services/simulator/encoders';
import type { DataConnectionStatus, InstrumentDataConnection } from './types';

export interface StubConnectionOptions {
  id: string;
  protocol: ProtocolType;
  /** How often the simulated instruments send a full set of data */
  intervalMs?: number;
  simulation?: Partial<SimulationConfig>;
  /** Seed for the simulation's wander, so runs can be replayed */
  seed?: number;
}

/**
 * A simulated instrument bus (R10). It produces real NMEA 0183 sentences,
 * NMEA 2000 CAN frames or SeaTalk datagrams from a moving vessel and hands
 * them over line by line, exactly like SerialConnection and
 * BluetoothConnection, so everything downstream runs as with hardware.
 */
export class StubConnection implements InstrumentDataConnection {
  public readonly id: string;
  public readonly protocol: ProtocolType;
  public status: DataConnectionStatus = 'disconnected';
  public errorMessage: string | null = null;

  private intervalMs: number;
  private readonly simulation: VesselSimulation;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTick = 0;
  private sid = 0;
  private dataCallback: ((data: string) => void) | null = null;
  private statusCallback: ((status: DataConnectionStatus, error?: string) => void) | null = null;

  constructor(options: StubConnectionOptions) {
    this.id = options.id;
    this.protocol = options.protocol;
    this.intervalMs = options.intervalMs ?? 500;
    this.simulation = new VesselSimulation(options.simulation, options.seed);
  }

  /** Always available: needs no browser device API */
  static isSupported(): boolean {
    return true;
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      throw new Error('Already connected or connecting');
    }
    this.updateStatus('connecting');
    this.lastTick = Date.now();
    this.updateStatus('connected');
    // Send a first set straight away, like an instrument already talking on the bus
    this.emit(this.simulation.state);
    this.startTimer();
  }

  async disconnect(): Promise<void> {
    this.stopTimer();
    this.updateStatus('disconnected');
  }

  onData(callback: (data: string) => void): void {
    this.dataCallback = callback;
  }

  onStatusChange(callback: (status: DataConnectionStatus, error?: string) => void): void {
    this.statusCallback = callback;
  }

  /** Writes to the stub are accepted and ignored, as a listen-only bus would */
  async write(): Promise<void> {}

  get state(): SimulationState {
    return this.simulation.state;
  }

  getSimulationConfig(): SimulationConfig {
    return this.simulation.getConfig();
  }

  getIntervalMs(): number {
    return this.intervalMs;
  }

  /** Change the simulated values while running (heading, speed, depth, wind, ...) */
  updateSimulation(changes: Partial<SimulationConfig>): void {
    this.simulation.updateConfig(changes);
  }

  setIntervalMs(intervalMs: number): void {
    this.intervalMs = Math.max(50, intervalMs);
    if (this.timer !== null) {
      this.stopTimer();
      this.startTimer();
    }
  }

  /** Advance the simulation by one interval and send its data (also used by tests) */
  tick(now = Date.now()): void {
    const state = this.simulation.step(now - this.lastTick, now);
    this.lastTick = now;
    this.emit(state);
  }

  private startTimer(): void {
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private emit(state: SimulationState): void {
    if (!this.dataCallback || this.status !== 'connected') return;
    const lines =
      this.protocol === 'NMEA0183'
        ? encodeNMEA0183(state)
        : this.protocol === 'NMEA2000'
          ? encodeNMEA2000(state, this.sid)
          : encodeSeaTalk(state);
    this.sid = (this.sid + 1) % 253;
    for (const line of lines) this.dataCallback(line);
  }

  private updateStatus(status: DataConnectionStatus, error?: string): void {
    this.status = status;
    this.errorMessage = error ?? null;
    this.statusCallback?.(status, error);
  }
}
