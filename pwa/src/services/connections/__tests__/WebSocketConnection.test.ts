import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketConnection, blockedWebSocketReason } from '../WebSocketConnection';

/** A WebSocket stand-in the test drives by hand */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  sent: string[] = [];
  closed = false;
  url: string;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
    this.onclose?.();
  }
  // Test helpers
  open() {
    this.onopen?.();
  }
  message(data: string) {
    this.onmessage?.({ data });
  }
  drop() {
    this.onclose?.();
  }
}

const latest = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

function connection(url = 'ws://localhost:10110', pageProtocol = 'https:') {
  const conn = new WebSocketConnection({
    id: 'wifi',
    protocol: 'NMEA0183',
    url,
    pageProtocol,
    reconnectDelayMs: 1000,
    maxReconnectDelayMs: 4000,
    WebSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
  });
  const lines: string[] = [];
  const statuses: string[] = [];
  conn.onData((line) => lines.push(line));
  conn.onStatusChange((status) => statuses.push(status));
  return { conn, lines, statuses };
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('WebSocketConnection', () => {
  it('hands over complete lines, also across messages and several per message', async () => {
    const { conn, lines } = connection();
    const connecting = conn.connect();
    latest().open();
    await connecting;
    expect(conn.status).toBe('connected');

    latest().message('$APHDM,123.4,M*3A\r\n$APRSA,-5');
    expect(lines).toEqual(['$APHDM,123.4,M*3A']);
    latest().message('.0,A,,V*7B\r\n');
    expect(lines).toEqual(['$APHDM,123.4,M*3A', '$APRSA,-5.0,A,,V*7B']);
    // One sentence per message without a line end, as some gateways send it
    latest().message('$APHDM,124.0,M*30');
    expect(lines.at(-1)).toBe('$APHDM,124.0,M*30');
  });

  it('reports an unreachable address on the first attempt instead of retrying quietly', async () => {
    const { conn } = connection();
    const connecting = conn.connect();
    latest().drop();
    await expect(connecting).rejects.toThrow(/Could not connect to ws:\/\/localhost:10110/);
    expect(conn.status).toBe('error');
    vi.advanceTimersByTime(60000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('reconnects with growing waits after the Wi-Fi drops, until disconnected', async () => {
    const { conn, statuses } = connection();
    const connecting = conn.connect();
    latest().open();
    await connecting;

    latest().drop();
    expect(conn.status).toBe('connecting');
    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);
    latest().drop(); // still no Wi-Fi
    vi.advanceTimersByTime(2000);
    expect(FakeWebSocket.instances).toHaveLength(3);
    latest().open();
    expect(conn.status).toBe('connected');

    await conn.disconnect();
    expect(latest().closed).toBe(true);
    vi.advanceTimersByTime(60000);
    expect(FakeWebSocket.instances).toHaveLength(3);
    expect(statuses.at(-1)).toBe('disconnected');
  });

  it('writes sentences with a line end', async () => {
    const { conn } = connection();
    const connecting = conn.connect();
    latest().open();
    await connecting;
    await conn.write('$GPRMC,1*00');
    expect(latest().sent).toEqual(['$GPRMC,1*00\r\n']);
  });

  it('refuses addresses the browser would block, before trying', async () => {
    const { conn } = connection('ws://192.168.14.1:20220', 'https:');
    await expect(conn.connect()).rejects.toThrow(/blocks an unencrypted connection/);
    expect(FakeWebSocket.instances).toHaveLength(0);
  });
});

describe('blockedWebSocketReason', () => {
  it('allows localhost from HTTPS, and anything from HTTP', () => {
    expect(blockedWebSocketReason('ws://localhost:10110', 'https:')).toBeNull();
    expect(blockedWebSocketReason('ws://127.0.0.1:10110', 'https:')).toBeNull();
    expect(blockedWebSocketReason('wss://gateway.local/stream', 'https:')).toBeNull();
    expect(blockedWebSocketReason('ws://192.168.14.1:8080', 'http:')).toBeNull();
  });

  it('explains bad addresses', () => {
    expect(blockedWebSocketReason('192.168.14.1:20220', 'http:')).toMatch(/not a valid address|ws:\/\//);
    expect(blockedWebSocketReason('http://192.168.14.1', 'http:')).toMatch(/ws:\/\/ or wss:\/\//);
    expect(blockedWebSocketReason('ws://192.168.14.1:20220', 'https:')).toMatch(/OpenSail bridge/);
  });
});
