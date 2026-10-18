import type { ProtocolType } from '@/store/slices/instrumentsSlice';
import type { DataConnectionStatus, InstrumentDataConnection } from './types';
import { Backoff, LineSplitter, reconnectMessage } from './lineStream';
import { isNativeTcpSupported, loadNativeTcp, type NativeTcp } from '@/platform/nativeTcp';

export interface NativeTcpConnectionOptions {
  id: string;
  protocol: ProtocolType;
  host: string;
  port: number;
  /** Send data to the other side (e.g. a route to the autopilot). Off by default: read-only. */
  allowWrites?: boolean;
  /** First wait before reconnecting after the link drops; doubles up to maxReconnectDelayMs */
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  /** For tests: the native sockets */
  tcp?: NativeTcp;
}

/**
 * Instruments over Wi-Fi in the native apps: a plain TCP connection opened by
 * the app (Rust on Windows, Kotlin on Android, see @/platform/nativeTcp), e.g.
 * to the Pcnautic / pypilot autopilot's NMEA server on 192.168.14.1:20220.
 * No bridge needed.
 *
 * The app sends every chunk it reads as a 'tcp-data' event; lines are handed over
 * one at a time like WebSocketConnection does. When the link drops (the boat's
 * Wi-Fi does), it keeps reconnecting until disconnect() is called.
 */
export class NativeTcpConnection implements InstrumentDataConnection {
  public readonly id: string;
  public readonly protocol: ProtocolType;
  public readonly host: string;
  public readonly port: number;
  public status: DataConnectionStatus = 'disconnected';
  public errorMessage: string | null = null;

  private readonly allowWrites: boolean;
  private readonly backoff: Backoff;
  private readonly lines = new LineSplitter();
  private tcp: NativeTcp | null;
  private unlisten: (() => void)[] = [];
  /** Id of the open socket on the native side; a new one per attempt, so late events of an old one are ignored */
  private socketId: string | null = null;
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wanted = false;
  private dataCallback: ((data: string) => void) | null = null;
  private statusCallback: ((status: DataConnectionStatus, error?: string) => void) | null = null;

  constructor(options: NativeTcpConnectionOptions) {
    this.id = options.id;
    this.protocol = options.protocol;
    this.host = options.host.trim();
    this.port = options.port;
    this.allowWrites = options.allowWrites ?? false;
    this.backoff = new Backoff(options.reconnectDelayMs ?? 1000, options.maxReconnectDelayMs ?? 15000);
    this.tcp = options.tcp ?? null;
  }

  /** Only the native apps can open TCP sockets */
  static isSupported(): boolean {
    return isNativeTcpSupported();
  }

  get address(): string {
    return `${this.host}:${this.port}`;
  }

  /** Resolves once the first link is up; rejects if the address is unusable or unreachable */
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      throw new Error('Already connected or connecting');
    }
    if (!this.host || !Number.isInteger(this.port) || this.port < 1 || this.port > 65535) {
      const message = `"${this.address}" is not a valid address. Use for example 192.168.14.1 and port 20220.`;
      this.updateStatus('error', message);
      throw new Error(message);
    }
    this.wanted = true;
    this.backoff.reset();
    this.updateStatus('connecting');
    try {
      await this.listen();
      await this.open();
    } catch (error) {
      // The very first attempt failed: report it instead of retrying quietly
      this.wanted = false;
      this.stopListening();
      const reason = error instanceof Error ? error.message : String(error);
      const message = `Could not connect to ${this.address}: ${reason}. Is this device on the boat's Wi-Fi?`;
      this.updateStatus('error', message);
      throw new Error(message);
    }
  }

  async disconnect(): Promise<void> {
    this.wanted = false;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socketId = this.socketId;
    this.socketId = null;
    this.lines.reset();
    if (socketId && this.tcp) {
      await this.tcp.disconnect(socketId).catch(() => {});
    }
    this.stopListening();
    this.updateStatus('disconnected');
  }

  onData(callback: (data: string) => void): void {
    this.dataCallback = callback;
  }

  onStatusChange(callback: (status: DataConnectionStatus, error?: string) => void): void {
    this.statusCallback = callback;
  }

  /** Send NMEA sentences to the other side, e.g. a route for the autopilot to steer. Off unless allowWrites. */
  async write(data: string): Promise<void> {
    if (!this.allowWrites) throw new Error('This connection is read-only');
    if (!this.socketId || !this.tcp || this.status !== 'connected') throw new Error('Not connected');
    await this.tcp.write(this.socketId, data.endsWith('\n') ? data : `${data}\r\n`);
  }

  private async listen(): Promise<void> {
    this.tcp ??= await loadNativeTcp();
    const tcp = this.tcp;
    this.unlisten = await Promise.all([
      tcp.onData((event) => {
        if (event.id !== this.socketId) return;
        for (const line of this.lines.push(event.data)) this.dataCallback?.(line);
      }),
      tcp.onClosed((event) => {
        if (event.id !== this.socketId) return;
        this.socketId = null;
        this.lines.reset();
        if (this.wanted) this.scheduleReconnect();
      }),
    ]);
  }

  private stopListening(): void {
    for (const unlisten of this.unlisten) unlisten();
    this.unlisten = [];
  }

  /** One attempt; rejects when the autopilot doesn't answer */
  private async open(): Promise<void> {
    const socketId = `${this.id}#${++this.attempt}`;
    // Set before connecting: the app may send data before connect returns
    this.socketId = socketId;
    try {
      await this.tcp!.connect(socketId, this.host, this.port);
    } catch (error) {
      if (this.socketId === socketId) this.socketId = null;
      throw error instanceof Error ? error : new Error(String(error));
    }
    if (!this.wanted || this.socketId !== socketId) {
      // Disconnected while connecting
      await this.tcp!.disconnect(socketId).catch(() => {});
      return;
    }
    this.backoff.reset();
    this.updateStatus('connected');
  }

  private scheduleReconnect(): void {
    const delay = this.backoff.next();
    this.updateStatus('connecting', reconnectMessage(delay));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.wanted) return;
      this.open().catch(() => {
        if (this.wanted) this.scheduleReconnect();
      });
    }, delay);
  }

  private updateStatus(status: DataConnectionStatus, error?: string): void {
    this.status = status;
    this.errorMessage = error ?? null;
    this.statusCallback?.(status, error);
  }
}
