import type { ProtocolType } from '@/store/slices/instrumentsSlice';
import type { DataConnectionStatus, InstrumentDataConnection } from './types';

export interface WebSocketConnectionOptions {
  id: string;
  protocol: ProtocolType;
  /** ws:// or wss:// address of the gateway, or of the OpenSail bridge */
  url: string;
  /** First wait before reconnecting after the link drops; doubles up to maxReconnectDelayMs */
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  /** For tests: the WebSocket implementation and the page's protocol */
  WebSocketImpl?: typeof WebSocket;
  pageProtocol?: string;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Why the browser will refuse this address, or null if it may connect.
 * A page loaded over HTTPS may only open an unencrypted ws:// link to the
 * device itself (localhost): anything else is blocked as mixed content.
 */
export function blockedWebSocketReason(url: string, pageProtocol: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `"${url}" is not a valid address. Use for example ws://localhost:10110.`;
  }
  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    return 'The address must start with ws:// or wss://.';
  }
  if (pageProtocol === 'https:' && parsed.protocol === 'ws:' && !LOCAL_HOSTS.has(parsed.hostname)) {
    return (
      `The browser blocks an unencrypted connection (ws://) to ${parsed.hostname} from a page ` +
      'loaded over HTTPS. Run the OpenSail bridge on this device and connect to ws://localhost.'
    );
  }
  return null;
}

/**
 * Instruments over Wi-Fi. Browsers can't open TCP or UDP sockets, so this
 * talks WebSocket: to a gateway that offers it, or to the OpenSail bridge
 * (tools/opensail-bridge), which relays a TCP NMEA server such as the
 * Pcnautic / pypilot autopilot on 192.168.14.1:20220.
 *
 * Every message may hold several lines, or part of one; lines are handed over
 * one at a time like SerialConnection does. When the link drops (the boat's
 * Wi-Fi does), it keeps reconnecting until disconnect() is called.
 */
export class WebSocketConnection implements InstrumentDataConnection {
  public readonly id: string;
  public readonly protocol: ProtocolType;
  public readonly url: string;
  public status: DataConnectionStatus = 'disconnected';
  public errorMessage: string | null = null;

  private readonly WebSocketImpl: typeof WebSocket;
  private readonly pageProtocol: string;
  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private delay: number;
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wanted = false;
  private buffer = '';
  private dataCallback: ((data: string) => void) | null = null;
  private statusCallback: ((status: DataConnectionStatus, error?: string) => void) | null = null;

  constructor(options: WebSocketConnectionOptions) {
    this.id = options.id;
    this.protocol = options.protocol;
    this.url = options.url.trim();
    this.WebSocketImpl = options.WebSocketImpl ?? WebSocket;
    this.pageProtocol = options.pageProtocol ?? window.location.protocol;
    this.initialDelay = options.reconnectDelayMs ?? 1000;
    this.maxDelay = options.maxReconnectDelayMs ?? 15000;
    this.delay = this.initialDelay;
  }

  /** WebSocket works in every browser */
  static isSupported(): boolean {
    return typeof WebSocket !== 'undefined';
  }

  /** Resolves once the first link is up; rejects if the address is unusable or unreachable */
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      throw new Error('Already connected or connecting');
    }
    const blocked = blockedWebSocketReason(this.url, this.pageProtocol);
    if (blocked) {
      this.updateStatus('error', blocked);
      throw new Error(blocked);
    }
    this.wanted = true;
    this.delay = this.initialDelay;
    await new Promise<void>((resolve, reject) => this.open(resolve, reject));
  }

  async disconnect(): Promise<void> {
    this.wanted = false;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.buffer = '';
    this.updateStatus('disconnected');
  }

  onData(callback: (data: string) => void): void {
    this.dataCallback = callback;
  }

  onStatusChange(callback: (status: DataConnectionStatus, error?: string) => void): void {
    this.statusCallback = callback;
  }

  /** Send NMEA sentences to the other side, e.g. a route for the autopilot to steer */
  async write(data: string): Promise<void> {
    if (!this.socket || this.status !== 'connected') {
      throw new Error('Not connected');
    }
    this.socket.send(data.endsWith('\n') ? data : `${data}\r\n`);
  }

  private open(onFirstOpen?: () => void, onFirstFail?: (error: Error) => void): void {
    this.updateStatus('connecting');
    let socket: WebSocket;
    try {
      socket = new this.WebSocketImpl(this.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.wanted = false;
      this.updateStatus('error', message);
      onFirstFail?.(new Error(message));
      return;
    }
    this.socket = socket;
    let opened = false;

    socket.onopen = () => {
      opened = true;
      this.delay = this.initialDelay;
      this.updateStatus('connected');
      onFirstOpen?.();
    };

    socket.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') this.receive(event.data);
      else if (event.data instanceof ArrayBuffer) this.receive(new TextDecoder().decode(event.data));
      else if (event.data instanceof Blob) void event.data.text().then((text) => this.receive(text));
    };

    socket.onclose = () => {
      if (this.socket !== socket) return; // replaced or disconnected on purpose
      this.socket = null;
      this.buffer = '';
      if (!opened && onFirstFail) {
        // The very first attempt failed: report it instead of retrying quietly
        this.wanted = false;
        const message = `Could not connect to ${this.url}. Is the bridge or gateway running, and is this device on the boat's Wi-Fi?`;
        this.updateStatus('error', message);
        onFirstFail(new Error(message));
        return;
      }
      if (this.wanted) this.scheduleReconnect();
    };

    // An error is always followed by close, which handles it
    socket.onerror = () => {};
  }

  private scheduleReconnect(): void {
    this.updateStatus('connecting', `Connection lost, reconnecting in ${Math.round(this.delay / 1000)} s`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.wanted) this.open();
    }, this.delay);
    this.delay = Math.min(this.delay * 2, this.maxDelay);
  }

  private receive(text: string): void {
    this.buffer += text;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? '';
    // A message without a line end is one complete sentence, as some gateways send them
    if (this.buffer && /^[$!].*\*[0-9A-Fa-f]{2}$/.test(this.buffer.trim())) {
      lines.push(this.buffer);
      this.buffer = '';
    }
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) this.dataCallback?.(trimmed);
    }
  }

  private updateStatus(status: DataConnectionStatus, error?: string): void {
    this.status = status;
    this.errorMessage = error ?? null;
    this.statusCallback?.(status, error);
  }
}
