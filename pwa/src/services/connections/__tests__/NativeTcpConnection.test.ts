import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NativeTcpConnection, type TauriApi } from '../NativeTcpConnection';

/** The desktop app's Rust side (tcp_connect / tcp_write / tcp_disconnect and its events), driven by hand */
class FakeTauri implements TauriApi {
  calls: { command: string; args?: Record<string, unknown> }[] = [];
  handlers = new Map<string, Set<(event: { payload: unknown }) => void>>();
  /** What the next tcp_connect calls do: 'ok', or an error message */
  connectResults: string[] = [];
  open = new Set<string>();

  async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    this.calls.push({ command, args });
    const id = args?.id as string;
    if (command === 'tcp_connect') {
      const result = this.connectResults.shift() ?? 'ok';
      if (result !== 'ok') throw result; // Rust's Err(String) arrives as a string
      this.open.add(id);
    }
    if (command === 'tcp_disconnect') this.open.delete(id);
    return undefined as T;
  }

  async listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<() => void> {
    const handlers = this.handlers.get(event) ?? new Set();
    this.handlers.set(event, handlers);
    const h = handler as (event: { payload: unknown }) => void;
    handlers.add(h);
    return () => handlers.delete(h);
  }

  emit(event: string, payload: unknown) {
    for (const handler of this.handlers.get(event) ?? []) handler({ payload });
  }

  /** The socket the connection uses now */
  get socket(): string {
    return [...this.open].at(-1)!;
  }
  data(text: string, id = this.socket) {
    this.emit('tcp-data', { id, data: text });
  }
  drop(id = this.socket, error: string | null = null) {
    this.open.delete(id);
    this.emit('tcp-closed', { id, error });
  }
  commands(name: string) {
    return this.calls.filter((call) => call.command === name);
  }
  get listeners() {
    return [...this.handlers.values()].reduce((sum, set) => sum + set.size, 0);
  }
}

function connection(options: { allowWrites?: boolean; host?: string; port?: number } = {}) {
  const tauri = new FakeTauri();
  const conn = new NativeTcpConnection({
    id: 'wifi',
    protocol: 'NMEA0183',
    host: options.host ?? '192.168.14.1',
    port: options.port ?? 20220,
    allowWrites: options.allowWrites,
    reconnectDelayMs: 1000,
    maxReconnectDelayMs: 4000,
    tauri,
  });
  const lines: string[] = [];
  const statuses: string[] = [];
  conn.onData((line) => lines.push(line));
  conn.onStatusChange((status) => statuses.push(status));
  return { conn, tauri, lines, statuses };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('NativeTcpConnection', () => {
  it('opens a TCP socket through Rust and hands over complete lines', async () => {
    const { conn, tauri, lines, statuses } = connection();
    await conn.connect();
    expect(conn.status).toBe('connected');
    expect(statuses).toEqual(['connecting', 'connected']);
    expect(tauri.commands('tcp_connect')[0].args).toMatchObject({ host: '192.168.14.1', port: 20220 });

    // The autopilot's sentences, split across chunks and several per chunk
    tauri.data('$APHDM,123.4,M*3A\r\n$APRSA,-5');
    expect(lines).toEqual(['$APHDM,123.4,M*3A']);
    tauri.data('.0,A,,V*7B\r\n$APXDR,A,2.1,D,PTCH*00\r\n');
    expect(lines).toEqual(['$APHDM,123.4,M*3A', '$APRSA,-5.0,A,,V*7B', '$APXDR,A,2.1,D,PTCH*00']);
  });

  it('ignores data of other sockets', async () => {
    const { conn, tauri, lines } = connection();
    await conn.connect();
    tauri.data('$GPGGA,other*00\r\n', 'someone-else#1');
    expect(lines).toEqual([]);
  });

  it('reports an unreachable autopilot on the first attempt instead of retrying quietly', async () => {
    const { conn, tauri } = connection();
    tauri.connectResults = ['No answer from 192.168.14.1:20220 within 5 s'];
    await expect(conn.connect()).rejects.toThrow(/Could not connect to 192\.168\.14\.1:20220: No answer/);
    expect(conn.status).toBe('error');
    expect(conn.errorMessage).toMatch(/boat's Wi-Fi/);
    expect(tauri.listeners).toBe(0);
    await vi.advanceTimersByTimeAsync(60000);
    expect(tauri.commands('tcp_connect')).toHaveLength(1);
  });

  it('refuses an invalid address without calling Rust', async () => {
    const { conn, tauri } = connection({ host: ' ', port: 70000 });
    await expect(conn.connect()).rejects.toThrow(/not a valid address/);
    expect(tauri.calls).toEqual([]);
  });

  it('reconnects with a growing wait when the link drops, until it is back', async () => {
    const { conn, tauri, lines } = connection();
    await conn.connect();
    tauri.data('$APHDM,1'); // a partial line is dropped with the link
    tauri.connectResults = ['refused', 'refused', 'ok'];
    tauri.drop();
    expect(conn.status).toBe('connecting');
    expect(conn.errorMessage).toBe('Connection lost, reconnecting in 1 s');

    await vi.advanceTimersByTimeAsync(1000);
    expect(tauri.commands('tcp_connect')).toHaveLength(2);
    expect(conn.errorMessage).toBe('Connection lost, reconnecting in 2 s');
    await vi.advanceTimersByTimeAsync(2000);
    expect(tauri.commands('tcp_connect')).toHaveLength(3);
    expect(conn.errorMessage).toBe('Connection lost, reconnecting in 4 s');
    await vi.advanceTimersByTimeAsync(4000);
    expect(tauri.commands('tcp_connect')).toHaveLength(4);
    expect(conn.status).toBe('connected');

    // Each attempt is a new socket id; late events from old ones don't count
    const ids = tauri.commands('tcp_connect').map((call) => call.args?.id);
    expect(new Set(ids).size).toBe(4);
    tauri.data('$APHDM,9.9,M*00\r\n', ids[0] as string);
    expect(lines).toEqual([]);
    // The partial line from before the drop isn't glued to the new data
    tauri.data('$APHDM,123.4,M*3A\r\n');
    expect(lines).toEqual(['$APHDM,123.4,M*3A']);

    // After a good link the wait starts short again
    tauri.drop();
    expect(conn.errorMessage).toBe('Connection lost, reconnecting in 1 s');
  });

  it('caps the wait between attempts', async () => {
    const { conn, tauri } = connection();
    await conn.connect();
    tauri.connectResults = Array(10).fill('refused');
    tauri.drop();
    await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000 + 4000);
    expect(conn.errorMessage).toBe('Connection lost, reconnecting in 4 s');
  });

  it('stops for good on disconnect', async () => {
    const { conn, tauri } = connection();
    await conn.connect();
    const socket = tauri.socket;
    await conn.disconnect();
    expect(conn.status).toBe('disconnected');
    expect(tauri.commands('tcp_disconnect')[0].args).toEqual({ id: socket });
    expect(tauri.listeners).toBe(0);
    tauri.drop(socket);
    await vi.advanceTimersByTimeAsync(60000);
    expect(tauri.commands('tcp_connect')).toHaveLength(1);
  });

  it('stops reconnecting when disconnected while waiting', async () => {
    const { conn, tauri } = connection();
    await conn.connect();
    tauri.drop();
    await conn.disconnect();
    await vi.advanceTimersByTimeAsync(60000);
    expect(tauri.commands('tcp_connect')).toHaveLength(1);
    expect(conn.status).toBe('disconnected');
  });

  it('is read-only unless writes are allowed', async () => {
    const readOnly = connection();
    await readOnly.conn.connect();
    await expect(readOnly.conn.write('$GPAPB,test*00')).rejects.toThrow('read-only');
    expect(readOnly.tauri.commands('tcp_write')).toEqual([]);

    const { conn, tauri } = connection({ allowWrites: true });
    await conn.connect();
    await conn.write('$GPAPB,test*00');
    expect(tauri.commands('tcp_write')[0].args).toEqual({ id: tauri.socket, data: '$GPAPB,test*00\r\n' });
  });

  it('refuses to connect twice', async () => {
    const { conn } = connection();
    await conn.connect();
    await expect(conn.connect()).rejects.toThrow('Already connected');
  });

  it('loads the Tauri API by itself in the desktop app', async () => {
    const invoke = vi.fn(async () => undefined);
    const listen = vi.fn(async () => () => {});
    vi.doMock('@tauri-apps/api/core', () => ({ invoke }));
    vi.doMock('@tauri-apps/api/event', () => ({ listen }));
    const conn = new NativeTcpConnection({ id: 'wifi', protocol: 'NMEA0183', host: '192.168.14.1', port: 20220 });
    await conn.connect();
    expect(listen).toHaveBeenCalledWith('tcp-data', expect.any(Function));
    expect(listen).toHaveBeenCalledWith('tcp-closed', expect.any(Function));
    expect(invoke).toHaveBeenCalledWith('tcp_connect', { id: 'wifi#1', host: '192.168.14.1', port: 20220 });
    vi.doUnmock('@tauri-apps/api/core');
    vi.doUnmock('@tauri-apps/api/event');
  });
});
